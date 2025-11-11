// app/crossroads/layout.tsx
import type { ReactNode } from "react";
import ChannelSidebar from "@/components/ChannelSidebar";

export default function CrossroadsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-[100dvh] w-full grid grid-cols-12 bg-neutral-950 text-neutral-100">
      {/* Sidebar */}
      <aside className="col-span-3 md:col-span-2 lg:col-span-2 border-r border-neutral-800">
        <ChannelSidebar />
      </aside>

      {/* Main */}
      <main className="col-span-9 md:col-span-10 lg:col-span-10 flex flex-col">
        {children}
      </main>
    </div>
  );
}
