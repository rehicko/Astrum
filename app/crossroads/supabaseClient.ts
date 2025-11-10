// app/crossroads/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single shared browser client.
// (Works in client components; values come from Vercel envs at build/runtime)
export const supabase = createClient(url, anon);

// Export default too, to satisfy any `import supabase from ...` usages.
export default supabase;
