// components/HeaderAuth.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabaseClient";

export function HeaderAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  // Not logged in -> show Sign in link
  if (!session) {
    return
      <Link
        href="/auth"
        className="text-[11px] text-white/55 transition-colors hover:text-white"
      >
        Sign in
      </Link>;
  }

  // Logged in -> show Sign out button
  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="text-[11px] text-white/55 transition-colors hover:text-white"
    >
      Sign out
    </button>
  );
}
