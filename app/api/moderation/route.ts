// app/api/moderation/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const CHANNEL_NAME = "global";

// Read env vars at module load (safe, no throws here)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

/**
 * POST /api/moderation
 * Body: { pendingId: string }
 *
 * Loads a pending message, sends content to OpenAI moderation,
 * and either:
 *  - rejects: deletes from pending + returns { status: "rejected" }
 *  - approves: moves to messages + deletes from pending + returns { status: "approved" }
 */
export async function POST(req: Request) {
  try {
    // Runtime env safety checks (no impact on build)
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(
        "Moderation route misconfigured: missing Supabase env vars. " +
          "Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Vercel."
      );
      return NextResponse.json(
        { error: "Moderation service not configured (Supabase env missing)" },
        { status: 500 }
      );
    }

    if (!openaiApiKey) {
      console.error(
        "Moderation route misconfigured: missing OPENAI_API_KEY env var."
      );
      return NextResponse.json(
        { error: "Moderation service not configured (OpenAI env missing)" },
        { status: 500 }
      );
    }

    // Create clients now that we know env vars exist
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Parse body
    const { pendingId } = await req.json();

    if (!pendingId) {
      return NextResponse.json(
        { error: "pendingId is required" },
        { status: 400 }
      );
    }

    // 1) Load the pending message
    const { data: pending, error: fetchError } = await supabaseAdmin
      .from("messages_pending_tbl")
      .select("id, content, user_id, created_at")
      .eq("id", pendingId)
      .single();

    if (fetchError || !pending) {
      console.error("Failed to load pending message:", fetchError);
      return NextResponse.json(
        { error: "Pending message not found" },
        { status: 404 }
      );
    }

    // 2) Run OpenAI moderation
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: pending.content,
    });

    const result = moderation.results[0];
    const flagged = result.flagged;

    if (flagged) {
      // 3a) Rejected: delete from pending and return
      const { error: deleteError } = await supabaseAdmin
        .from("messages_pending_tbl")
        .delete()
        .eq("id", pending.id);

      if (deleteError) {
        console.error(
          "Failed to delete rejected pending message:",
          deleteError
        );
      }

      return NextResponse.json({
        status: "rejected",
      });
    }

    // 3b) Approved: insert into messages
    const { error: insertError } = await supabaseAdmin.from("messages").insert({
      channel: CHANNEL_NAME,
      content: pending.content,
      user_id: pending.user_id,
      // created_at will default in DB
    });

    if (insertError) {
      console.error("Failed to insert approved message:", insertError);
      return NextResponse.json(
        { error: "Failed to approve message" },
        { status: 500 }
      );
    }

    // 4) Clean up from pending
    const { error: deleteError } = await supabaseAdmin
      .from("messages_pending_tbl")
      .delete()
      .eq("id", pending.id);

    if (deleteError) {
      console.error(
        "Failed to delete pending after approve (non-fatal):",
        deleteError
      );
    }

    return NextResponse.json({ status: "approved" });
  } catch (err) {
    console.error("Moderation route error:", err);
    return NextResponse.json(
      { error: "Internal moderation error" },
      { status: 500 }
    );
  }
}
