// app/profile/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

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
  created_at: string | null;
  // Rank fields
  xp: number | null;
  level: number | null;
  highest_title: string | null;
  display_title: string | null;
  show_title: boolean | null;
};

type FeedMessage = {
  id: string;
  channel: string;
  content: string;
  created_at: string;
};

type TabKey = "overview" | "messages" | "about";

function formatJoinDate(created_at: string | null) {
  if (!created_at) return null;
  const d = new Date(created_at);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFullTimestamp(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleString();
}

// Single source of truth for how titles are shown everywhere
function getDisplayTitle(profile: Profile | null): string | null {
  if (!profile) return null;
  if (profile.show_title === false) return null;

  const explicit =
    profile.display_title && profile.display_title.trim().length > 0
      ? profile.display_title.trim()
      : null;

  const highest =
    profile.highest_title && profile.highest_title.trim().length > 0
      ? profile.highest_title.trim()
      : null;

  return explicit ?? highest ?? null;
}

export default function PublicProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const userId = (params?.id as string) || "";

  const [tab, setTab] = useState<TabKey>("overview");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Sync tab with ?section=
  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "messages" || section === "about") {
      setTab(section);
    } else {
      setTab("overview");
    }
  }, [searchParams]);

  // Click handler to change tab + URL
  const handleTabChange = (next: TabKey) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (next === "overview") {
      sp.delete("section");
    } else {
      sp.set("section", next);
    }
    router.push(`/profile/${userId}?${sp.toString()}`, { scroll: false });
  };

  // Load profile
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    setLoadingProfile(true);
    setError(null);

    (async () => {
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
          created_at,
          xp,
          level,
          highest_title,
          display_title,
          show_title
        `
        )
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("public profile load error:", error);
        setError("Failed to load profile.");
        setProfile(null);
      } else if (!data) {
        setError("Traveler not found.");
        setProfile(null);
      } else {
        setProfile(data as Profile);
      }

      setLoadingProfile(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  // Load recent messages (last 50)
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    setLoadingMessages(true);

    (async () => {
      const { data, error } = await supabase
        .from("message_feed")
        .select("id, channel, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelled) return;

      if (error) {
        console.error("public profile messages error:", error);
        setMessages([]);
      } else {
        setMessages((data ?? []) as FeedMessage[]);
      }

      setLoadingMessages(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  const joinDate = formatJoinDate(profile?.created_at ?? null);

  const classicPrimaryLine =
    profile?.classic_name &&
    [
      profile.classic_name,
      "—",
      profile.classic_level ? String(profile.classic_level) : null,
      profile.classic_race,
      profile.classic_class,
    ]
      .filter(Boolean)
      .join(" ");

  const classicRealmLine =
    profile?.classic_realm || profile?.classic_region
      ? [
          profile?.classic_realm,
          profile?.classic_region ? `(${profile.classic_region})` : null,
        ]
          .filter(Boolean)
          .join(" ")
      : null;

  const titleName =
    profile?.display_name && profile.display_name.trim().length > 0
      ? profile.display_name
      : "Traveler";

  const effectiveTitle = getDisplayTitle(profile);
  const level = profile?.level ?? null;
  const xp = profile?.xp ?? null;

  return (
    // NOTE: no min-h-screen here so we don't fight the global layout/footer
    <div className="flex-1 bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 border-b border-neutral-900 pb-6">
          <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-neutral-500">
            Astrum Profile
          </p>
          <h1 className="text-2xl font-semibold text-neutral-50">
            {loadingProfile ? "Loading…" : titleName}
          </h1>

          {/* Rank line */}
          {profile && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-neutral-400">
              {typeof level === "number" && (
                <span className="text-neutral-300">Level {level}</span>
              )}
              {effectiveTitle && (
                <>
                  <span className="text-neutral-700">•</span>
                  <span className="text-neutral-100">
                    {effectiveTitle}
                  </span>
                </>
              )}
              {typeof xp === "number" && (
                <>
                  <span className="text-neutral-700">•</span>
                  <span className="text-[11px] text-neutral-500">
                    {xp} XP
                  </span>
                </>
              )}
            </div>
          )}

          {profile && (
            <div className="mt-3 space-y-1 text-sm text-neutral-300">
              {classicPrimaryLine ? (
                <p className="text-neutral-200">{classicPrimaryLine}</p>
              ) : (
                <p className="text-[13px] text-neutral-500">
                  This traveler hasn&apos;t set a Classic main yet.
                </p>
              )}
              {classicRealmLine && (
                <p className="text-[13px] text-neutral-400">
                  {classicRealmLine}
                </p>
              )}
              {joinDate && (
                <p className="text-[12px] text-neutral-500">
                  Joined Astrum: {joinDate}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Error / not found */}
        {error && !loadingProfile && (
          <div className="mb-8 text-sm text-red-400">{error}</div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex border-b border-neutral-900 text-[12px]">
          {(
            [
              ["overview", "Overview"],
              ["messages", "Recent Messages"],
              ["about", "About"],
            ] as [TabKey, string][]
          ).map(([key, label]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
                className={`mr-6 pb-2 border-b-2 ${
                  active
                    ? "border-emerald-400 text-neutral-50"
                    : "border-transparent text-neutral-500 hover:text-neutral-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="space-y-6">
          {/* Overview */}
          {tab === "overview" && (
            <div className="rounded-2xl border border-neutral-900 bg-neutral-950/80 px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
              {loadingProfile ? (
                <p className="text-sm text-neutral-400">
                  Loading profile…
                </p>
              ) : !profile ? (
                <p className="text-sm text-neutral-400">
                  No profile data available.
                </p>
              ) : (
                <div className="space-y-4 text-sm">
                  {/* Astrum Rank */}
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                      Astrum Rank
                    </p>
                    {typeof level === "number" ||
                    effectiveTitle ||
                    typeof xp === "number" ? (
                      <div className="space-y-1 text-[13px]">
                        <p className="text-neutral-100">
                          {typeof level === "number" && (
                            <span>Level {level}</span>
                          )}
                          {effectiveTitle && (
                            <>
                              {typeof level === "number" && " • "}
                              <span>{effectiveTitle}</span>
                            </>
                          )}
                        </p>
                        {typeof xp === "number" && (
                          <p className="text-[12px] text-neutral-500">
                            {xp} XP earned in Astrum
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[13px] text-neutral-500">
                        This traveler hasn&apos;t earned a rank yet.
                      </p>
                    )}
                  </div>

                  {/* Classic main */}
                  <div className="border-t border-neutral-900 pt-3">
                    <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                      Classic Main
                    </p>
                    {classicPrimaryLine ? (
                      <>
                        <p className="text-neutral-100">
                          {classicPrimaryLine}
                        </p>
                        {classicRealmLine && (
                          <p className="text-[13px] text-neutral-400">
                            {classicRealmLine}
                          </p>
                        )}
                        {profile.classic_faction && (
                          <p className="mt-1 text-[11px] text-neutral-500">
                            Faction: {profile.classic_faction}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[13px] text-neutral-500">
                        No Classic main set yet.
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="border-t border-neutral-900 pt-3">
                    <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                      Status
                    </p>
                    <p className="text-[13px] text-neutral-400">
                      Friends and whispers are coming in Astrum v0.2.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Messages */}
          {tab === "messages" && (
            <div className="rounded-2xl border border-neutral-900 bg-neutral-950/80 px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
              <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                Recent Messages (last 50)
              </p>
              {loadingMessages ? (
                <p className="text-sm text-neutral-400">
                  Loading messages…
                </p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  This traveler hasn&apos;t spoken in Astrum yet.
                </p>
              ) : (
                <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-3 text-sm leading-relaxed"
                    >
                      <span
                        className="mt-0.5 w-20 shrink-0 text-right text-[11px] text-neutral-500"
                        title={formatFullTimestamp(m.created_at)}
                      >
                        {formatTime(m.created_at)}
                      </span>
                      <div className="flex-1">
                        <span className="mr-2 text-[11px] uppercase tracking-[0.16em] text-emerald-400/80">
                          {m.channel === "global" ? "Global" : m.channel}
                        </span>
                        <span className="text-neutral-200 break-words">
                          {m.content}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* About */}
          {tab === "about" && (
            <div className="rounded-2xl border border-neutral-900 bg-neutral-950/80 px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
              <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                About
              </p>
              {loadingProfile ? (
                <p className="text-sm text-neutral-400">
                  Loading profile…
                </p>
              ) : !profile ? (
                <p className="text-sm text-neutral-400">
                  No profile data available.
                </p>
              ) : (
                <div className="space-y-3 text-sm text-neutral-200">
                  {profile.bio && profile.bio.trim().length > 0 ? (
                    <p className="whitespace-pre-line">{profile.bio}</p>
                  ) : (
                    <p className="text-[13px] text-neutral-500">
                      This traveler hasn&apos;t written a bio yet.
                    </p>
                  )}
                  {joinDate && (
                    <p className="text-[12px] text-neutral-500">
                      Joined Astrum: {joinDate}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
