// app/crossroads/mod/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type PendingMessage = {
  id: string;
  content: string;
  created_at: string;
  channel_id: string;
  user_id: string;
  // Optional – we aren't selecting it right now because the column
  // doesn't exist on messages_pending_tbl in your schema.
  report_reason?: string | null;
};

type Action = "approve" | "reject" | "escalate";

export default function ModPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const loadPendingMessages = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("messages_pending_tbl")
        .select("id, content, created_at, channel_id, user_id")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading pending messages:", error);
        setError("Unable to load moderation queue.");
        setMessages([]);
      } else {
        setMessages(data ?? []);
      }

      setLoading(false);
    };

    const init = async () => {
      setCheckingAuth(true);
      setError(null);

      // 1) Check auth
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        setError("Unable to load user session.");
        setCheckingAuth(false);
        setLoading(false);
        return;
      }

      if (!user) {
        // Not logged in → send to /auth
        router.push("/auth");
        return;
      }

      // 2) Check moderator flag
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_moderator")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error loading profile:", profileError);
        setError("Unable to load profile.");
        setCheckingAuth(false);
        setLoading(false);
        return;
      }

      if (!profile?.is_moderator) {
        setNotAuthorized(true);
        setCheckingAuth(false);
        setLoading(false);
        return;
      }

      setCheckingAuth(false);

      // 3) Load pending messages
      await loadPendingMessages();
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = async (msg: PendingMessage, action: Action) => {
    setError(null);
    setActionLoadingId(msg.id);

    try {
      let functionName: string;
      let args: Record<string, any>;

      switch (action) {
        case "approve":
          functionName = "approve_with_audit";
          args = { pending_id: msg.id };
          break;
        case "reject":
          functionName = "reject_with_strike";
          args = {
            pending_id: msg.id,
            reason: "Manual reject from /mod",
          };
          break;
        case "escalate":
          functionName = "escalate_with_audit";
          args = {
            pending_id: msg.id,
            reason: "Manual escalate from /mod",
          };
          break;
        default:
          return;
      }

      const { error } = await supabase.rpc(functionName, args);

      if (error) {
        console.error(`Error running ${functionName}:`, error);
        setError(error.message ?? "Action failed.");
      } else {
        // Remove the message from local state so the UI updates without flicker
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-sm text-slate-400">Checking permissions…</div>
      </div>
    );
  }

  if (notAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="max-w-md text-center px-4">
          <h1 className="text-xl font-semibold mb-2">Access denied</h1>
          <p className="text-sm text-slate-400">
            You don&apos;t have moderator permissions for Astrum yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Moderation Queue</h1>
            <p className="text-sm text-slate-400 mt-1">
              Review messages held by the AI filter. Approve what&apos;s clean,
              reject what crosses the line, escalate anything borderline.
            </p>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-10 flex justify-center">
            <div className="text-sm text-slate-400">Loading queue…</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-center">
            <p className="text-sm text-slate-300">
              Nothing in the queue right now.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              The AI gate is doing its job. Come back when Astrum gets louder.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80">
                <tr className="text-slate-400 text-xs uppercase tracking-wide">
                  <th className="px-3 py-2 text-left">Message</th>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">Channel</th>
                  <th className="px-3 py-2 text-left">Created</th>
                  <th className="px-3 py-2 text-left">Report</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => (
                  <tr
                    key={msg.id}
                    className="border-t border-slate-800/80 hover:bg-slate-900/90"
                  >
                    <td className="px-3 py-3 align-top max-w-md">
                      <div className="text-slate-100 whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-slate-300 text-xs">
                      <div className="font-mono break-all">
                        {msg.user_id ?? "unknown"}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-slate-300 text-xs">
                      <div className="font-mono break-all">
                        {msg.channel_id ?? "GLOBAL"}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-slate-400 text-xs">
                      {new Date(msg.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 align-top text-slate-300 text-xs">
                      {msg.report_reason ? (
                        <span className="inline-flex rounded-full bg-amber-900/40 px-2 py-1 text-[11px] text-amber-200 border border-amber-500/40">
                          {msg.report_reason}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">
                          AI gate only
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAction(msg, "approve")}
                          disabled={actionLoadingId === msg.id}
                          className="rounded-md border border-emerald-500/60 bg-emerald-900/50 px-2.5 py-1 text-[11px] font-medium text-emerald-100 hover:bg-emerald-900 disabled:opacity-50"
                        >
                          {actionLoadingId === msg.id
                            ? "Working…"
                            : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(msg, "reject")}
                          disabled={actionLoadingId === msg.id}
                          className="rounded-md border border-red-500/60 bg-red-900/40 px-2.5 py-1 text-[11px] font-medium text-red-100 hover:bg-red-900 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(msg, "escalate")}
                          disabled={actionLoadingId === msg.id}
                          className="rounded-md border border-amber-500/60 bg-amber-900/40 px-2.5 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-900 disabled:opacity-50"
                        >
                          Escalate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
