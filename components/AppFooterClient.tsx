// components/AppFooterClient.tsx
"use client";

import { usePathname } from "next/navigation";

export function AppFooterClient({ year }: { year: number }) {
  const pathname = usePathname();

  // Hide footer on Crossroads/chat views so it doesn't sit in the middle
  const hideFooterOnCrossroads = pathname.startsWith("/crossroads");

  if (hideFooterOnCrossroads) {
    return null;
  }

  return (
    <footer className="w-full border-t border-white/10 bg-black/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-[11px] text-white/40 md:flex-row md:items-center md:justify-between md:px-6">
        <span>© {year} Astrum. All rights reserved.</span>
        <span className="text-white/35">
          Alpha build · Expect bugs · Live social layer for games.
        </span>
      </div>
    </footer>
  );
}
