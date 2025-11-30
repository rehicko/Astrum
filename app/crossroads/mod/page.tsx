// app/crossroads/mod/page.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabaseClient";

type PendingMessage = {
  id: string;
  content: string;
  created_at: string;
  channel_id: string | null;
  user_id: string | null;
};

type ReportQueueItem = {
  report_id: string;
  reported_at: string;
  report_reason: string | null;
  report_status: string;
  report_resolution: string | null;
  message_id: string | null;
  message_content: string | null;
  author_id: string | null;
  author_display_name: string | null;
  reporter_display_name: string | null;
};

type AuthState = "checking" | "unauth" | "not_mod" | "ok";
type AiAction = "approve" | "reject" | "escalate";
type ReportAction = "resolve" | "strike";

// Presence view rows
type PresenceSummary = {
  totalOnline: number;
  webOnline: number;
  overlayOnline: number;
};

type ChannelPresenceRow = {
  channel: string | null;
  online: number | null;
};

export default function ModPage() {
  const supabase = useMemo(() => createClient(), []);

  const [authState, setAuthState] = useState<AuthState>("checking");
  const [authError, setAuthError] = useState<string | null>(null);

  // Presence + system status
  const [presenceLoading, setPresenceLoading] = useState(true);
  const [presenceError, setPresenceError] = useState<string | null>(null);
  const [presence, setPresence] = useState<PresenceSummary | null>(null);
  const [channelPresence, setChannelPresence] = useState<ChannelPresenceRow[]>(
    []
  );

  // AI gate queue
  const [aiLoading, setAiLoading] = useState(true);
  const [aiMessages, setAiMessages] = useState<PendingMessage[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiActionLoadingId, setAiActionLoadingId] = useState<string | null>(
    null
  );

  // Player report queue
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reports, setReports] = useState<ReportQueueItem[]>([]);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportActionLoadingId, setReportActionLoadingId] = useState<
    string | null
  >(null);

  // ------------ LOADERS ------------

  const loadPresence = useCallback(async () => {
    setPresenceLoading(true);
    setPresenceError(null);

    try {
      // 1) Overall presence (total / web / overlay)
      const { data: rawPresence, error: presenceErr } = await supabase
        .from("astrum_presence_now")
        .select("*")
        .maybeSingle();

      if (presenceErr) {
        console.error("ModPage: error loading astrum_presence_now", presenceErr);
        throw new Error(
          presenceErr.message ?? "Unable to load presence summary."
        );
      }

      const anyPresence = rawPresence as any;

      const totalOnline: number =
        typeof anyPresence?.total_online === "number"
          ? anyPresence.total_online
          : typeof anyPresence?.total === "number"
          ? anyPresence.total
          : typeof anyPresence?.online === "number"
          ? anyPresence.online
          : 0;

      const webOnline: number =
        typeof anyPresence?.web_online === "number"
          ? anyPresence.web_online
          : typeof anyPresence?.web === "number"
          ? anyPresence.web
          : 0;

      const overlayOnline: number =
        typeof anyPresence?.overlay_online === "number"
          ? anyPresence.overlay_online
          : typeof anyPresence?.overlay === "number"
          ? anyPresence.overlay
          : 0;

      setPresence({
        totalOnline,
        webOnline,
        overlayOnline,
      });

      // 2) Per-channel presence
      const { data: channelRows, error: channelErr } = await supabase
        .from("astrum_channel_presence_now")
        .select("*");

      if (channelErr) {
        console.error(
          "ModPage: error loading astrum_channel_presence_now",
          channelErr
        );
        throw new Error(
          channelErr.message ?? "Unable to load channel presence."
        );
      }

      setChannelPresence((channelRows as ChannelPresenceRow[]) ?? []);
    } catch (err: any) {
      setPresenceError(
        err?.message ?? "Unable to load presence / channel activity."
      );
      setPresence(null);
      setChannelPresence([]);
    } finally {
      setPresenceLoading(false);
    }
  }, [supabase]);

  const loadAiQueue = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);

    const { data, error } = await supabase
      .from("messages_pending_tbl")
      .select("id, content, created_at, channel_id, user_id")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("ModPage: error loading AI queue", error);
      setAiError("Unable to load AI moderation queue.");
      setAiMessages([]);
    } else {
      setAiMessages((data as PendingMessage[]) ?? []);
    }

    setAiLoading(false);
  }, [supabase]);

  const loadReportQueue = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(null);

    const { data, error } = await supabase
      .from("message_report_queue")
      .select(
        `
        report_id,
        reported_at,
        report_reason,
        report_status,
        report_resolution,
        message_id,
        message_content,
        author_id,
        author_display_name,
        reporter_display_name
      `
      )
      .order("reported_at", { ascending: false });

    if (error) {
      console.error("ModPage: error loading report queue", error);
      setReportsError("Unable to load player reports.");
      setReports([]);
    } else {
      setReports((data as ReportQueueItem[]) ?? []);
    }

    setReportsLoading(false);
  }, [supabase]);

  // ------------ AUTH + INITIAL LOAD ------------

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setAuthState("checking");
      setAuthError(null);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (cancelled) return;

      if (sessionError) {
        console.error("ModPage: getSession error", sessionError);
        setAuthError("Unable to load user session.");
        setAuthState("unauth");
        setAiLoading(false);
        setReportsLoading(false);
        setPresenceLoading(false);
        return;
      }

      const session = sessionData.session;
      if (!session) {
        setAuthState("unauth");
        setAiLoading(false);
        setReportsLoading(false);
        setPresenceLoading(false);
        return;
      }

      const userId = session.user.id;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_moderator")
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        console.error("ModPage: profile error", profileError);
        setAuthError("Unable to load profile.");
        setAuthState("not_mod");
        setAiLoading(false);
        setReportsLoading(false);
        setPresenceLoading(false);
        return;
      }

      if (!profile?.is_moderator) {
        setAuthState("not_mod");
        setAiLoading(false);
        setReportsLoading(false);
        setPresenceLoading(false);
        return;
      }

      // All good – user is a moderator
      setAuthState("ok");

      // Load queues in parallel. Presence is handled by its own effect below.
      await Promise.all([loadAiQueue(), loadReportQueue()]);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, loadAiQueue, loadReportQueue]);

  // Periodically refresh presence (only when auth OK)
  useEffect(() => {
    if (authState !== "ok") return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await loadPresence();
    };

    void tick(); // initial load

    const id = window.setInterval(tick, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [authState, loadPresence]);

  // ------------ AI GATE ACTIONS ------------

  const handleAiAction = async (msg: PendingMessage, action: AiAction) => {
    setAiError(null);
    setAiActionLoadingId(msg.id);

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
        console.error(`ModPage: error running ${functionName}`, error);
        setAiError(error.message ?? "Action failed.");
      } else {
        setAiMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }
    } finally {
      setAiActionLoadingId(null);
    }
  };

  // ------------ REPORT ACTIONS ------------

  const handleReportAction = async (
    report: ReportQueueItem,
    action: ReportAction
  ) => {
    setReportsError(null);
    setReportActionLoadingId(report.report_id);

    try {
      if (action === "resolve") {
        const { error } = await supabase.rpc("resolve_message_report", {
          p_report_id: report.report_id,
          p_resolution: "reviewed",
        });

        if (error) {
          console.error("ModPage: resolve_message_report error", error);
          setReportsError(error.message ?? "Failed to resolve report.");
        } else {
          setReports((prev) =>
            prev.filter((r) => r.report_id !== report.report_id)
          );
        }
      } else if (action === "strike") {
        const { error } = await supabase.rpc("issue_strike_from_report", {
          p_report_id: report.report_id,
          p_reason: "Moderator strike from report queue",
        });

        if (error) {
          console.error("ModPage: issue_strike_from_report error", error);
          setReportsError(error.message ?? "Failed to apply strike.");
        } else {
          setReports((prev) =>
            prev.filter((r) => r.report_id !== report.report_id)
          );
        }
      }
    } finally {
      setReportActionLoadingId(null);
    }
  };

  // ------------ AUTH STATES ------------

  if (authState === "checking") {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center">
        <div className="text-sm text-neutral-500">
          Checking permissions…
        </div>
      </div>
    );
  }

  if (authState === "unauth") {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center">
        <div className="max-w-md text-center px-4">
          <h1 className="text-xl font-semibold mb-2">Sign-in required</h1>
          <p className="text-sm text-neutral-500">
            You need to be logged in to use the moderation tools. Use the
            sign-in button in the header, then come back to{" "}
            <span className="font-mono">/crossroads/mod</span>.
          </p>
          {authError && (
            <p className="mt-2 text-xs text-red-400">{authError}</p>
          )}
        </div>
      </div>
    );
  }

  if (authState === "not_mod") {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center">
        <div className="max-w-md text-center px-4">
          <h1 className="text-xl font-semibold mb-2">Access denied</h1>
          <p className="text-sm text-neutral-500">
            Your account doesn&apos;t have moderator permissions on Astrum.
          </p>
          {authError && (
            <p className="mt-2 text-xs text-red-400">{authError}</p>
          )}
        </div>
      </div>
    );
  }

  // ------------ DERIVED PRESENCE DISPLAY ------------

  const globalChannelRow =
    channelPresence.find(
      (row) => (row.channel ?? "").toLowerCase() === "global"
    ) ?? null;

  const globalOnlineDisplay =
    presenceLoading && !presence
      ? "—"
      : globalChannelRow?.online ?? presence?.totalOnline ?? 0;

  const overlayOnlineDisplay =
    presenceLoading && !presence
      ? "—"
      : presence
      ? presence.overlayOnline
      : 0;

  const webOnlineDisplay =
    presenceLoading && !presence
      ? "—"
      : presence
      ? presence.webOnline
      : 0;

  const channelActivityDisplay =
    presenceLoading && !channelPresence.length
      ? "—"
      : channelPresence.length
      ? channelPresence
          .map((row) => {
            const slug = (row.channel ?? "?").toLowerCase();
            const count = row.online ?? 0;
            return `${slug}: ${count}`;
          })
          .join("  •  ")
      : "No active channels";

  // ------------ MAIN MOD DASHBOARD ------------

  return (
    <div className="min-h-screen bg-black text-neutral-100">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Page header */}
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-500/80">
            Moderation
          </p>
          <h1 className="text-3xl font-semibold text-neutral-50">
            Moderation queue.
          </h1>
          <p className="text-sm text-neutral-400 max-w-2xl">
            Messages that tripped the AI filter or were reported by players
            land here. Approve what&apos;s clean, reject what crosses the line,
            escalate anything that needs a human second look.
          </p>
        </header>

        {/* PRESENCE & SYSTEM STATUS */}
        <section className="rounded-xl border border-emerald-500/30 bg-black/40 p-4">
          <h2 className="text-sm font-semibold text-emerald-400 mb-2">
            Presence & System Status
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-300">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-3">
              <p className="text-neutral-400 text-[11px] uppercase tracking-wide mb-1">
                Global Online
              </p>
              <p className="font-mono text-neutral-100 text-sm">
                {globalOnlineDisplay}
              </p>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-3">
              <p className="text-neutral-400 text-[11px] uppercase tracking-wide mb-1">
                Overlay vs Web
              </p>
              <p className="font-mono text-neutral-100 text-sm">
                {overlayOnlineDisplay} / {webOnlineDisplay}
              </p>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-3">
              <p className="text-neutral-400 text-[11px] uppercase tracking-wide mb-1">
                Channel Activity
              </p>
              <p className="font-mono text-neutral-100 text-[11px] leading-relaxed">
                {channelActivityDisplay}
              </p>
            </div>
          </div>

          {presenceError && (
            <p className="mt-2 text-[11px] text-red-400">
              {presenceError}
            </p>
          )}
        </section>

        {/* PLAYER REPORTS SECTION */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                Player reports
              </h2>
              <p className="text-xs text-neutral-500">
                Messages flagged by players in chat. You can close a report or
                apply a strike, which plugs into your strike → temp-ban system.
              </p>
            </div>
            <div className="text-right text-[11px] text-neutral-500">
              {reportsLoading
                ? "Loading reports…"
                : `${reports.length} report${
                    reports.length === 1 ? "" : "s"
                  } pending`}
            </div>
          </div>

          {reportsError && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-100">
              {reportsError}
            </div>
          )}

          {reportsLoading ? (
            <div className="mt-4 text-sm text-neutral-500">
              Loading player reports…
            </div>
          ) : reports.length === 0 ? (
            <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-5 text-sm text-neutral-400">
              No active player reports.{" "}
              <span className="text-neutral-500">
                Astrum is quiet for now.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.report_id}
                  className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-black to-black px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-amber-400/80">
                        Reported message
                      </span>
                      <span className="text-xs text-neutral-500">
                        By{" "}
                          <span className="text-neutral-200">
                          {r.reporter_display_name || "Unknown"}
                        </span>{" "}
                        at{" "}
                        {new Date(r.reported_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-neutral-500">
                      {r.report_status}
                      {r.report_resolution
                        ? ` • ${r.report_resolution}`
                        : ""}
                    </span>
                  </div>

                  <div className="rounded-lg border border-neutral-800 bg-black/70 px-3 py-3 mb-3">
                    <div className="text-[11px] text-neutral-500 mb-1">
                      Message from{" "}
                      <span className="text-neutral-200">
                        {r.author_display_name || "Unknown"}
                      </span>
                      :
                    </div>
                    <div className="text-sm text-neutral-100 whitespace-pre-wrap break-words">
                      {r.message_content || "Message not found."}
                    </div>
                  </div>

                  {r.report_reason && (
                    <p className="text-[11px] text-neutral-400 mb-3">
                      Player note:{" "}
                      <span className="text-neutral-200">
                        {r.report_reason}
                      </span>
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] text-neutral-500">
                      Resolution:{" "}
                      <span className="text-neutral-300">
                        Pending moderator review.
                      </span>
                    </p>
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleReportAction(r, "resolve")}
                        disabled={reportActionLoadingId === r.report_id}
                        className="rounded-full border border-neutral-600 bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
                      >
                        {reportActionLoadingId === r.report_id
                          ? "Working…"
                          : "Mark reviewed"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReportAction(r, "strike")}
                        disabled={reportActionLoadingId === r.report_id}
                        className="rounded-full border border-red-500/70 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-100 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {reportActionLoadingId === r.report_id
                          ? "Applying…"
                          : "Add strike & close"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* AI GATE SECTION */}
        <section className="space-y-3 pt-4 border-t border-neutral-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                AI gate queue
              </h2>
              <p className="text-xs text-neutral-500">
                Messages that tripped the AI filter land here before hitting
                public chat. Approve, reject, or escalate.
              </p>
            </div>
            <div className="text-right text-[11px] text-neutral-500">
              {aiLoading
                ? "Loading AI queue…"
                : `${aiMessages.length} in AI queue`}
            </div>
          </div>

          {aiError && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-100">
              {aiError}
            </div>
          )}

          {aiLoading ? (
            <div className="mt-4 text-sm text-neutral-500">
              Loading moderation queue…
            </div>
          ) : aiMessages.length === 0 ? (
            <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-5 text-sm text-neutral-400">
              Nothing in the AI queue right now.{" "}
              <span className="text-neutral-500">
                Either Astrum is quiet or the gate is doing its job.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {aiMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-950/80 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                        Message
                      </span>
                      <span className="text-xs text-neutral-500">
                        User:{" "}
                        <span className="font-mono text-neutral-300">
                          {msg.user_id ?? "unknown"}
                        </span>{" "}
                        • Channel:{" "}
                        <span className="font-mono text-neutral-300">
                          {msg.channel_id ?? "global"}
                        </span>
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {new Date(msg.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="rounded-lg border border-neutral-800 bg-black/70 px-3 py-3 mb-3">
                    <div className="text-sm text-neutral-100 whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleAiAction(msg, "approve")}
                      disabled={aiActionLoadingId === msg.id}
                      className="rounded-full border border-emerald-500/70 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      {aiActionLoadingId === msg.id ? "Working…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAiAction(msg, "reject")}
                      disabled={aiActionLoadingId === msg.id}
                      className="rounded-full border border-red-500/70 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-100 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAiAction(msg, "escalate")}
                      disabled={aiActionLoadingId === msg.id}
                      className="rounded-full border border-amber-500/70 bg-amber-500/10 px-3 py-1.5 text-[11px] font-medium text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      Escalate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
