import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensures a row exists in `profiles` for the current user.
 * Safe to call repeatedly (uses upsert on id).
 * Requires RLS policies that allow users to insert/update their own row:
 *
 * INSERT WITH CHECK (auth.uid() = id)
 * UPDATE USING (auth.uid() = id)
 */
export async function ensureProfile(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Try to upsert the minimal required fields; if your schema has more NOT NULL
  // columns, add defaults here.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id }, { onConflict: "id" });

  // Non-fatal if blocked by RLS; we’ll still be signed in.
  if (error) {
    // Optional: console.log("ensureProfile error:", error.message);
  }
}
