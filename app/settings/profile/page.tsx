// app/settings/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
};

export default function ProfileSettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  // Load session + profile
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth");
        return;
      }

      const userId = session.user.id;

      // Try to load existing profile
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, bio")
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("load profile error:", error);
        setError("Failed to load profile.");
        setLoading(false);
        return;
      }

      let prof = data as Profile | null;

      // If no row, create one with a default display name
      if (!prof) {
        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            display_name:
              session.user.email?.split("@")[0] ?? "Traveler",
            bio: "",
          })
          .select("id, display_name, bio")
          .single();

        if (insertError) {
          console.error("insert profile error:", insertError);
          setError("Failed to initialize profile.");
          setLoading(false);
          return;
        }

        prof = inserted as Profile;
      }

      setProfile(prof);
      setDisplayName(prof.display_name ?? "");
      setBio(prof.bio ?? "");
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setSaved(false);
    setError(null);

    const { error } = await supabase.from("profiles").upsert(
      {
        id: profile.id,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("save profile error:", error);
      setError("Failed to save profile. Check permissions.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);

    // fade out "Saved." message after a bit
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-3xl border border-neutral-900 bg-neutral-950/90 shadow-[0_24px_80px_rgba(0,0,0,0.9)] relative overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-neutral-900">
          <div>
            <h1 className="text-lg font-semibold text-neutral-50">
              Profile
            </h1>
            <p className="text-xs text-neutral-400">
              Set how your name appears in chat and on future overlays.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/crossroads/global")}
            className="text-[11px] px-3 py-1.5 rounded-full border border-neutral-800 bg-black/40 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors"
          >
            ← Back to Crossroads
          </button>
        </div>

        {/* Main content */}
        <div className="px-6 py-5 space-y-6">
          {loading ? (
            <div className="text-sm text-neutral-400">
              Loading profile…
            </div>
          ) : error ? (
            <div className="text-sm text-red-400">{error}</div>
          ) : (
            <>
              {/* Basic profile form */}
              <form
                onSubmit={handleSave}
                className="space-y-4 text-sm"
              >
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">
                    Display name
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2.5 outline-none text-sm text-neutral-50 focus:border-sky-500/80"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={40}
                    placeholder="Ajay, Rehicko, etc."
                  />
                  <p className="mt-1 text-[11px] text-neutral-500">
                    This is what other players see next to your messages.
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">
                    About (optional)
                  </label>
                  <textarea
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2.5 outline-none text-sm text-neutral-50 focus:border-sky-500/80 resize-none"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={240}
                    placeholder="Class, role, main game, or a short line about you."
                  />
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Used on your profile and in future overlays when
                    someone inspects you.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold tracking-[0.16em] uppercase disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  {saved && (
                    <span className="text-xs text-neutral-400">
                      Saved.
                    </span>
                  )}
                  {error && (
                    <span className="text-xs text-red-400">
                      {error}
                    </span>
                  )}
                </div>
              </form>

              {/* Linked accounts / WoW placeholder */}
              <div className="mt-4 border-t border-neutral-900 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-neutral-200">
                      Linked accounts
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Battle.net, Twitch and character profiles will
                      appear here.
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 border border-neutral-800 rounded-full px-2 py-0.5">
                    Coming soon
                  </span>
                </div>

                <div className="rounded-xl border border-neutral-900 bg-black/40 px-3 py-3 text-xs text-neutral-400">
                  <p className="mb-1">
                    You&apos;ll be able to:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Link your Battle.net account.</li>
                    <li>Select your WoW main character.</li>
                    <li>Show your class / spec in Astrum.</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
