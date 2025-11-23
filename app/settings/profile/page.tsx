// app/settings/profile/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { RequireAuthGate } from "@/components/RequireAuthGate";

// Anniversary realms
const ANNIVERSARY_REALMS = ["Dreamscythe", "Nightslayer", "Doomhowl"];

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

// WoW class colors (used for nameplates when enabled)
const CLASS_COLORS: Record<string, string> = {
  Warrior: "#C79C6E",
  Paladin: "#F58CBA",
  Hunter: "#ABD473",
  Rogue: "#FFF569",
  Priest: "#FFFFFF",
  Shaman: "#0070DE",
  Mage: "#69CCF0",
  Warlock: "#9482C9",
  Druid: "#FF7D0A",
};

// Title ladder
const TITLES: { id: string; label: string; minLevel: number }[] = [
  { id: "visitor", label: "Visitor", minLevel: 1 },
  { id: "regular", label: "Regular", minLevel: 2 },
  { id: "local", label: "Local", minLevel: 3 },
  { id: "pathfinder", label: "Pathfinder", minLevel: 4 },
  { id: "vanguard", label: "Vanguard", minLevel: 5 },
  { id: "veteran", label: "Veteran", minLevel: 6 },
  { id: "luminary", label: "Luminary", minLevel: 7 },
  { id: "architect", label: "Architect", minLevel: 8 },
  { id: "constellation", label: "Constellation", minLevel: 9 },
  { id: "astral-pioneer", label: "Astral Pioneer", minLevel: 10 },
];

// XP curve thresholds (must match your trigger / backend)
const XP_THRESHOLDS = [
  0, // L1 start
  50, // L2
  150, // L3
  350, // L4
  700, // L5
  1250, // L6
  2050, // L7
  3250, // L8
  5050, // L9
  7550, // L10 cap
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
  xp: number | null;
  level: number | null;
  highest_title: string | null;
  display_title: string | null;
  show_title: boolean | null;
  use_class_color: boolean | null;
};

type RankProgress = {
  level: number;
  xp: number;
  currentInLevel: number;
  neededForNext: number;
  progressPct: number;
  isMax: boolean;
};

function getLevelBounds(levelRaw: number | null) {
  let level = levelRaw ?? 1;
  if (level < 1) level = 1;
  if (level > 10) level = 10;

  const idx = level - 1;
  const startXp = XP_THRESHOLDS[idx] ?? 0;
  const endXp = level >= 10 ? null : XP_THRESHOLDS[idx + 1] ?? null;

  return { level, startXp, endXp };
}

