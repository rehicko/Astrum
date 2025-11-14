"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { ensureProfile } from "@/lib/ensureProfile";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  // URL can set ?mode=signup or ?mode=signin
  const initialMode = (params.get("mode") as Mode) || "signin";
  const [mode, setMode] = useState<Mode>(initialMode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // only used for password flows
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usePassword, setUsePassword] = useState(false); // toggle between magic link and password

  // If already signed in, bounce to Global
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await ensureProfile(supabase);
        router.replace("/crossroads/global");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmedEmail = useMemo(() => email.trim(), [email]);

  async function handleOAuth(provider: "discord" | "google") {
    try {
      setLoading(true);
      setStatus(null);
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/crossroads/global`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) setStatus(`Error: ${error.message}`);
      // Supabase redirects on success
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!trimmedEmail) {
      setStatus("Enter your email first.");
      return;
    }
    try {
      setLoading(true);
      setStatus("Sending magic link…");
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/crossroads/global`
          : undefined;

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) setStatus(`Error: ${error.message}`);
      else setStatus("Check your inbox for the magic link.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignInWithPassword() {
    if (!trimmedEmail) return setStatus("Enter your email.");
    if (!password) return setStatus("Enter your password.");

    try {
      setLoading(true);
      setStatus("Signing in…");
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) return setStatus(`Error: ${error.message}`);

      await ensureProfile(supabase);
      router.replace("/crossroads/global");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    if (!trimmedEmail) return setStatus("Enter your email.");
    if (!password) return setStatus("Create a password (min 6 chars).");

    try {
      setLoading(true);
      setStatus("Creating your account…");
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/crossroads/global`
          : undefined;

      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) return setStatus(`Error: ${error.message}`);
      setStatus(
        "Account created. Check your email to confirm, then you'll be redirected."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full grid place-items-center bg-black text-white">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 p-6">
        <h1 className="text-2xl font-semibold">Sign in to Astrum</h1>
        <p className="text-sm text-neutral-400 mb-4">Join the live feed.</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            className={`px-3 py-1 rounded-lg border ${
              mode === "signin" ? "border-white" : "border-neutral-800"
            }`}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            className={`px-3 py-1 rounded-lg border ${
              mode === "signup" ? "border-white" : "border-neutral-800"
            }`}
            onClick={() => setMode("signup")}
          >
            Create account
          </button>
        </div>

        {/* OAuth */}
        <div className="space-y-3 mb-4">
          <button
            onClick={() => handleOAuth("discord")}
            disabled={loading}
            className="w-full px-4 py-2 rounded-xl border border-neutral-800 hover:bg-neutral-900 disabled:opacity-60"
          >
            Continue with Discord
          </button>
          <button
            onClick={() => handleOAuth("google")}
            disabled={loading}
            className="w-full px-4 py-2 rounded-xl border border-neutral-800 hover:bg-neutral-900 disabled:opacity-60"
          >
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-3">
          <div className="h-px flex-1 bg-neutral-800" />
          <span className="text-xs text-neutral-500">or</span>
          <div className="h-px flex-1 bg-neutral-800" />
        </div>

        {/* Email section */}
        <div className="space-y-3">
          <input
            className="w-full p-3 rounded-xl bg-neutral-900 border border-neutral-800 outline-none placeholder:text-neutral-600"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* Toggle for password vs magic link (only on Sign in) */}
          {mode === "signin" && (
            <>
              <label className="flex items-center gap-2 text-sm text-neutral-400">
                <input
                  type="checkbox"
                  checked={usePassword}
                  onChange={(e) => setUsePassword(e.target.checked)}
                />
                Use password instead of magic link
              </label>

              {usePassword && (
                <input
                  className="w-full p-3 rounded-xl bg-neutral-900 border border-neutral-800 outline-none placeholder:text-neutral-600"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </>
          )}

          {/* Password field for signup */}
          {mode === "signup" && (
            <input
              className="w-full p-3 rounded-xl bg-neutral-900 border border-neutral-800 outline-none placeholder:text-neutral-600"
              type="password"
              placeholder="Create a password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          {/* Submit buttons */}
          {mode === "signin" ? (
            <button
              onClick={usePassword ? handleSignInWithPassword : handleMagicLink}
              disabled={loading}
              className="w-full px-4 py-2 rounded-xl bg-white text-black font-medium hover:opacity-90 disabled:opacity-60"
            >
              {loading
                ? usePassword
                  ? "Signing in…"
                  : "Sending link…"
                : usePassword
                ? "Sign in"
                : "Send magic link"}
            </button>
          ) : (
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full px-4 py-2 rounded-xl bg-white text-black font-medium hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create account"}
            </button>
          )}
        </div>

        {status && (
          <div className="mt-4 text-sm text-neutral-300 min-h-[1.25rem]">
            {status}
          </div>
        )}

        {mode === "signin" ? (
          <div className="mt-3 text-xs text-neutral-500">
            New here?{" "}
            <button
              className="underline underline-offset-4"
              onClick={() => setMode("signup")}
            >
              Create an account
            </button>
          </div>
        ) : (
          <div className="mt-3 text-xs text-neutral-500">
            Already have an account?{" "}
            <button
              className="underline underline-offset-4"
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
