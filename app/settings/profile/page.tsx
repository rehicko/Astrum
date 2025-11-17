// app/settings/profile/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

// Anniversary realms
const ANNIVERSARY_REALMS = [
  "Dreamscythe",
  "Nightslayer",
  "Doomhowl",
];

// MoP realm list (Anniversary realms removed)
const MOP_REALMS = [
  "Pagle",
  "Nazgrim",
  "Galakras",
  "Ra-den",
  "Lei Shen",
  "Immerseus",
  "Grobbulus",
  "Arugal",
];

const ERA_REALMS = [
  "Whitemane",
  "Fairbanks",
  "Thunderfury",
  "Arcanite Reaper",
  "Bigglesworth",
  "Blaumeux",
  "Anathema",
  "Rattlegore",
  "Smolderweb",
  "Kurinnaxx",
  "Mankrik",
  "Westfall",
  "Pagle",
  "Windseeker",
  "Ashkandi",
  "Atiesh",
  "Old Blanchy",
  "Azuresong",
  "Myzrael",
  "Grobbulus",
  "Bloodsail Buccaneers",
  "Deviate Delight",
  "Arugal",
  "Yojamba",
  "Felstriker",
];

// TBC-era classes
const CLASS_OPTIONS = [
  "Warrior",
  "Paladin",
  "Hunter",
  "Rogue",
  "Priest",
  "Shaman",
  "Mage",
  "Warlock",
  "Druid",
];

// TBC-era races
const RACE_OPTIONS = [
  // Alliance
  "Human",
  "Dwarf",
  "Night Elf",
  "Gnome",
  "Draenei",
  // Horde
  "Orc",
  "Undead",
  "Tauren",
  "Troll",
  "Blood Elf",
];

type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  classic_name: string | null;
  classic_realm: string | null;
  classic_region: string | null;
  classic_faction: string | null;
  classic_class: string | null;
  classic_race: string | null;
  classic_level: number | null;
};

