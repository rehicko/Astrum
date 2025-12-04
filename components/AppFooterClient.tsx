// components/AppFooterClient.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppFooterClient({ year }: { year: number }) {
  const pathname = usePathname();

  // Hide footer on Crossroads/chat views so it doesn't sit in the middle
  const hideFooterOnCrossroads = pathname.startsWith("/crossroads");

  if (hideFooterOnCrossroads) {
    return null;
  }

  return (
    <footer className="relative w-full border-t border-white/10 bg-black/90">
      {/* Subtle Astrum glow */}
      <div className="pointer-events-none absolute -inset-x-24 -top-16 -z-10 h-32 bg-[radial-gradient(circle_at_32%_24%,_rgba(16,185,129,0.06),_transparent_70%),radial-gradient(circle_at_78%_110%,_rgba(16,185,129,0.04),_transparent_82%)]" />

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-[11px] text-white/55 md:px-6">
        {/* Top row: brand + status pill */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <span className="tracking-wide text-white/70">
            © {year} Astrum. All rights reserved.
          </span>

          <Link
            href="/download"
            className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-200/80 transition-colors hover:border-emerald-400/40 hover:bg-emerald-400/10 md:self-auto"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            <span>Alpha build</span>
            <span className="text-white/45">·</span>
            <span className="text-white/55">Live social layer for games</span>
          </Link>
        </div>

        {/* Middle row: contact grid */}
        <address className="not-italic grid gap-2 text-[11px] text-white/55 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <div className="space-y-0.5">
            <div className="font-medium text-white/75">Support</div>
            <a
              href="mailto:support@astrum.gg"
              className="block text-white/65 hover:text-emerald-300 hover:underline"
            >
              support@astrum.gg
            </a>
          </div>

          <div className="space-y-0.5">
            <div className="font-medium text-white/75">
              Feature &amp; channel requests
            </div>
            <a
              href="mailto:request@astrum.gg"
              className="block text-white/65 hover:text-emerald-300 hover:underline"
            >
              request@astrum.gg
            </a>
          </div>

          <div className="space-y-0.5">
            <div className="font-medium text-white/75">Security &amp; abuse</div>
            <a
              href="mailto:security@astrum.gg"
              className="block text-white/65 hover:text-emerald-300 hover:underline"
            >
              security@astrum.gg
            </a>
            <a
              href="mailto:abuse@astrum.gg"
              className="block text-white/65 hover:text-emerald-300 hover:underline"
            >
              abuse@astrum.gg
            </a>
          </div>

          <div className="space-y-0.5">
            <div className="font-medium text-white/75">Partnerships</div>
            <a
              href="mailto:partners@astrum.gg"
              className="block text-white/65 hover:text-emerald-300 hover:underline"
            >
              partners@astrum.gg
            </a>
            <div className="pt-1 text-white/45">
              <span className="font-medium text-white/70">Legal</span>{" "}
              <a
                href="mailto:legal@astrum.gg"
                className="text-white/65 hover:text-emerald-300 hover:underline"
              >
                legal@astrum.gg
              </a>
            </div>
          </div>
        </address>

        {/* Bottom row: tiny disclaimer */}
        <div className="text-[10px] text-white/40">
          Astrum is an independent social layer and is not affiliated with or
          endorsed by any game or publisher. Always use Astrum in line with the
          terms of service of the games you play.
        </div>
      </div>
    </footer>
  );
}
