// components/ChannelSidebar.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { DEFAULT_CHANNELS, type ChannelSlug } from "@/lib/constants";

type ChannelRow = {
  slug: ChannelSlug;        // e.g. 'global' | 'trade' | 'lfg' | 'guild'
  label: string;            // e.g. 'Global'
  sort_order: number | null;
};

export default function ChannelSidebar() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [channels, setChannels] = useState<ChannelRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // Expect a view `v_channels(slug, label, sort_order)`; if missing, we fall back
      const { data, error } = await supabase
        .from("v_channels")
        .select("slug,label,sort_order")
        .order("sort_order", { ascending: true });

      if (!cancelled) {
        if (error) {
          console.warn("v_channels fetch error:", error.message);
          setChannels(null);
        } else {
          setChannels((data ?? []) as ChannelRow[]);
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const rows: ChannelRow[] = useMemo(() => {
    if (loading) return [];
    if (!channels || channels.length === 0) {
      // Fallback to static constants
      return DEFAULT_CHANNELS.map((c, i) => ({
        slug: c.slug as ChannelSlug,
        label: c.label,
        sort_order: i,
      }));
    }
    // Only allow known slugs; keep stable order
    return channels
      .filter((c) => DEFAULT_CHANNELS.some((d) => d.slug === c.slug))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [channels, loading]);

  return (
    <div className="h-full flex flex-col">
      {/* Section: Channels */}
      <div className="px-3 py-2 text-xs tracking-wide text-neutral-500">
        CHANNELS
      </div>

      <nav className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 text-sm text-neutral-400">Loading…</div>
        ) : (
          <ul className="space-y-1 px-2">
            {rows.map((ch) => {
              const href = `/crossroads/${ch.slug}`;
              const active = pathname?.startsWith(href);
              return (
                <li key={ch.slug}>
                  <Link
                    href={href}
                    className={[
                      "block rounded-lg px-3 py-2 text-sm",
                      active
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-300 hover:text-white hover:bg-neutral-900",
                    ].join(" ")}
                  >
                    <span className="mr-2">{ch.label}</span>
                    <span className="text-neutral-500">/{ch.slug.toUpperCase()}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* Section: Account */}
      <div className="px-3 py-2 text-xs tracking-wide text-neutral-500">
        ACCOUNT
      </div>
      <div className="px-2 pb-3">
        <Link
          href="/settings/profile"
          className="block rounded-lg px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-900"
        >
          Profile
        </Link>
      </div>

      {/* Footer */}
      <div className="mt-auto p-3 border-t border-neutral-800 text-xs text-neutral-500">
        Astrum Crossroads
      </div>
    </div>
  );
}
