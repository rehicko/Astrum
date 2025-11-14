"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useState } from "react";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await supabase.auth.signOut({ scope: "local" as any });
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("sb-"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {}
      router.replace("/auth");
      router.refresh();
      setTimeout(() => {
        if (typeof window !== "undefined") window.location.href = "/auth";
      }, 100);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={signOut}
      className="text-xs text-zinc-400 hover:text-white underline underline-offset-4"
      aria-busy={busy}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
