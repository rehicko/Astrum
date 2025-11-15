// app/crossroads/layout.tsx
import type { ReactNode } from "react";
import ChannelSidebar from "@/components/ChannelSidebar";

export default function CrossroadsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-black text-white">
      {/* Left sidebar: channels only */}
      <ChannelSidebar />

      {/* Main content area – the global sticky header lives above this */}
      <div className="flex flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
