// app/api/moderation/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const CHANNEL_NAME = "global";

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

export async function POST(req: Request) {
  try {
    // --- ENVIRONMENT CHECKS ---
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(
        "Moderation route misconfigured: missing Supabase env vars."
      );
      return NextResponse.json(
        { error: "Supabase environment not configured" },
        { status: 500 }
      );
    }

    if (!openaiApiKey) {
      console.error(
        "Moderation route misconfigured: missing OPENAI_API_KEY."
      );
      return NextResponse.json(
        { error: "OpenAI environment not configured" },
        { status: 500 }
      );
    }

    // --- CLIENTS ---
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // --- BODY ---
    const { pendingId } = await req.json();

    if (!pendingId) {
      return NextResponse.json(
        { error: "pendingId is required" },
        { status: 400 }
      );
    }

    // --- 1) LOAD PENDING MESSAGE ---
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

    // --- 2) RUN FAST MODERATION MODEL ---
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: pending.content,
    });

    const result = moderation.results[0];
    const flagged = result.flagged;

    // ========================================================================
    //                           REJECTED MESSAGE
    // ========================================================================
    if (flagged) {
      const { error: deleteError } = await supabaseAdmin
        .from("messages_pending_tbl")
        .delete()
        .eq("id", pending.id);

      if (deleteError) {
        console.error("Failed to delete rejected message:", deleteError);
      }

      return NextResponse.json({ status: "rejected" });
    }

    // ========================================================================
    //                           APPROVED MESSAGE
    // ========================================================================
    const { error: insertError } = await supabaseAdmin.from("messages").insert({
      channel: CHANNEL_NAME,
      content: pending.content,
      user_id: pending.user_id,
      // created_at defaults in DB
    });

    if (insertError) {
      console.error("Failed to insert approved message:", insertError);
      return NextResponse.json(
        { error: "Failed to approve message" },
        { status: 500 }
      );
    }

    // Cleanup
    const { error: deleteError } = await supabaseAdmin
      .from("messages_pending_tbl")
      .delete()
      .eq("id", pending.id);

    if (deleteError) {
      console.error(
        "Warning: approved message inserted but pending cleanup failed:",
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
