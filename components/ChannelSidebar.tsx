// components/ChannelSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ChannelSidebar() {
  const pathname = usePathname();

  const isGlobal = pathname === "/crossroads/global";

  return (
    <aside className="hidden h-full w-56 flex-shrink-0 flex-col border-r border-neutral-900 bg-black/95 text-xs text-neutral-300 md:flex">
      {/* Section label */}
      <div className="px-4 pb-3 pt-4 text-[11px] font-semibold tracking-[0.22em] text-neutral-500">
        CHANNELS
      </div>

      {/* Global channel (only real channel for MVP) */}
      <nav className="flex flex-col gap-1 px-2 pb-4">
        <Link
          href="/crossroads/global"
          className={`flex items-center justify-between rounded-md px-3 py-2 text-[11px] transition-colors ${
            isGlobal
              ? "bg-white/8 text-white"
              : "text-neutral-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span>Global</span>
          <span className="text-[10px] text-neutral-500">/GLOBAL</span>
        </Link>
      </nav>

      {/* Spacer – no ACCOUNT or extra sections for now */}
      <div className="flex-1" />
    </aside>
  );
}
