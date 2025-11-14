"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function LogoutPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      await supabase.auth.signOut();
      router.replace("/crossroads/login");
    })();
  }, [router, supabase]);

  return (
    <div className="min-h-screen w-full grid place-items-center bg-black text-white">
      <div className="text-sm text-zinc-400">Signing you out…</div>
    </div>
  );
}
