// app/auth/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { RedirectIfAuthed } from "@/components/RedirectIfAuthed";

type SessionUser = {
  id: string;
  email: string | null;
};

type AuthMode = "signin" | "signup";

export default function AuthPage() {
  const supabase = createClient();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  const isSignIn = mode === "signin";

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

  // Email / password sign-in
  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("signIn error:", error);

      const raw = (error.message || "").toLowerCase();
      let msg = error.message;

      if (
        raw.includes("email not confirmed") ||
        raw.includes("email_not_confirmed")
      ) {
        msg =
          "Please confirm your email before logging in. Check your inbox (and spam) for the confirmation link.";
      }

      setError(msg);
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
      router.push("/crossroads/global");
    }

    setLoading(false);
  };

  // Email / password sign-up
  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error("signUp error:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is off, Supabase may return a user immediately
    if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email ?? null,
      });
      setEmail("");
      setPassword("");
      router.push("/crossroads/global");
      setLoading(false);
      return;
    }

    // Confirmation flow
    setNotice(
      "Check your email to confirm your Astrum account. Once confirmed, come back here and sign in with the same email and password."
    );
    setMode("signin");
    setLoading(false);
  };

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("signOut error:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    setUser(null);
    setLoading(false);
    setMode("signin");
  };

  // Shared OAuth handler for Google / Twitch
  const handleOAuthSignIn = async (provider: "google" | "twitch") => {
    try {
      setLoading(true);
      setError(null);
      setNotice(null);

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/crossroads/global`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error("OAuth sign-in error:", error);
        setError(error.message);
        setLoading(false);
        return;
      }

      // Supabase will redirect; this setLoading is mostly for safety
    } catch (err) {
      console.error("OAuth sign-in unexpected error:", err);
      setError("Something went wrong starting the login. Try again.");
      setLoading(false);
    }
  };

  return (
    <RedirectIfAuthed>
      <div className="min-h-screen bg-gradient-to-br from-black via-[#020617] to-[#050816] text-white flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4 md:px-10 pb-10">
          <div className="w-full max-w-5xl grid gap-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center">
            {/* Left: Astrum story */}
            <section className="hidden md:flex flex-col gap-8">
              <div className="space-y-4">
                <p className="text-[11px] tracking-[0.25em] uppercase text-emerald-400/80">
                  Astrum Account
                </p>
                <h1 className="text-3xl lg:text-4xl font-semibold leading-tight">
                  Welcome to <span className="text-emerald-300">Astrum</span>.
                </h1>
                <p className="text-sm text-neutral-300 max-w-md">
                  One identity across everything: Crossroads chat, your
                  profile, reputation, and soon the overlay that follows you
                  in-game. Crossroads is your first stop — more spaces come
                  later.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-neutral-300">
                  <div className="h-8 w-[1px] bg-emerald-500/70" />
                  <div className="space-y-0.5">
                    <p className="font-medium text-neutral-100">
                      You&apos;re early.
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      This is the alpha network. Expect bugs. Expect changes.
                      What you do here will shape what Astrum becomes.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-[11px] text-neutral-300">
                  <div className="border border-white/5 bg-black/40 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-1">
                      Status
                    </p>
                    <p>Closed alpha</p>
                  </div>
                  <div className="border border-white/5 bg-black/40 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-1">
                      Realms
                    </p>
                    <p>WoW first. More later.</p>
                  </div>
                  <div className="border border-white/5 bg-black/40 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-1">
                      Overlay
                    </p>
                    <p>Desktop overlay in 0.1.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Right: auth card */}
            <section className="w-full">
              <div className="relative">
                <div className="absolute -inset-0.5 bg-emerald-500/30 blur-xl opacity-35 pointer-events-none" />
                <div className="relative border border-white/10 bg-black/60 rounded-2xl px-5 py-6 md:px-7 md:py-7 shadow-[0_18px_50px_rgba(0,0,0,0.85)]">
                  {user ? (
                    <div className="space-y-5 text-sm">
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-400/80">
                          Signed in
                        </p>
                        <p className="text-lg font-medium">
                          Welcome back, traveler.
                        </p>
                        <p className="text-xs text-neutral-400">
                          You&apos;re connected as{" "}
                          <span className="font-mono text-emerald-300">
                            {user.email ?? user.id}
                          </span>
                          .
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          onClick={() => router.push("/crossroads/global")}
                          className="flex-1 px-3 py-2.5 rounded-md bg-emerald-500/90 hover:bg-emerald-400 text-xs font-medium tracking-wide uppercase"
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

                      <button
                        type="button"
                        onClick={() => router.push("/crossroads/global")}
                        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-neutral-500 hover:text-neutral-100 pt-1"
                      >
                        <span className="h-[1px] w-5 bg-neutral-600" />
                        Back to Crossroads
                      </button>

                      <p className="text-[11px] text-neutral-500">
                        Keep this window open while you play — the overlay
                        and web share the same Astrum account.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={isSignIn ? handleSignIn : handleSignUp}
                      className="space-y-5 text-sm"
                    >
                      {/* Header + mode toggle */}
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-400/80">
                            {isSignIn ? "Log in" : "Create account"}
                          </p>
                          <p className="text-lg font-medium">
                            {isSignIn
                              ? "Sign in to your Astrum account."
                              : "Create your Astrum account."}
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            {isSignIn
                              ? "Use the same email and password you set up during alpha. You can also link Google or Twitch."
                              : "Pick an email and password for Astrum. You can connect Google or Twitch as you go."}
                          </p>
                        </div>
                        <div className="hidden sm:flex flex-col items-end gap-2">
                          <div className="flex text-[11px] bg-neutral-900/60 border border-white/10 rounded-full p-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setMode("signin");
                                setError(null);
                                setNotice(null);
                              }}
                              className={`px-3 py-1.5 rounded-full transition-colors ${
                                isSignIn
                                  ? "bg-emerald-500/90 text-black"
                                  : "text-neutral-400 hover:text-neutral-100"
                              }`}
                            >
                              Sign in
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMode("signup");
                                setError(null);
                                setNotice(null);
                              }}
                              className={`px-3 py-1.5 rounded-full transition-colors ${
                                !isSignIn
                                  ? "bg-emerald-500/90 text-black"
                                  : "text-neutral-400 hover:text-neutral-100"
                              }`}
                            >
                              Create
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => router.push("/crossroads/global")}
                            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-neutral-500 hover:text-neutral-100"
                          >
                            <span className="h-[1px] w-5 bg-neutral-600" />
                            Back to Crossroads
                          </button>
                        </div>
                      </div>

                      {/* OAuth buttons */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleOAuthSignIn("google")}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-white text-neutral-900 text-xs font-semibold tracking-[0.12em] uppercase hover:bg-neutral-100 disabled:opacity-60"
                        >
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900/5 text-[11px] font-bold">
                            G
                          </span>
                          Continue with Google
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleOAuthSignIn("twitch")}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-[#9146FF] text-white text-xs font-semibold tracking-[0.12em] uppercase hover:bg-[#7c3aed] disabled:opacity-60"
                        >
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/20 text-[11px] font-bold">
                            T
                          </span>
                          Continue with Twitch
                        </button>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-neutral-500 pt-1">
                        <div className="flex-1 h-[1px] bg-neutral-800" />
                        <span>or use email</span>
                        <div className="flex-1 h-[1px] bg-neutral-800" />
                      </div>

                      {/* Email / password fields */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                          Email
                        </label>
                        <input
                          type="email"
                          className="w-full px-3 py-2.5 rounded-md bg-neutral-950/80 border border-white/10 outline-none text-sm placeholder:text-neutral-500 focus:border-emerald-400/80"
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
                          className="w-full px-3 py-2.5 rounded-md bg-neutral-950/80 border border-white/10 outline-none text-sm placeholder:text-neutral-500 focus:border-emerald-400/80"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete={
                            isSignIn ? "current-password" : "new-password"
                          }
                          placeholder="••••••••"
                        />
                      </div>

                      {/* Notices / errors */}
                      {notice && (
                        <div className="text-xs text-emerald-200 bg-emerald-900/30 border border-emerald-600/60 rounded-md px-3 py-2">
                          {notice}
                        </div>
                      )}

                      {error && (
                        <div className="text-xs text-red-300 bg-red-900/40 border border-red-700/70 rounded-md px-3 py-2">
                          {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-3 py-2.5 rounded-md bg-emerald-500/90 hover:bg-emerald-400 text-xs font-semibold tracking-[0.16em] uppercase disabled:opacity-60"
                      >
                        {loading
                          ? isSignIn
                            ? "Signing in…"
                            : "Creating account…"
                          : isSignIn
                          ? "Enter Astrum"
                          : "Create account"}
                      </button>

                      {/* Mobile toggle + back */}
                      <div className="flex flex-col items-center gap-1 pt-2 text-[11px] text-neutral-500 sm:hidden">
                        <div className="flex gap-1">
                          {isSignIn ? (
                            <>
                              <span>Don&apos;t have an account?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setMode("signup");
                                  setError(null);
                                  setNotice(null);
                                }}
                                className="text-emerald-300 hover:text-emerald-200 underline-offset-2 hover:underline"
                              >
                                Create one
                              </button>
                            </>
                          ) : (
                            <>
                              <span>Already have an account?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setMode("signin");
                                  setError(null);
                                  setNotice(null);
                                }}
                                className="text-emerald-300 hover:text-emerald-200 underline-offset-2 hover:underline"
                              >
                                Sign in
                              </button>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => router.push("/crossroads/global")}
                          className="mt-1 text-[10px] uppercase tracking-[0.16em] text-neutral-500 hover:text-neutral-100"
                        >
                          Back to Crossroads
                        </button>
                      </div>

                      <p className="text-[11px] text-neutral-500 text-center pt-1.5">
                        Alpha build. Accounts, data, and features may reset at
                        any time. If you can&apos;t sign in, ping the devs —
                        there is no support desk.
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </RedirectIfAuthed>
  );
}