function computeXpProgress(
  xpRaw: number | null,
  levelRaw: number | null
): RankProgress {
  const xp = xpRaw ?? 0;
  const { level, startXp, endXp } = getLevelBounds(levelRaw);

  if (endXp === null) {
    // Max level
    return {
      level,
      xp,
      currentInLevel: xp - startXp,
      neededForNext: 0,
      progressPct: 100,
      isMax: true,
    };
  }

  const span = endXp - startXp;
  const current = Math.max(0, Math.min(span, xp - startXp));
  const pct = span > 0 ? Math.round((current / span) * 100) : 0;

  return {
    level,
    xp,
    currentInLevel: current,
    neededForNext: span,
    progressPct: pct,
    isMax: false,
  };
}

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
  const [classicFaction, setClassicFaction] =
    useState<"" | "Alliance" | "Horde">("");
  const [classicClass, setClassicClass] = useState("");
  const [classicRace, setClassicRace] = useState("");
  const [classicLevel, setClassicLevel] = useState("");

  // Name color toggle
  const [useClassColor, setUseClassColor] = useState<boolean>(true);

  // Battle.net status
  const [bnetLinked, setBnetLinked] = useState(false);
  const [bnetCharsCount, setBnetCharsCount] = useState<number | null>(null);

  // Rank + title UI state
  const [selectedTitle, setSelectedTitle] = useState<"none" | string>("none");
  const [showTitleState, setShowTitleState] = useState<boolean>(true);

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

      // Try to load existing profile, including classic + rank fields
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          id,
          display_name,
          bio,
          classic_name,
          classic_realm,
          classic_region,
          classic_faction,
          classic_class,
          classic_race,
          classic_level,
          xp,
          level,
          highest_title,
          display_title,
          show_title,
          use_class_color
        `
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
            `
            id,
            display_name,
            bio,
            classic_name,
            classic_realm,
            classic_region,
            classic_faction,
            classic_class,
            classic_race,
            classic_level,
            xp,
            level,
            highest_title,
            display_title,
            show_title,
            use_class_color
          `
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

      // hydrate name-color toggle
      setUseClassColor(
        typeof prof.use_class_color === "boolean" ? prof.use_class_color : true
      );

      // hydrate title selector from display_title
      const effectiveDisplay =
        prof.display_title && prof.display_title.trim().length > 0
          ? prof.display_title.trim()
          : null;

      const matched = TITLES.find(
        (t) =>
          effectiveDisplay &&
          t.label.toLowerCase() === effectiveDisplay.toLowerCase()
      );

      setSelectedTitle(matched ? matched.id : "none");
      setShowTitleState(
        typeof prof.show_title === "boolean" ? prof.show_title : true
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
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  const rank = computeXpProgress(profile?.xp ?? 0, profile?.level ?? 1);

  const unlockedTitles = useMemo(() => {
    return TITLES.filter((t) => rank.level >= t.minLevel);
  }, [rank.level]);

  const selectedTitleLabel = useMemo(() => {
    if (!showTitleState) return null;
    if (selectedTitle === "none") return null;
    const found = TITLES.find((t) => t.id === selectedTitle);
    return found?.label ?? null;
  }, [selectedTitle, showTitleState]);

  // Name color preview chip
  const nameColorPreview = useMemo(() => {
    const fallback = "#22c55e"; // Astrum green fallback
    if (useClassColor && classicClass) {
      return CLASS_COLORS[classicClass] ?? fallback;
    }
    return fallback;
  }, [useClassColor, classicClass]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setSaved(false);
    setError(null);

    const levelNumber =
      classicLevel.trim() === "" ? null : Number.parseInt(classicLevel, 10);

    // map selectedTitle -> label (stored in display_title)
    let displayTitleValue: string | null = null;
    if (selectedTitle !== "none") {
      const found = TITLES.find((t) => t.id === selectedTitle);
      displayTitleValue = found ? found.label : null;
    }

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
        display_title: displayTitleValue,
        show_title: showTitleState,
        use_class_color: useClassColor,
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

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            display_name: displayName.trim() || null,
            bio: bio.trim() || null,
            classic_name: classicName.trim() || null,
            classic_realm: classicRealm.trim() || null,
            classic_region: classicRegion.trim() || null,
            classic_faction: classicFaction || null,
            classic_class: classicClass.trim() || null,
            classic_race: classicRace.trim() || null,
            classic_level: Number.isNaN(levelNumber) ? null : levelNumber,
            display_title: displayTitleValue,
            show_title: showTitleState,
            use_class_color: useClassColor,
          }
        : prev
    );

    // fade out "Saved." message after a bit
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <RequireAuthGate>
      <div className="bg-black text-white flex justify-center px-4 py-8">
        <div className="w-full max-w-xl rounded-3xl border border-neutral-900 bg-neutral-950/90 shadow-[0_24px_80px_rgba(0,0,0,0.9)] relative overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-neutral-900">
            <div>
              <h1 className="text-lg font-semibold text-neutral-50">Profile</h1>
              <p className="text-xs text-neutral-400">
                Set how your name appears in chat, overlays, and link your
                Classic main.
              </p>
            </div>
          </div>

          {/* Main content */}
          <div className="px-6 py-5 space-y-6">
            {loading ? (
              <div className="text-sm text-neutral-400">Loading profile…</div>
            ) : error ? (
              <div className="text-sm text-red-400">{error}</div>
            ) : (
              <>
                {/* Astrum Rank + XP (top section) */}
                {profile && (
                  <section className="rounded-2xl border border-emerald-500/40 bg-black/80 shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden mb-4">
                    {/* Neon strip */}
                    <div className="h-[2px] w-full bg-gradient-to-r from-violet-500 via-emerald-400 to-emerald-300" />

                    <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400 mb-1">
                          Astrum Rank
                        </p>
                        <p className="text-sm font-semibold text-neutral-50">
                          {profile.display_name || "Traveler"}
                        </p>
                        {selectedTitleLabel && (
                          <p className="text-[12px] text-neutral-300 mt-0.5">
                            {selectedTitleLabel}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-neutral-500">
                        {rank.isMax ? (
                          <span>Max level reached</span>
                        ) : (
                          <span>
                            {rank.currentInLevel} / {rank.neededForNext} XP{" "}
                            <span className="text-neutral-600">
                              to Level {rank.level + 1}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* XP bar */}
                    <div className="px-4 pb-3">
                      <div className="h-1.5 rounded-full bg-neutral-950 border border-emerald-900/60 overflow-hidden shadow-[0_0_14px_rgba(52,211,153,0.35)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-emerald-400 to-emerald-300 transition-[width] duration-500 ease-out shadow-[0_0_18px_rgba(168,85,247,0.7)]"
                          style={{ width: `${rank.progressPct}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[12px] text-neutral-300">
                        Level {rank.level}
                        <span className="text-neutral-700"> • </span>
                        {rank.xp} XP
                      </p>
                    </div>

                    {/* Title selector, right below XP bar */}
                    <div className="px-4 pt-2 pb-4 border-t border-neutral-900 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400 mb-1">
                            Title
                          </p>
                          <p className="text-[12px] text-neutral-300">
                            Choose how your rank label appears next to your
                            name.
                          </p>
                        </div>
                        <label className="flex items-center gap-2 text-[11px] text-neutral-400">
                          <input
                            type="checkbox"
                            checked={showTitleState}
                            onChange={(e) =>
                              setShowTitleState(e.target.checked)
                            }
                            className="h-3 w-3 rounded border-neutral-600 bg-black"
                          />
                          Show title
                        </label>
                      </div>

                      {unlockedTitles.length === 0 ? (
                        <p className="text-[12px] text-neutral-500">
                          Earn XP in chat to unlock your first title.
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {/* No title */}
                          <button
                            type="button"
                            onClick={() => setSelectedTitle("none")}
                            className={`w-full text-left px-3 py-2 rounded-lg border text-[12px] transition-colors ${
                              selectedTitle === "none"
                                ? "border-emerald-500/70 bg-emerald-500/10 text-neutral-50"
                                : "border-neutral-800 bg-neutral-950 hover:border-neutral-700 text-neutral-300"
                            }`}
                          >
                            <span className="font-medium">No title</span>
                            <span className="ml-2 text-[11px] text-neutral-500">
                              (show only your name)
                            </span>
                          </button>

                          {unlockedTitles.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setSelectedTitle(t.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg border text-[12px] transition-colors ${
                                selectedTitle === t.id
                                  ? "border-emerald-500/70 bg-emerald-500/10 text-neutral-50"
                                  : "border-neutral-800 bg-neutral-950 hover:border-neutral-700 text-neutral-300"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{t.label}</span>
                                <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                                  Level {t.minLevel}+
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      <p className="text-[11px] text-neutral-500 pt-1">
                        Titles are cosmetic only. Rank shows how present you are
                        in Astrum, not how powerful you are.
                      </p>
                    </div>
                  </section>
                )}

                {/* Basic profile form */}
                <form onSubmit={handleSave} className="space-y-5 text-sm">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5">
                      Display name
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2.5 outline-none text-sm text-neutral-50 focus:border-emerald-400/80"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={40}
                      placeholder="Ajay, Rehicko, etc."
                    />
                    <p className="mt-1 text-[11px] text-neutral-500">
                      This is what other players see next to your messages.
                    </p>

                    {/* Name color toggle + preview */}
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-950 border border-neutral-900 px-3 py-2.5">
                      <div>
                        <p className="text-[11px] text-neutral-400">
                          Name color in chat
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          When enabled, your main class color is used for your
                          name. Otherwise Astrum uses the default green.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className="h-6 px-3 rounded-full flex items-center text-[11px] font-medium shadow-[0_0_14px_rgba(0,0,0,0.6)]"
                          style={{
                            backgroundColor: nameColorPreview,
                            color:
                              nameColorPreview === "#FFFFFF" ||
                              nameColorPreview === "#FFF569"
                                ? "#000000"
                                : "#020617",
                          }}
                        >
                          {displayName.trim() || "Your name"}
                        </div>
                        <label className="inline-flex items-center gap-2 text-[11px] text-neutral-400">
                          <input
                            type="checkbox"
                            checked={useClassColor}
                            onChange={(e) => setUseClassColor(e.target.checked)}
                            className="h-3 w-3 rounded border-neutral-600 bg-black"
                          />
                          Class color
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5">
                      About (optional)
                    </label>
                    <textarea
                      className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2.5 outline-none text-sm text-neutral-50 focus:border-emerald-400/80 resize-none"
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={240}
                      placeholder="Class, role, main game, or a short line about you."
                    />
                    <p className="mt-1 text-[11px] text-neutral-500">
                      Used on your profile and in future overlays when someone
                      inspects you.
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
                          inspects your profile. Later it becomes &ldquo;60
                          Horde Orc Warrior - Pagle&rdquo; style info under your
                          name.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1">
                          Character name
                        </label>
                        <input
                          className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none text-sm text-neutral-50 focus:border-emerald-400/80"
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
                          className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none text-sm text-neutral-50 focus:border-emerald-400/80"
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
                          className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none text-sm text-neutral-50 focus:border-emerald-400/80"
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
                          className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none text-sm text-neutral-50 focus:border-emerald-400/80"
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
                          className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none text-sm text-neutral-50 focus:border-emerald-400/80"
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
                          className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none text-sm text-neutral-50 focus:border-emerald-400/80"
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
                          className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 outline-none text-sm text-neutral-50 focus:border-emerald-400/80"
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
                      <span className="text-xs text-neutral-400">Saved.</span>
                    )}
                    {error && (
                      <span className="text-xs text-red-400">{error}</span>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </RequireAuthGate>
  );
}
