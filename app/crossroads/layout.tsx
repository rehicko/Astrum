// app/crossroads/layout.tsx

import type { ReactNode } from "react";
import Link from "next/link";

import ChannelSidebar from "@/components/ChannelSidebar";
import SignOutButton from "@/components/SignOutButton";

export default function CrossroadsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="h-screen flex bg-black text-white">
      {/* Left sidebar: channels / navigation */}
      <ChannelSidebar />

      {/* Right side: header + main content */}
      <div className="flex flex-col flex-1">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
          <div className="text-sm font-semibold tracking-wide text-neutral-200">
            Astrum Crossroads
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/settings/profile"
              className="text-xs text-neutral-400 hover:text-white"
            >
              Profile
            </Link>
            <SignOutButton />
          </div>
        </header>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
