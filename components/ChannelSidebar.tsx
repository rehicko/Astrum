// components/ChannelSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type ChannelItem = {
  slug: string; // e.g. "global"
  href: string; // e.g. "/crossroads/global"
  label: string; // e.g. "Global"
  code?: string; // e.g. "/GLOBAL" (optional, hidden if not set)
  comingSoon?: boolean;
};

type ChannelGroup = {
  id: string; // e.g. "wow-main"
  label: string; // e.g. "World of Warcraft"
  channels: ChannelItem[];
};

type GameCategory = {
  id: string; // e.g. "wow"
  label: string; // e.g. "World of Warcraft"
  badge?: string; // e.g. "LIVE"
  groups: ChannelGroup[];
};

// Single source of truth for games + channel groups
const CATEGORIES: GameCategory[] = [
  {
    id: "wow",
    label: "World of Warcraft",
    badge: "LIVE",
    groups: [
      {
        id: "wow-main",
        label: "World of Warcraft",
        channels: [
          {
            slug: "global",
            href: "/crossroads/global",
            label: "Global",
          },
        ],
      },
      {
        id: "wow-classic",
        label: "WoW Classic",
        channels: [
          {
            slug: "wow-classic-global",
            href: "/crossroads/wow-classic-global",
            label: "Global",
            comingSoon: true,
          },
          {
            slug: "wow-classic-pvp",
            href: "/crossroads/wow-classic-pvp",
            label: "PvP",
            comingSoon: true,
          },
          {
            slug: "wow-classic-pve",
            href: "/crossroads/wow-classic-pve",
            label: "PvE",
            comingSoon: true,
          },
          {
            slug: "wow-classic-trade",
            href: "/crossroads/wow-classic-trade",
            label: "Trade",
            comingSoon: true,
          },
          {
            slug: "wow-classic-guild",
            href: "/crossroads/wow-classic-guild",
            label: "Guild",
            comingSoon: true,
          },
        ],
      },
      {
        id: "wow-retail",
        label: "WoW Retail",
        channels: [
          {
            slug: "wow-retail-global",
            href: "/crossroads/wow-retail-global",
            label: "Global",
            comingSoon: true,
          },
          {
            slug: "wow-retail-pvp",
            href: "/crossroads/wow-retail-pvp",
            label: "PvP",
            comingSoon: true,
          },
          {
            slug: "wow-retail-pve",
            href: "/crossroads/wow-retail-pve",
            label: "PvE",
            comingSoon: true,
          },
          {
            slug: "wow-retail-trade",
            href: "/crossroads/wow-retail-trade",
            label: "Trade",
            comingSoon: true,
          },
          {
            slug: "wow-retail-guild",
            href: "/crossroads/wow-retail-guild",
            label: "Guild",
            comingSoon: true,
          },
        ],
      },
    ],
  },
  {
    id: "league",
    label: "League of Legends",
    badge: "SOON",
    groups: [
      {
        id: "league-main",
        label: "League of Legends",
        channels: [
          {
            slug: "lol-global",
            href: "/crossroads/lol-global",
            label: "Global",
            comingSoon: true,
          },
          {
            slug: "lol-soloq",
            href: "/crossroads/lol-soloq",
            label: "SoloQ",
            comingSoon: true,
          },
          {
            slug: "lol-aram",
            href: "/crossroads/lol-aram",
            label: "ARAM",
            comingSoon: true,
          },
        ],
      },
    ],
  },
];

function findCategoryForPath(pathname: string | null): string | null {
  if (!pathname) return null;

  for (const cat of CATEGORIES) {
    for (const group of cat.groups) {
      for (const ch of group.channels) {
        if (ch.href === pathname) return cat.id;
      }
    }
  }

  return null;
}

