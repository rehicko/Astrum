// app/debug/load/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type HeaderUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

// Simple pool of human-ish phrases so the AI gate doesn’t auto-ban patterns
const LOADTEST_TEMPLATES: string[] = [
  "just a synthetic message to see if anything breaks.",
  "quick ping to see how the chat feels under light spam.",
  "test wave for load testing, please ignore.",
  "simulating players talking during raid night, nothing to see here.",
  "testing the flow on global, ignore this and keep talking.",
  "checking how astrum feels with a bit of traffic.",
  "pretending this is patch day traffic, you can ignore me.",
  "making sure nothing explodes when messages come in quickly.",
];

export default function LoadTestPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // Auth / mod state
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<HeaderUser | null>(null);

  // Form controls
  const [messagesPerSecond, setMessagesPerSecond] = useState<number>(10);
  const [durationSeconds, setDurationSeconds] = useState<number>(10);

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [plannedTotal, setPlannedTotal] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [runNote, setRunNote] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);
  const sentRef = useRef(0);
  const targetRef = useRef(0);
  const ticksRef = useRef(0);
  const durationRef = useRef(0);

  // Keep refs in sync with state
  useEffect(() => {
    sentRef.current = sentCount;
  }, [sentCount]);

  useEffect(() => {
    durationRef.current = durationSeconds;
  }, [durationSeconds]);

  // ---- Auth + moderator gate ----
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setCheckingAuth(true);
      setAuthError(null);
      setNotAuthorized(false);

      // 1) Get user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError) {
        console.error("LoadTestPage getUser error:", userError);
        setAuthError("Unable to load user session.");
        setCheckingAuth(false);
        setNotAuthorized(true);
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
        .select("is_moderator, display_name")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (profileError) {
        console.error("LoadTestPage profile error:", profileError);
        setAuthError("Unable to load profile.");
        setCheckingAuth(false);
        setNotAuthorized(true);
        return;
      }

      if (!profile?.is_moderator) {
        setNotAuthorized(true);
        setCheckingAuth(false);
        return;
      }

      setUser({
        id: user.id,
        email: user.email ?? null,
        displayName:
          (profile.display_name && profile.display_name.trim()) ||
          user.email ||
          null,
      });

      setCheckingAuth(false);
    };

    init();

    return () => {
      cancelled = true;
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [supabase, router]);

  // ---- Core send logic ----
  /**
   * Inserts a pending message, then calls the same moderation endpoint
   * used by Chat.tsx so the message flows all the way into `messages`.
   */
  const sendOneMessage = async (index: number) => {
    if (!user) {
      throw new Error("No user available for load test.");
    }

    const template =
      LOADTEST_TEMPLATES[index % LOADTEST_TEMPLATES.length] ??
      "synthetic load test message.";
    const content = template;

    // 1) Insert into messages_pending_tbl and get pending_id
    const { data, error } = await supabase
      .from("messages_pending_tbl")
      .insert({
        user_id: user.id,
        channel_id: "global",
        content,
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    const pendingId = data?.id;
    if (!pendingId) {
      throw new Error("No pending_id returned from insert.");
    }

    // 2) Hit the same moderation endpoint Chat.tsx uses
    const resp = await fetch("/api/moderation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pendingId }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(
        `Moderation endpoint failed (${resp.status}): ${text || "no body"}`
      );
    }
  };

  const stopRun = (reason?: string) => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);

    if (reason) {
      setRunNote(reason);
    } else {
      setRunNote(null);
    }
  };

  const handleStart = () => {
    if (!user) {
      setAuthError("You must be signed in to run a load test.");
      return;
    }

    if (isRunning) return;

    // Basic validation / clamps
    const mps = Math.max(1, Math.min(50, Math.floor(messagesPerSecond)));
    const dur = Math.max(1, Math.min(60, Math.floor(durationSeconds)));
    const total = mps * dur;

    setMessagesPerSecond(mps);
    setDurationSeconds(dur);
    setPlannedTotal(total);
    targetRef.current = total;
    sentRef.current = 0;
    ticksRef.current = 0;
    durationRef.current = dur;

    setSentCount(0);
    setErrorCount(0);
    setLastError(null);
    setRunNote(null);
    setIsRunning(true);

    // Interval: once per second, send mps messages
    const id = window.setInterval(async () => {
      const target = targetRef.current;
      const alreadySent = sentRef.current;
      const remaining = target - alreadySent;

      // If done or exceeded planned duration, stop
      ticksRef.current += 1;
      if (remaining <= 0 || ticksRef.current > durationRef.current) {
        stopRun("Completed planned run.");
        return;
      }

      const mpsNow = messagesPerSecond; // use latest clamped value
      const batchSize = Math.min(remaining, mpsNow);

      try {
        const promises: Promise<void>[] = [];
        for (let i = 0; i < batchSize; i += 1) {
          const seq = alreadySent + i + 1;
          promises.push(
            sendOneMessage(seq).then(
              () => {
                // Success: bump sent count
                setSentCount((prev) => prev + 1);
              },
              (err) => {
                // Per-message failure: count & capture last message
                console.error("Load test send error:", err);
                setErrorCount((prev) => prev + 1);
                setLastError(
                  err?.message || "Unknown error while inserting message."
                );
              }
            )
          );
        }
        await Promise.all(promises);
      } catch (err: any) {
        console.error("Load test batch error:", err);
        setErrorCount((prev) => prev + 1);
        setLastError(
          err?.message || "Unknown error while running load batch."
        );
      }
    }, 1000);

    intervalRef.current = id;
  };

  const handleStopClick = () => {
    stopRun("Stopped manually.");
  };

  // ---- Render states ----

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black text-neutral-200 flex items-center justify-center">
        <div className="text-sm text-neutral-500">Checking permissions…</div>
      </div>
    );
  }

  if (notAuthorized) {
    return (
      <div className="min-h-screen bg-black text-neutral-200 flex items-center justify-center">
        <div className="max-w-md text-center px-4">
          <h1 className="text-xl font-semibold mb-2">Access denied</h1>
          <p className="text-sm text-neutral-500 mb-2">
            This load test console is for Astrum moderators only.
          </p>
          {authError && (
            <p className="text-xs text-red-400 mt-1">{authError}</p>
          )}
        </div>
      </div>
    );
  }

  const effectiveTotal = plannedTotal || messagesPerSecond * durationSeconds;

  return (
    <div className="min-h-screen bg-black text-neutral-100">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-500/80">
            Debug
          </p>
          <h1 className="text-3xl font-semibold text-neutral-50">
            Load test console.
          </h1>
          <p className="text-sm text-neutral-400 max-w-2xl">
            Fire synthetic messages into{" "}
            <span className="font-mono">#global</span> using the same pipeline
            as chat. Use this to see how Astrum behaves under heavy spam before
            you invite thousands of players.
          </p>
        </header>

        {/* Current user + channel */}
        <section className="rounded-2xl border border-neutral-900 bg-neutral-950/80 px-4 py-4 text-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 mb-1">
                Session
              </p>
              <p className="text-sm text-neutral-100">
                Running as{" "}
                <span className="font-semibold">
                  {user?.displayName || user?.email || user?.id}
                </span>
              </p>
              {user?.email && (
                <p className="text-[11px] text-neutral-500">{user.email}</p>
              )}
            </div>
            <div className="text-right text-[11px] text-neutral-400">
              <p>
                Channel:{" "}
                <span className="font-mono text-neutral-100">/GLOBAL</span>
              </p>
              <p className="mt-1">
                Messages are synthetic but look like normal player chatter.
              </p>
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className="rounded-2xl border border-neutral-900 bg-neutral-950/80 px-4 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.16em] text-neutral-500 mb-1">
                  Messages per second
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={messagesPerSecond}
                  onChange={(e) =>
                    setMessagesPerSecond(
                      Number.isNaN(Number(e.target.value))
                        ? 0
                        : Number(e.target.value)
                    )
                  }
                  className="w-32 rounded-md bg-black border border-neutral-800 px-3 py-2 text-sm text-neutral-50 outline-none focus:border-emerald-500/80"
                  disabled={isRunning}
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                  Start low (e.g. 5–10 msg/s) and ramp up slowly.
                </p>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.16em] text-neutral-500 mb-1">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={durationSeconds}
                  onChange={(e) =>
                    setDurationSeconds(
                      Number.isNaN(Number(e.target.value))
                        ? 0
                        : Number(e.target.value)
                    )
                  }
                  className="w-32 rounded-md bg-black border border-neutral-800 px-3 py-2 text-sm text-neutral-50 outline-none focus:border-emerald-500/80"
                  disabled={isRunning}
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                  Keep it short at first (5–15s) while you watch Supabase.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-neutral-800 bg-black/70 px-3 py-2 text-[12px]">
                <p className="text-neutral-400">
                  Planned messages this run:
                </p>
                <p className="mt-0.5 text-lg font-semibold text-emerald-400">
                  {effectiveTotal.toLocaleString("en-US")}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                {!isRunning ? (
                  <button
                    type="button"
                    onClick={handleStart}
                    className="rounded-full bg-emerald-500 text-black px-4 py-2 text-[11px] font-semibold tracking-[0.18em] uppercase hover:bg-emerald-400 transition-colors"
                  >
                    Start test
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopClick}
                    className="rounded-full border border-red-500/70 bg-red-500/10 text-red-100 px-4 py-2 text-[11px] font-semibold tracking-[0.18em] uppercase hover:bg-red-500/20 transition-colors"
                  >
                    Stop early
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-[12px]">
            <div className="rounded-lg border border-neutral-800 bg-black/60 px-3 py-2">
              <p className="text-neutral-500 text-[11px]">Sent</p>
              <p className="mt-0.5 text-neutral-100">
                {sentCount.toLocaleString("en-US")}{" "}
                <span className="text-neutral-500">
                  / {effectiveTotal.toLocaleString("en-US")}
                </span>
              </p>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-black/60 px-3 py-2">
              <p className="text-neutral-500 text-[11px]">Errors</p>
              <p className="mt-0.5 text-neutral-100">
                {errorCount.toLocaleString("en-US")}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-black/60 px-3 py-2">
              <p className="text-neutral-500 text-[11px]">Run state</p>
              <p className="mt-0.5 text-neutral-100">
                {isRunning ? "Running…" : "Idle"}
              </p>
            </div>
          </div>

          {lastError && (
            <div className="mt-3 rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-[11px] text-red-100">
              <p className="font-semibold mb-0.5">Last error</p>
              <p className="break-words">{lastError}</p>
            </div>
          )}

          {runNote && (
            <div className="mt-2 text-[11px] text-neutral-500">{runNote}</div>
          )}

          <p className="mt-4 text-[11px] text-neutral-500">
            Tip: keep an eye on <span className="font-mono">/crossroads/global</span> and your
            Supabase dashboard while this runs. When you&apos;re done, you can
            prune load-test messages by deleting rows that look synthetic.
          </p>
        </section>
      </div>
    </div>
  );
}
