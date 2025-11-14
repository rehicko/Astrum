// app/auth/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type SessionUser = {
  id: string;
  email: string | null;
};

export default function AuthPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  // Load current session on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        console.warn("getSession error:", error);
        return;
      }

      if (data.session?.user) {
        setUser({
          id: data.session.user.id,
          email: data.session.user.email ?? null,
        });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("signIn error:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email ?? null,
      });
      setEmail("");
      setPassword("");
      // Go back to Crossroads
      router.push("/crossroads/global");
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("signOut error:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    setUser(null);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-sky-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 md:px-10 py-4 text-xs md:text-sm text-neutral-300">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-sm border border-sky-400/60 bg-sky-500/10" />
          <div className="tracking-[0.25em] uppercase text-[11px] text-neutral-400">
            Astrum
          </div>
        </div>
        <button
          onClick={() => router.push("/crossroads/global")}
          className="hidden sm:inline-flex items-center gap-2 text-[11px] md:text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <span className="h-[1px] w-6 bg-neutral-600" />
          Back to Crossroads
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 md:px-10 pb-10">
        <div className="w-full max-w-5xl grid gap-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center">
          {/* Left: copy / vibe */}
          <section className="hidden md:flex flex-col gap-8">
            <div className="space-y-4">
              <p className="text-[11px] tracking-[0.25em] uppercase text-sky-400/80">
                Crossrealm Access
              </p>
              <h1 className="text-3xl lg:text-4xl font-semibold leading-tight">
                Sign in to{" "}
                <span className="text-sky-300">
                  Astrum Crossroads
                </span>
                .
              </h1>
              <p className="text-sm text-neutral-300 max-w-md">
                One account for everything: global chat, profiles,
                reputation, and the overlay that follows you into game.
                No noise, no algorithms — just live threads with people
                who are actually online.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-neutral-300">
                <div className="h-8 w-[1px] bg-sky-500/60" />
                <div className="space-y-0.5">
                  <p className="font-medium text-neutral-100">
                    You&apos;re early.
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    This is the alpha network. Expect bugs. Expect changes.
                    But what you do here will shape the platform.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-[11px] text-neutral-300">
                <div className="border border-white/5 bg-black/30 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-1">
                    Status
                  </p>
                  <p>Closed alpha</p>
                </div>
                <div className="border border-white/5 bg-black/30 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-1">
                    Realms
                  </p>
                  <p>WoW first. More later.</p>
                </div>
                <div className="border border-white/5 bg-black/30 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-1">
                    Overlay
                  </p>
                  <p>Coming soon.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Right: auth card */}
          <section className="w-full">
            <div className="relative">
              <div className="absolute -inset-0.5 bg-sky-500/40 blur-xl opacity-40 pointer-events-none" />
              <div className="relative border border-white/10 bg-black/50 rounded-2xl px-5 py-6 md:px-7 md:py-7 shadow-[0_18px_50px_rgba(0,0,0,0.8)]">
                {user ? (
                  <div className="space-y-5 text-sm">
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-sky-400/80">
                        Signed in
                      </p>
                      <p className="text-lg font-medium">
                        Welcome back, Astrum traveler.
                      </p>
                      <p className="text-xs text-neutral-400">
                        You&apos;re connected as{" "}
                        <span className="font-mono text-sky-300">
                          {user.email ?? user.id}
                        </span>
                        .
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={() => router.push("/crossroads/global")}
                        className="flex-1 px-3 py-2.5 rounded-md bg-sky-500/90 hover:bg-sky-400 text-xs font-medium tracking-wide uppercase"
                      >
                        Enter Crossroads
                      </button>
                      <button
                        onClick={handleSignOut}
                        disabled={loading}
                        className="px-3 py-2.5 rounded-md bg-neutral-900 border border-white/10 hover:bg-neutral-800 text-xs text-neutral-200 disabled:opacity-60"
                      >
                        {loading ? "Signing out…" : "Sign out"}
                      </button>
                    </div>

                    <p className="text-[11px] text-neutral-500">
                      Keep this window open while you play — the overlay
                      and web sessions share the same account.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-5 text-sm">
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-sky-400/80">
                        Log In
                      </p>
                      <p className="text-lg font-medium">
                        Use your Astrum alpha credentials.
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        Same email and password you used when your account
                        was created. We&apos;ll add Battle.net / Twitch
                        later.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full px-3 py-2.5 rounded-md bg-neutral-950/80 border border-white/10 outline-none text-sm placeholder:text-neutral-500 focus:border-sky-400/80"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                        Password
                      </label>
                      <input
                        type="password"
                        className="w-full px-3 py-2.5 rounded-md bg-neutral-950/80 border border-white/10 outline-none text-sm placeholder:text-neutral-500 focus:border-sky-400/80"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                      />
                    </div>

                    {error && (
                      <div className="text-xs text-red-300 bg-red-900/40 border border-red-700/70 rounded-md px-3 py-2">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-3 py-2.5 rounded-md bg-sky-500/90 hover:bg-sky-400 text-xs font-semibold tracking-[0.16em] uppercase disabled:opacity-60"
                    >
                      {loading ? "Signing in…" : "Enter Astrum"}
                    </button>

                    <p className="text-[11px] text-neutral-500 text-center pt-1.5">
                      Alpha build. If you can&apos;t sign in, contact the
                      devs — not support. There is no support.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