export default function ChannelSidebar() {
  const pathname = usePathname();

  // Match category based on current URL (so tab follows route)
  const initialCategory =
    findCategoryForPath(pathname) ?? (CATEGORIES[0]?.id ?? null);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    initialCategory
  );

  // Track which channel groups are expanded within the active game
  const [openGroupIds, setOpenGroupIds] = useState<string[]>([]);

  // Keep category in sync if user navigates directly to another game’s channel
  useEffect(() => {
    const matched = findCategoryForPath(pathname);
    if (matched && matched !== activeCategoryId) {
      setActiveCategoryId(matched);
    }
  }, [pathname, activeCategoryId]);

  // When the active category or route changes, auto-open only the relevant group
  useEffect(() => {
    const category =
      CATEGORIES.find((c) => c.id === activeCategoryId) ?? CATEGORIES[0];

    const slug =
      pathname && pathname.startsWith("/crossroads/")
        ? pathname.split("/")[2] || null
        : null;

    const next: string[] = [];

    if (slug) {
      for (const group of category.groups) {
        if (group.channels.some((ch) => ch.slug === slug)) {
          next.push(group.id);
        }
      }
    }

    // Fallback: open the first group if nothing matched the route
    if (!next.length && category.groups[0]) {
      next.push(category.groups[0].id);
    }

    setOpenGroupIds(next);
  }, [activeCategoryId, pathname]);

  const activeCategory =
    CATEGORIES.find((c) => c.id === activeCategoryId) ?? CATEGORIES[0];

  const activeSlug =
    pathname && pathname.startsWith("/crossroads/")
      ? pathname.split("/")[2] || null
      : null;

  return (
    <aside className="hidden h-full w-56 flex-shrink-0 flex-col border-r border-neutral-900 bg-black/95 text-xs text-neutral-300 md:flex">
      {/* GAME TABS */}
      <div className="px-3 pt-4 pb-1 text-[11px] font-semibold tracking-[0.22em] text-neutral-500">
        GAMES
      </div>
      <nav className="px-2 pb-3 flex flex-col gap-1">
        {CATEGORIES.map((cat) => {
          const isActive = cat.id === activeCategory.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryId(cat.id)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-[11px] text-left transition-colors ${
                isActive
                  ? "bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-neutral-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>{cat.label}</span>
              {cat.badge && (
                <span className="text-[9px] uppercase tracking-[0.18em] text-emerald-400/80">
                  {cat.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* CHANNELS FOR ACTIVE GAME */}
      <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-600">
        Channels
      </div>

      <nav className="px-2 pb-4 flex flex-col gap-2 overflow-y-auto">
        {activeCategory.groups.map((group) => {
          const isGroupOpen = openGroupIds.includes(group.id);

          return (
            <div key={group.id}>
              {/* Group header is now clickable to toggle collapse */}
              <button
                type="button"
                onClick={() =>
                  setOpenGroupIds((prev) =>
                    prev.includes(group.id)
                      ? prev.filter((id) => id !== group.id)
                      : [...prev, group.id]
                  )
                }
                className="flex w-full items-center justify-between px-1 pb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-600 hover:text-neutral-300"
              >
                <span>{group.label}</span>
                <span className="text-[10px] text-neutral-600">
                  {isGroupOpen ? "−" : "+"}
                </span>
              </button>

              {isGroupOpen && (
                <div className="flex flex-col gap-1">
                  {group.channels.map((ch) => {
                    const isChannelActive = activeSlug === ch.slug;

                    if (ch.comingSoon) {
                      return (
                        <div
                          key={ch.slug}
                          className="flex items-center justify-between rounded-md px-3 py-2 text-[11px] text-neutral-500 border border-dashed border-neutral-800/70 bg-black/40"
                        >
                          <span>{ch.label}</span>
                          <span className="text-[10px] text-neutral-600">
                            Soon
                          </span>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={ch.slug}
                        href={ch.href}
                        className={`flex items-center justify-between rounded-md px-3 py-2 text-[11px] transition-colors ${
                          isChannelActive
                            ? "bg-white/8 text-white"
                            : "text-neutral-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span>{ch.label}</span>
                        {ch.code && (
                          <span className="text-[10px] text-neutral-500">
                            {ch.code}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Spacer for future stuff (account / filters) */}
      <div className="flex-1" />
    </aside>
  );
}
