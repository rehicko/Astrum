// lib/supabaseClient.ts
"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Single helper for browser components
export function createClient() {
  return createSupabaseClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "astrum-auth", // namespaced key
    },
    realtime: { params: { eventsPerSecond: 30 } },
  });
}
