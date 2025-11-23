"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type RequireAuthGateProps = {
  children: React.ReactNode;
};

/**
 * Wrap any page or section that should only be visible
 * to logged-in users.
 *
 * - If NO user: redirects to /auth
 * - If user exists: renders children
 */
export function RequireAuthGate({ children }: RequireAuthGateProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error("RequireAuthGate: getUser error", error);
        router.replace("/auth");
        return;
      }

      if (!data.user) {
        router.replace("/auth");
        return;
      }

      setAllowed(true);
    });
  }, [router]);

  if (!allowed) {
    // You can swap this for a loading spinner if you want
    return null;
  }

  return <>{children}</>;
}
