"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import { ensureProfile } from "@/lib/ensureProfile";

export default function EnsureProfileMount() {
  const supabase = createClient();

  useEffect(() => {
    ensureProfile(supabase);
  }, [supabase]);

  return null;
}
