// app/api/moderation/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const CHANNEL_NAME = "global";

// --- CORS setup so overlay can call this route ---
// For alpha we allow *, since this endpoint only processes existing
// pendingIds and doesn't rely on cookies.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(init?: ResponseInit): ResponseInit {
  return {
    ...(init ?? {}),
    headers: {
      ...(init?.headers ?? {}),
      ...CORS_HEADERS,
    },
  };
}

// Preflight handler for POST /api/moderation
export async function OPTIONS() {
  return NextResponse.json({}, withCors());
}

// --- Environment variables (read once at module load) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

// --- Shared clients (reused across requests in the same runtime) ---
const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })
    : null;

const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

// ---------------------------
// Local heuristics
// ---------------------------

type LocalDecision = "approve" | "reject" | "needs_ai";

/**
 * HARD_BLOCK_WORDS
 * Zero–tolerance slurs that should never appear in Astrum.
 *
 * Keep entries lowercase. We do word-ish matching so "flag" does NOT
 * accidentally hit "fag", and "nigga" is allowed while hard-R is not.
 */
const HARD_BLOCK_WORDS: string[] = [
  // Homophobic slurs
  "fag",
  "fags",
  "faggot",
  "faggots",

  // Racist slurs (hard-R only; "nigga" deliberately not included)
  "nigger",
  "niggers",
];

// Normalize a string for word matching: strip to [a-z0-9], turn everything
// else into spaces, and pad with spaces at both ends so we can look for
// " word " safely.
function normalizeForWordMatch(lower: string): string {
  const cleaned = lower.replace(/[^a-z0-9]+/g, " ").trim();
  return ` ${cleaned} `;
}

function hasHardBlockedWord(lower: string): boolean {
  if (!lower) return false;
  const normalized = normalizeForWordMatch(lower);

  for (const w of HARD_BLOCK_WORDS) {
    if (!w) continue;
    const needle = ` ${w} `;
    if (normalized.includes(needle)) {
      return true;
    }
  }
  return false;
}

function containsUrl(text: string): boolean {
  return (
    /https?:\/\//i.test(text) ||
    /www\./i.test(text) ||
    /\.(com|gg|ru|xyz|link|biz|io|net)\b/i.test(text)
  );
}

// "Hard" self-promo: obvious URLs and call-to-action phrases
function isSelfPromoHard(lower: string): boolean {
  // Obvious external links (right now we treat all URLs as self-promo-ish)
  if (containsUrl(lower)) return true;

  // Platform domains
  if (
    lower.includes("twitch.tv") ||
    lower.includes("youtube.com") ||
    lower.includes("discord.gg") ||
    lower.includes("kick.com") ||
    lower.includes("onlyfans.com") ||
    lower.includes("patreon.com")
  ) {
    return true;
  }

  // Classic promo phrases
  if (
    lower.includes("follow me on") ||
    lower.includes("subscribe to my") ||
    lower.includes("use my code") ||
    lower.includes("use code") ||
    lower.includes("my channel")
  ) {
    return true;
  }

  return false;
}

// "Soft" self-promo: platform names without a URL → send to OpenAI
function isSelfPromoSoft(lower: string): boolean {
  const words = [
    "twitch",
    "youtube",
    "yt",
    "instagram",
    "insta",
    "ig",
    "tiktok",
    "tik tok",
    "kick",
    "onlyfans",
    "patreon",
  ];

  return words.some((w) => lower.includes(w));
}

