// components/ChannelSidebar.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { DEFAULT_CHANNELS, ChannelSlug } from "@/lib/constants";

type ChannelRow = {
  slug: ChannelSlug;        // e.g. 'global' | 'trade' | 'lfg' | 'guild'
  label: string;            // e.g. 'Global'
  sort_order: number | null;
};

export default function ChannelSidebar() {
  const pathname = usePathname();
  const [channels, setChannels] = useState<ChannelRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      // v_channels should expose slug, label, sort_order
      const { data, error } = await supabase
        .from("v_channels")
        .select("slug,label,sort_order")
        .order("sort_order", { ascending: true });

      if (!cancelled) {
        if (error) {
          console.warn("v_channels fetch error:", error);
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
      return DEFAULT_CHANNELS.map((c, i) => ({
        slug: c.slug as ChannelSlug,
        label: c.label,
        sort_order: i,
      }));
    }
    // Filter to only supported slugs + stable order
    return channels
      .filter((c) => DEFAULT_CHANNELS.some(d => d.slug === c.slug))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [channels, loading]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-4 border-b border-neutral-800">
        <div className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
          Channels
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 text-sm text-neutral-400">Loading…</div>
        ) : (
          <ul className="py-2">
            {rows.map((ch) => {
              const href = `/crossroads/${ch.slug}`;
              const active = pathname?.startsWith(href);
              return (
                <li key={ch.slug}>
                  <Link
                    href={href}
                    className={[
                      "block px-3 py-2 text-sm",
                      "transition-colors",
                      active
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-300 hover:text-white hover:bg-neutral-900",
                    ].join(" ")}
                  >
                    {/* Show label (e.g. Global / Trade / LFG / Guild) */}
                    {ch.label}
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-neutral-500">
                      /{ch.slug}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="p-3 border-t border-neutral-800 text-xs text-neutral-500">
        Astrum Crossroads
      </div>
    </div>
  );
}
