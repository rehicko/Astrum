// components/RedirectIfAuthed.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type RedirectIfAuthedProps = {
  children: React.ReactNode;
};

/**
 * Wrap the /auth page content.
 *
 * - If user IS logged in: redirects to /crossroads/global
 * - If no user: shows the children (auth form)
 */
export function RedirectIfAuthed({ children }: RedirectIfAuthedProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    (async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.warn("RedirectIfAuthed: getSession error", error);
        // Fail open: let them see the auth page
        setChecked(true);
        return;
      }

      if (data.session?.user) {
        // Already logged in -> bounce away from /auth
        router.replace("/crossroads/global");
      } else {
        // No session -> show children (auth form)
        setChecked(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (!checked) {
    // Waiting to know if user exists
    return null;
  }

  return <>{children}</>;
}
