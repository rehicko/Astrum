// app/crossroads/supabaseClient.ts
"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Help debug in production if envs are missing
  console.error("Supabase env missing", {
    urlPresent: Boolean(url),
    anonPresent: Boolean(anon),
  });
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(url, anon);
export default supabase;
