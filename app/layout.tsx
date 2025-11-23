// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { AppFooterClient } from "@/components/AppFooterClient";
import { ProfileCardProvider } from "@/components/ProfileCardProvider";
import { AppHeaderClient } from "@/components/AppHeaderClient";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Astrum Crossroads",
  description:
    "Astrum is a real-time social layer for games — live threads, crossrealm chat, and an overlay that follows you into game.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const year = new Date().getFullYear();

  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        <ProfileCardProvider>
          <div id="astrum-profile-card-root" />

          {/* App shell – header + scrollable main + footer */}
          <div className="flex min-h-screen flex-col">
            <AppHeaderClient />
            <main className="flex-1 min-h-0 flex flex-col">{children}</main>
            <AppFooterClient year={year} />
          </div>
        </ProfileCardProvider>
      </body>
    </html>
  );
}
