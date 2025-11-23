// components/ChannelSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type ChannelItem = {
  slug: string; // e.g. "global"
  href: string; // e.g. "/crossroads/global"
  label: string; // e.g. "Crossroads"
  code?: string; // e.g. "/GLOBAL" (optional, hidden if not set)
  comingSoon?: boolean;
};

type GameCategory = {
  id: string; // e.g. "wow"
  label: string; // e.g. "World of Warcraft"
  badge?: string; // e.g. "LIVE"
  channels: ChannelItem[];
};

// Single source of truth for games + channels
const CATEGORIES: GameCategory[] = [
  {
    id: "wow",
    label: "World of Warcraft",
    badge: "LIVE",
    channels: [
      {
        slug: "global",
        href: "/crossroads/global",
        label: "Crossroads",
        // no code -> users only see "Crossroads"
      },
      // Future examples (keep commented until we wire routes):
      // {
      //   slug: "retail",
      //   href: "/crossroads/retail",
      //   label: "Retail chat",
      //   code: "/RETAIL",
      //   comingSoon: true,
      // },
      // {
      //   slug: "classic",
      //   href: "/crossroads/classic",
      //   label: "Classic chat",
      //   code: "/CLASSIC",
      //   comingSoon: true,
      // },
      // {
      //   slug: "maintenance",
      //   href: "/crossroads/maintenance",
      //   label: "Maintenance",
      //   code: "/MAINT",
      //   comingSoon: true,
      // },
    ],
  },
];

function findCategoryForPath(pathname: string | null): string | null {
  if (!pathname) return null;
  for (const cat of CATEGORIES) {
    for (const ch of cat.channels) {
      if (ch.href === pathname) return cat.id;
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

  // Keep category in sync if user navigates directly to another game’s channel
  useEffect(() => {
    const matched = findCategoryForPath(pathname);
    if (matched && matched !== activeCategoryId) {
      setActiveCategoryId(matched);
    }
  }, [pathname, activeCategoryId]);

  const activeCategory =
    CATEGORIES.find((c) => c.id === activeCategoryId) ?? CATEGORIES[0];

  const activeSlug =
    pathname && pathname.startsWith("/crossroads/")
      ? pathname.split("/")[2] || null
      : null;

  return (
    <aside className="hidden h-full w-56 flex-shrink-0 flex-col border-r border-neutral-900 bg-black/95 text-xs text-neutral-300 md:flex">
      {/* GAME TABS */}
      <div className="px-4 pt-4 pb-1 text-[11px] font-semibold tracking-[0.22em] text-neutral-500">
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
      <nav className="px-2 pb-4 flex flex-col gap-1">
        {activeCategory.channels.map((ch) => {
          const isChannelActive = activeSlug === ch.slug;

          if (ch.comingSoon) {
            return (
              <div
                key={ch.slug}
                className="flex items-center justify-between rounded-md px-3 py-2 text-[11px] text-neutral-500 border border-dashed border-neutral-800/70 bg-black/40"
              >
                <span>{ch.label}</span>
                <span className="text-[10px] text-neutral-600">Soon</span>
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
                <span className="text-[10px] text-neutral-500">{ch.code}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Spacer for future stuff (account / filters) */}
      <div className="flex-1" />
    </aside>
  );
}
