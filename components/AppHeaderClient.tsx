// components/AppHeaderClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { HeaderAuth } from "@/components/HeaderAuth";

type HeaderUser = {
  id: string;
  email: string | null;
} | null;

export function AppHeaderClient() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<HeaderUser>(null);

  useEffect(() => {
    let mounted = true;

    // Initial session check
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.warn("AppHeader getSession error:", error);
        setUser(null);
        return;
      }

      const sessionUser = data.session?.user ?? null;
      if (sessionUser) {
        setUser({
          id: sessionUser.id,
          email: sessionUser.email ?? null,
        });
      } else {
        setUser(null);
      }
    });

    // Subscribe to auth changes so header reacts instantly
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;

        const sessionUser = newSession?.user ?? null;
        if (sessionUser) {
          setUser({
            id: sessionUser.id,
            email: sessionUser.email ?? null,
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const isAuthed = !!user;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="flex w-full items-center justify-between px-4 py-4 md:px-6">
        {/* Logo + brand */}
        <Link href="/" className="flex items-center gap-3">
          {/* Orbital ring logo */}
          <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-black">
            {/* Ring */}
            <div className="h-5 w-5 rounded-full border border-emerald-400/70" />
            {/* Satellite dot on the orbit */}
            <div className="absolute h-1.5 w-1.5 rounded-full bg-emerald-400 top-1 right-0.5 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
          </div>

          {/* Wordmark */}
          <span className="font-mono text-[10px] uppercase tracking-[0.45em] text-white/75">
            ASTRUM
          </span>
        </Link>

        <nav className="flex items-center gap-6 text-[11px] font-medium text-white/55">
          {/* Always visible */}
          <Link
            href="/crossroads/global"
            className="transition-colors hover:text-white"
          >
            Chat
          </Link>

          {/* Only for logged-in users */}
          {isAuthed && (
            <>
              <Link
                href="/settings/profile"
                className="transition-colors hover:text-white"
              >
                Profile
              </Link>
              <Link
                href="/settings"
                className="transition-colors hover:text-white"
              >
                Settings
              </Link>
            </>
          )}

          {/* Always visible */}
          <Link href="/faq" className="transition-colors hover:text-white">
            FAQ
          </Link>

          <Link
            href="/download"
            className="transition-colors hover:text-white"
          >
            Download
          </Link>

          {/* Sign in / Sign out */}
          <HeaderAuth />
        </nav>
      </div>
    </header>
  );
}
