// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";

import "./globals.css";
import { AppFooterClient } from "@/components/AppFooterClient";
import { HeaderAuth } from "@/components/HeaderAuth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Astrum Crossroads",
  description:
    "Astrum is a real-time social layer for games — live threads, crossrealm chat, and an overlay that follows you into game.",
};

function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="flex w-full items-center justify-between px-4 py-4 md:px-6">
        {/* Logo + brand */}
        <Link href="/crossroads/global" className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-cyan-400/70 bg-black">
            <div className="h-3 w-3 rounded-sm bg-cyan-400/80" />
          </div>
          <span className="text-xs font-semibold tracking-[0.35em] text-white/70">
            ASTRUM
          </span>
        </Link>

        {/* Nav + auth */}
        <nav className="flex items-center gap-6 text-[11px] font-medium text-white/55">
          <Link
            href="/crossroads/global"
            className="transition-colors hover:text-white"
          >
            Crossroads
          </Link>
          <Link
            href="/settings/profile"
            className="transition-colors hover:text-white"
          >
            Profile
          </Link>
          <Link href="/faq" className="transition-colors hover:text-white">
            FAQ
          </Link>

          {/* Sign in / Sign out */}
          <HeaderAuth />
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const year = new Date().getFullYear();

  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-black text-white antialiased`}
      >
        <div className="flex min-h-screen flex-col">
          <AppHeader />
          <main className="flex-1">{children}</main>
          <AppFooterClient year={year} />
        </div>
      </body>
    </html>
  );
}
