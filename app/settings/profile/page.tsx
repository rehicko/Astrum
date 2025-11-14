"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function ProfileSettingsPage() {
  const router = useRouter();
  // Create the client once so effects don't loop
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [about, setAbout] = useState("");

  useEffect(() => {
    let active = true; // guards against Strict Mode double-run
    (async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;

      if (!user) {
        // Not signed in → go to auth
        router.replace("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, about")
        .eq("id", user.id)
        .single();

      if (!active) return;

      // If row doesn't exist yet, just start blank
      if (error && error.code !== "PGRST116") {
        setStatus(error.message);
      } else if (data) {
        setDisplayName(data.display_name ?? "");
        setAbout(data.about ?? "");
      }

      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [supabase, router]);

  const save = async () => {
    setSaving(true);
    setStatus("Saving…");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth");
      return;
    }

    const dn = displayName.trim().slice(0, 32);
    // upsert makes this resilient if the row doesn't exist yet
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, display_name: dn || null, about: about || null },
        { onConflict: "id" }
      );

    setStatus(error ? `Error: ${error.message}` : "Saved.");
    setSaving(false);
  };

  return (
    <main className="min-h-screen w-full grid place-items-center bg-black text-white">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 p-6">
        <h1 className="text-2xl font-semibold mb-2">Profile</h1>
        <p className="text-sm text-neutral-400 mb-6">
          Set how your name appears in chat.
        </p>

        {loading ? (
          <div className="text-sm text-neutral-500">Loading…</div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <div className="text-sm mb-1">Display name</div>
              <input
                className="w-full p-3 rounded-xl bg-neutral-900 border border-neutral-800 outline-none placeholder:text-neutral-600"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Ajay"
                maxLength={32}
              />
            </label>

            <label className="block">
              <div className="text-sm mb-1">About (optional)</div>
              <textarea
                className="w-full p-3 rounded-xl bg-neutral-900 border border-neutral-800 outline-none placeholder:text-neutral-600 min-h-[100px]"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="A sentence about you."
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-white text-black font-medium hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>

              {status && (
                <div className="text-sm text-neutral-400">{status}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
