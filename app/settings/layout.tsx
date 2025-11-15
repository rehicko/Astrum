// app/settings/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error checking auth on /settings:", error);
      }

      if (!user) {
        // Not logged in → go to auth page
        router.push("/auth");
        return;
      }

      setCheckingAuth(false);
    };

    checkAuth();
  }, [router, supabase]);

  if (checkingAuth) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-black text-white">
        <div className="text-sm text-white/50">Checking session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-black text-white">
      {children}
    </div>
  );
}