export default function ProfileSettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  // Classic main fields
  const [classicName, setClassicName] = useState("");
  const [classicRealm, setClassicRealm] = useState("");
  const [classicRegion, setClassicRegion] = useState("US");
  const [classicFaction, setClassicFaction] = useState<"" | "Alliance" | "Horde">("");
  const [classicClass, setClassicClass] = useState("");
  const [classicRace, setClassicRace] = useState("");
  const [classicLevel, setClassicLevel] = useState("");

  // Battle.net status
  const [bnetLinked, setBnetLinked] = useState(false);
  const [bnetCharsCount, setBnetCharsCount] = useState<number | null>(null);

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

      // Try to load existing profile, including classic fields
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, bio, classic_name, classic_realm, classic_region, classic_faction, classic_class, classic_race, classic_level"
        )
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
            display_name: session.user.email?.split("@")[0] ?? "Traveler",
            bio: "",
          })
          .select(
            "id, display_name, bio, classic_name, classic_realm, classic_region, classic_faction, classic_class, classic_race, classic_level"
          )
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

      // hydrate classic fields
      setClassicName(prof.classic_name ?? "");
      setClassicRealm(prof.classic_realm ?? "");
      setClassicRegion(prof.classic_region ?? "US");
      setClassicFaction((prof.classic_faction as any) ?? "");
      setClassicClass(prof.classic_class ?? "");
      setClassicRace(prof.classic_race ?? "");
      setClassicLevel(
        prof.classic_level != null ? String(prof.classic_level) : ""
      );

      // Battle.net status: check wow_characters
      const { data: chars, error: charsErr } = await supabase
        .from("wow_characters")
        .select("id")
        .eq("user_id", userId);

      if (!cancelled) {
        if (!charsErr && chars) {
          setBnetLinked(chars.length > 0);
          setBnetCharsCount(chars.length);
        }
        setLoading(false);
      }
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

    const levelNumber =
      classicLevel.trim() === "" ? null : Number.parseInt(classicLevel, 10);

    const { error } = await supabase.from("profiles").upsert(
      {
        id: profile.id,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        classic_name: classicName.trim() || null,
        classic_realm: classicRealm.trim() || null,
        classic_region: classicRegion.trim() || null,
        classic_faction: classicFaction || null,
        classic_class: classicClass.trim() || null,
        classic_race: classicRace.trim() || null,
        classic_level: Number.isNaN(levelNumber) ? null : levelNumber,
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
              Set how your name appears in chat, overlays, and link your
              Classic main.
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
              <form onSubmit={handleSave} className="space-y-5 text-sm">
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
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2.5 outline-none text-sm text-neutral-50 focus:border-sky-500/80_resize-none"
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

                {/* Battle.net status */}
                <div className="mt-4 border border-neutral-900 rounded-xl bg-black/40 px-3 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <p className="text-xs font-semibold text-neutral-200">
                        Battle.net link
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Optional. Used for Retail characters and future
                        features.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push("/link/bnet")}
                      className="text-[11px] px-3 py-1 rounded-full border border-neutral-800 bg-black/40 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="text-xs text-neutral-400 flex items-center gap-2">
                    {bnetLinked ? (
                      <>
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                        Connected
                        {bnetCharsCount != null && bnetCharsCount > 0 && (
                          <span className="text-neutral-500">
                            ({bnetCharsCount} Retail characters imported)
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="inline-block h-2 w-2 rounded-full bg-neutral-600" />
                        Not linked yet. You can still use Astrum for TBC
                        Classic without this.
                      </>
                    )}
                  </div>
                </div>

                {/* Classic main section */}
                <div className="mt-4 border-t border-neutral-900 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-semibold text-neutral-200">
                        Classic main (TBC / Classic identity)
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        This is the character Astrum shows when someone
                        inspects your profile. Later it becomes
                        &ldquo;60 Horde Orc Warrior - Pagle&rdquo; style
                        info under your name.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">
                        Character name
                      </label>
                      <input
                        className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none text-sm text-neutral-50 focus:border-sky-500/80"
                        value={classicName}
                        onChange={(e) => setClassicName(e.target.value)}
                        placeholder="Mvp"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">
                        Realm
                      </label>
                      <select
                        className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none text-sm text-neutral-50 focus:border-sky-500/80"
                        value={classicRealm}
                        onChange={(e) => setClassicRealm(e.target.value)}
                      >
                        <option value="">Select realm…</option>
                        <optgroup label="Anniversary">
                          {ANNIVERSARY_REALMS.map((realm) => (
                            <option key={`anniv-${realm}`} value={realm}>
                              {realm}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="MoP">
                          {MOP_REALMS.map((realm) => (
                            <option key={`mop-${realm}`} value={realm}>
                              {realm}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Era">
                          {ERA_REALMS.map((realm) => (
                            <option key={`era-${realm}`} value={realm}>
                              {realm}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">
                        Region
                      </label>
                      <select
                        className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none text-sm text-neutral-50 focus:border-sky-500/80"
                        value={classicRegion}
                        onChange={(e) => setClassicRegion(e.target.value)}
                      >
                        <option value="US">US</option>
                        <option value="EU">EU</option>
                        <option value="KR">KR</option>
                        <option value="TW">TW</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">
                        Faction
                      </label>
                      <select
                        className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none text-sm text-neutral-50 focus:border-sky-500/80"
                        value={classicFaction}
                        onChange={(e) =>
                          setClassicFaction(
                            e.target.value as "Alliance" | "Horde" | ""
                          )
                        }
                      >
                        <option value="">Select faction…</option>
                        <option value="Alliance">Alliance</option>
                        <option value="Horde">Horde</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">
                        Race
                      </label>
                      <select
                        className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none text-sm text-neutral-50 focus:border-sky-500/80"
                        value={classicRace}
                        onChange={(e) => setClassicRace(e.target.value)}
                      >
                        <option value="">Select race…</option>
                        {RACE_OPTIONS.map((race) => (
                          <option key={race} value={race}>
                            {race}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">
                        Class
                      </label>
                      <select
                        className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none text-sm text-neutral-50 focus:border-sky-500/80"
                        value={classicClass}
                        onChange={(e) => setClassicClass(e.target.value)}
                      >
                        <option value="">Select class…</option>
                        {CLASS_OPTIONS.map((cls) => (
                          <option key={cls} value={cls}>
                            {cls}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">
                        Level (optional)
                      </label>
                      <input
                        className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none text-sm text-neutral-50 focus:border-sky-500/80"
                        value={classicLevel}
                        onChange={(e) => setClassicLevel(e.target.value)}
                        placeholder="70"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

