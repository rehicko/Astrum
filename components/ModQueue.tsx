// components/ModQueue.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabaseClient";

type PendingMessage = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
};

const supabase = createClient();

// MVP: single channel only
const CHANNEL_NAME = "global";

export default function ModQueue() {
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Load pending messages from messages_pending_tbl
  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("messages_pending_tbl")
      .select("id, content, user_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load pending messages:", error);
      setError("Failed to load pending messages.");
      setPending([]);
    } else {
      setPending((data ?? []) as PendingMessage[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  // Approve = move from pending -> messages, then delete pending row
  const approveMessage = useCallback(
    async (pendingId: string) => {
      setActionLoadingId(pendingId);
      setError(null);

      try {
        // 1) Get the pending row
        const { data: msg, error: fetchError } = await supabase
          .from("messages_pending_tbl")
          .select("id, content, user_id, created_at")
          .eq("id", pendingId)
          .single();

        if (fetchError || !msg) {
          console.error("Failed to fetch pending message:", fetchError);
          setError("Could not load pending message.");
          setActionLoadingId(null);
          return;
        }

        // 2) Insert into messages with the single MVP channel
        const { error: insertError } = await supabase.from("messages").insert({
          channel: CHANNEL_NAME,
          content: msg.content,
          user_id: msg.user_id,
          // created_at will default in DB
        });

        if (insertError) {
          console.error("Failed to insert approved message:", insertError);
          setError("Could not approve message (insert failed).");
          setActionLoadingId(null);
          return;
        }

        // 3) Delete from pending table
        const { error: deleteError } = await supabase
          .from("messages_pending_tbl")
          .delete()
          .eq("id", pendingId);

        if (deleteError) {
          console.error("Failed to delete pending message:", deleteError);
          setError("Approved, but failed to cleanup pending message.");
          // still continue; just refresh list
        }

        // 4) Refresh list so card disappears
        await loadPending();
        setActionLoadingId(null);
      } catch (e) {
        console.error("Unexpected approve error:", e);
        setError("Unexpected error while approving message.");
        setActionLoadingId(null);
      }
    },
    [loadPending]
  );

  // Reject = just delete from pending
  const rejectMessage = useCallback(
    async (pendingId: string) => {
      setActionLoadingId(pendingId);
      setError(null);

      try {
        const { error: deleteError } = await supabase
          .from("messages_pending_tbl")
          .delete()
          .eq("id", pendingId);

        if (deleteError) {
          console.error("Failed to reject (delete) pending message:", deleteError);
          setError("Could not reject message.");
          setActionLoadingId(null);
          return;
        }

        await loadPending();
        setActionLoadingId(null);
      } catch (e) {
        console.error("Unexpected reject error:", e);
        setError("Unexpected error while rejecting message.");
        setActionLoadingId(null);
      }
    },
    [loadPending]
  );

  // Escalate = for now, behave like reject (no special flow yet)
  const escalateMessage = useCallback(
    async (pendingId: string) => {
      await rejectMessage(pendingId);
    },
    [rejectMessage]
  );

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 text-white">
      <h1 className="text-3xl font-bold mb-2">Mod Queue</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Approve, reject, or escalate pending messages.
      </p>

      {error && (
        <div className="bg-red-900/60 border border-red-700 text-red-100 px-4 py-2 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-neutral-400 text-sm">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="text-neutral-400 text-sm">No pending messages.</p>
      ) : (
        <div className="space-y-4">
          {pending.map((msg) => (
            <div
              key={msg.id}
              className="bg-neutral-950/70 border border-neutral-800 rounded-2xl px-4 py-3"
            >
              <div className="flex justify-between text-xs text-neutral-500 mb-2">
                <span>
                  #{CHANNEL_NAME} •{" "}
                  {new Date(msg.created_at).toLocaleString()}
                </span>
                <span>user: {msg.user_id.slice(0, 8)}…</span>
              </div>

              <div className="text-sm mb-3">{msg.content}</div>

              <div className="flex gap-3">
                <button
                  onClick={() => void approveMessage(msg.id)}
                  disabled={actionLoadingId === msg.id}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-700/80 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoadingId === msg.id ? "Working…" : "Approve"}
                </button>

                <button
                  onClick={() => void rejectMessage(msg.id)}
                  disabled={actionLoadingId === msg.id}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-800/80 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject
                </button>

                <button
                  onClick={() => void escalateMessage(msg.id)}
                  disabled={actionLoadingId === msg.id}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-700/80 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Escalate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
