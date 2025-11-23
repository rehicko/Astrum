"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function DebugPage() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [counts, setCounts] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Single source: getSession (avoids AuthSessionMissingError)
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (cancelled) return;

      if (sessionError) {
        console.error("Debug getSession error:", sessionError);
        setErr(sessionError.message);
      }

      const currentSession = sessionData.session ?? null;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      // Simple global message count
      const { error: msgError, count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("channel", "global");

      if (cancelled) return;

      if (msgError) {
        console.error("Debug message count error:", msgError);
        setErr(msgError.message);
        setCounts(null);
        return;
      }

      setCounts({
        globalCount: count ?? 0,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <div className="min-h-screen bg-black text-neutral-200 px-6 py-8">
      <h1 className="mb-4 text-xl font-semibold text-neutral-50">Debug</h1>

      {err && (
        <div className="mb-4 rounded-md border border-red-500/50 bg-red-950/60 px-3 py-2 text-sm text-red-100">
          {err}
        </div>
      )}

      <pre className="mb-3 rounded bg-neutral-900 p-3 text-xs">
        user: {JSON.stringify(user, null, 2)}
      </pre>
      <pre className="mb-3 rounded bg-neutral-900 p-3 text-xs">
        session: {JSON.stringify(session, null, 2)}
      </pre>
      <pre className="mb-3 rounded bg-neutral-900 p-3 text-xs">
        counts: {JSON.stringify(counts, null, 2)}
      </pre>
    </div>
  );
}