function isVerySafe(text: string): boolean {
  if (!text) return false;
  if (text.length > 80) return false;

  // "Very safe" can't have URLs or obvious promo markers
  if (containsUrl(text)) return false;
  if (/[#@]/.test(text)) return false;

  // Allow letters, numbers, spaces, and basic punctuation
  const safeMatches = text.match(/[a-zA-Z0-9\s.,!?'"()\-\[\]:;]/g);
  const safeCount = safeMatches ? safeMatches.length : 0;
  const ratio = safeCount / text.length;

  return ratio > 0.9;
}

/**
 * Local decision:
 * - reject empty / absurdly long content
 * - reject if it contains a hard slur
 * - reject obvious self-promo with URLs / CTA phrases
 * - send to AI if it mentions promo platforms (twitch, youtube, etc)
 * - approve "very safe" short messages
 * - everything else => needs_ai (OpenAI decides)
 */
function fastLocalDecision(content: string): LocalDecision {
  const raw = content ?? "";
  const text = raw.trim();

  // Empty / whitespace-only => reject
  if (!text) return "reject";

  // Extreme length spam => reject outright
  if (text.length > 2000) return "reject";

  const lower = text.toLowerCase();

  // Hard slurs => auto reject
  if (hasHardBlockedWord(lower)) return "reject";

  // Hard self-promo (URLs, CTA phrases) => auto reject
  if (isSelfPromoHard(lower)) return "reject";

  // Soft self-promo (platform names) => send to OpenAI for review
  if (isSelfPromoSoft(lower)) return "needs_ai";

  // Short, boring, safe messages => auto approve (no AI)
  if (isVerySafe(text)) return "approve";

  // Everything else: let OpenAI look at it
  return "needs_ai";
}

// ---------------------------
// Simple repeat-spam detection
// ---------------------------

async function isRepeatSpam(
  client: SupabaseClient | null,
  userId: string | null,
  content: string
): Promise<boolean> {
  if (!client || !userId) return false;

  const trimmed = (content ?? "").trim();
  if (!trimmed) return false;

  const target = trimmed.toLowerCase();

  // Look at this user's last few messages in this channel
  const { data, error } = await client
    .from("messages")
    .select("content, created_at")
    .eq("user_id", userId)
    .eq("channel", CHANNEL_NAME)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !data) {
    if (error) {
      console.error("repeat spam check error:", error);
    }
    return false;
  }

  const nowMs = Date.now();
  const WINDOW_MS = 60_000; // 60 seconds
  const MIN_MATCHES = 3; // same message at least 3 times in window

  let sameCount = 0;

  for (const msg of data) {
    const msgContent = (msg as any).content as string | null;
    const createdAt = (msg as any).created_at as string | null;
    if (!msgContent || !createdAt) continue;

    const msgLower = msgContent.trim().toLowerCase();
    if (msgLower !== target) continue;

    const t = new Date(createdAt).getTime();
    if (!Number.isFinite(t)) continue;

    if (nowMs - t <= WINDOW_MS) {
      sameCount++;
    }
  }

  return sameCount >= MIN_MATCHES;
}

// ---------------------------
// Route handler
// ---------------------------

export async function POST(req: Request) {
  try {
    // --- SAFETY CHECKS FOR MISCONFIGURED ENV ---
    if (!supabaseAdmin || !supabaseUrl || !supabaseServiceKey) {
      console.error(
        "Moderation route misconfigured: missing Supabase env vars."
      );
      return NextResponse.json(
        { error: "Supabase environment not configured" },
        withCors({ status: 500 })
      );
    }

    if (!openai || !openaiApiKey) {
      console.error(
        "Moderation route misconfigured: missing OPENAI_API_KEY."
      );
      return NextResponse.json(
        { error: "OpenAI environment not configured" },
        withCors({ status: 500 })
      );
    }

    // --- BODY PARSE ---
    const { pendingId } = await req.json();

    if (!pendingId) {
      return NextResponse.json(
        { error: "pendingId is required" },
        withCors({ status: 400 })
      );
    }

    // --- 1) LOAD PENDING MESSAGE (canonical source) ---
    const { data: pending, error: fetchError } = await supabaseAdmin
      .from("messages_pending_tbl")
      .select("id, content, user_id")
      .eq("id", pendingId)
      .single();

    if (fetchError || !pending) {
      console.error("Failed to load pending message:", fetchError);
      return NextResponse.json(
        { error: "Pending message not found" },
        withCors({ status: 404 })
      );
    }

    const content = (pending as any).content ?? "";
    const userId = (pending as any).user_id as string | null;

    // --- 2) REPEAT-SPAM CHECK ---
    const spam = await isRepeatSpam(supabaseAdmin, userId, content);
    if (spam) {
      const { error: deleteError } = await supabaseAdmin
        .from("messages_pending_tbl")
        .delete()
        .eq("id", pending.id);

      if (deleteError) {
        console.error(
          "Failed to delete spam message from pending:",
          deleteError
        );
      }

      // Later we can wire this into strikes/timeouts; for now just reject.
      return NextResponse.json({ status: "rejected" }, withCors());
    }

    // --- 3) LOCAL CONTENT DECISION ---
    const decision = fastLocalDecision(content);

    // =======================
    // 3a) LOCAL REJECT
    // =======================
    if (decision === "reject") {
      const { error: deleteError } = await supabaseAdmin
        .from("messages_pending_tbl")
        .delete()
        .eq("id", pending.id);

      if (deleteError) {
        console.error("Failed to delete locally rejected message:", deleteError);
      }

      return NextResponse.json({ status: "rejected" }, withCors());
    }

    // =======================
    // 3b) LOCAL APPROVE (NO AI)
    // =======================
    if (decision === "approve") {
      const { error: insertError } = await supabaseAdmin.from("messages").insert(
        {
          channel: CHANNEL_NAME,
          content,
          user_id: userId,
          // created_at handled by DB defaults
        }
      );

      if (insertError) {
        console.error("Failed to insert locally approved message:", insertError);
        return NextResponse.json(
          { error: "Failed to approve message" },
          withCors({ status: 500 })
        );
      }

      // Cleanup from pending queue (best-effort)
      const { error: deleteError } = await supabaseAdmin
        .from("messages_pending_tbl")
        .delete()
        .eq("id", pending.id);

      if (deleteError) {
        console.error(
          "Warning: locally approved message inserted but pending cleanup failed:",
          deleteError
        );
      }

      return NextResponse.json({ status: "approved" }, withCors());
    }

    // =======================
    // 3c) NEEDS AI → FALLBACK TO OPENAI
    // =======================

    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: content,
    });

    const result = moderation.results[0];
    const flagged = result.flagged;

    // ----------------------------------------------------------------
    // REJECTED BY OPENAI
    // ----------------------------------------------------------------
    if (flagged) {
      const { error: deleteError } = await supabaseAdmin
        .from("messages_pending_tbl")
        .delete()
        .eq("id", pending.id);

      if (deleteError) {
        console.error("Failed to delete AI-rejected message:", deleteError);
      }

      return NextResponse.json({ status: "rejected" }, withCors());
    }

    // ----------------------------------------------------------------
    // APPROVED BY OPENAI
    // ----------------------------------------------------------------
    const { error: insertError } = await supabaseAdmin.from("messages").insert({
      channel: CHANNEL_NAME,
      content,
      user_id: userId,
      // created_at handled by DB defaults
    });

    if (insertError) {
      console.error("Failed to insert AI-approved message:", insertError);
      return NextResponse.json(
        { error: "Failed to approve message" },
        withCors({ status: 500 })
      );
    }

    // Cleanup from pending queue (best-effort)
    const { error: deleteError } = await supabaseAdmin
      .from("messages_pending_tbl")
      .delete()
      .eq("id", pending.id);

    if (deleteError) {
      console.error(
        "Warning: AI-approved message inserted but pending cleanup failed:",
        deleteError
      );
    }

    return NextResponse.json({ status: "approved" }, withCors());
  } catch (err) {
    console.error("Moderation route error:", err);
    return NextResponse.json(
      { error: "Internal moderation error" },
      withCors({ status: 500 })
    );
  }
}
