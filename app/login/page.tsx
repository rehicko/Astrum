"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<null | string>(null);

  async function sendMagicLink() {
    setStatus("Sending magic link…");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== "undefined"
          ? `${window.location.origin}/crossroads/global`
          : undefined,
      },
    });
    setStatus(error ? `Error: ${error.message}` : "Check your email for the link.");
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-neutral-950 text-neutral-100">
      <div className="w-full max-w-sm space-y-3">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <input
          className="w-full p-3 rounded bg-neutral-900 border border-neutral-800 outline-none"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          onClick={sendMagicLink}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/15"
        >
          Send magic link
        </button>
        {status && <div className="text-sm text-neutral-400">{status}</div>}
      </div>
    </div>
  );
}
