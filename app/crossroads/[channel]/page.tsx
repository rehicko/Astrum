// app/crossroads/[channel]/page.tsx
import Chat from "@/components/Chat";
import ChannelSidebar from "@/components/ChannelSidebar";
import { SUPPORTED_CHANNELS } from "@/lib/constants";

type Props = { params: Promise<{ channel: string }> };

export default async function ChannelPage({ params }: Props) {
  const { channel: raw } = await params;
  const slug = (raw ?? "").toLowerCase();

  const channel = (SUPPORTED_CHANNELS as readonly string[]).includes(slug)
    ? slug
    : "global";

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left: sidebar (fixed in place) */}
      <ChannelSidebar />

      {/* Right: chat (will handle its own internal scroll) */}
      <div className="flex-1 min-h-0 flex">
        <Chat channel={channel} />
      </div>
    </div>
  );
}
