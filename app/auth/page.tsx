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

  // Load current session
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
      // Go back to crossroads
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
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-md border border-neutral-800 rounded-2xl p-6 bg-neutral-950">
        <h1 className="text-xl font-semibold mb-4 text-center">
          Astrum Account
        </h1>

        {user ? (
          <div className="space-y-4 text-sm">
            <p className="text-neutral-300">
              Signed in as{" "}
              <span className="font-mono text-sky-400">
                {user.email ?? user.id}
              </span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/crossroads/global")}
                className="flex-1 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-xs"
              >
                Go to Crossroads
              </button>
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="px-3 py-2 rounded-md bg-red-700/80 hover:bg-red-700 text-xs disabled:opacity-50"
              >
                {loading ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSignIn} className="space-y-4 text-sm">
            <div className="space-y-1">
              <label className="block text-neutral-400 text-xs">
                Email address
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 outline-none text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-neutral-400 text-xs">
                Password
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 outline-none text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-900/40 border border-red-800 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-xs font-medium disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <p className="text-[11px] text-neutral-500 text-center mt-2">
              Use the same email/password you created for Astrum. No OAuth yet.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
