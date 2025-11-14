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
    (async () => {
      const u = await supabase.auth.getUser();
      const s = await supabase.auth.getSession();
      setUser(u.data.user ?? null);
      setSession(s.data.session ?? null);

      const { data, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("channel", "global");
      if (error) setErr(error.message);
      setCounts({ global: data === null ? 0 : (data as any)?.length ?? "—", countHint: (data as any) });

    })();
  }, [supabase]);

  return (
    <div className="p-6 text-sm text-neutral-200">
      <h1 className="text-xl mb-4">Debug</h1>
      <pre className="bg-neutral-900 p-3 rounded mb-3">user: {JSON.stringify(user, null, 2)}</pre>
      <pre className="bg-neutral-900 p-3 rounded mb-3">session: {JSON.stringify(session, null, 2)}</pre>
      <pre className="bg-neutral-900 p-3 rounded mb-3">counts: {JSON.stringify(counts, null, 2)}</pre>
      {err && <div className="text-red-400">RLS error: {err}</div>}
    </div>
  );
}
