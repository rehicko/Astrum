// app/crossroads/[channel]/page.tsx
import Chat from "@/components/Chat";
import { SUPPORTED_CHANNELS } from "@/lib/constants";

type Props = { params: { channel: string } };

export default function ChannelPage({ params }: Props) {
  const slug = (params.channel ?? "").toLowerCase();

  // Guard: if the slug isn’t one of our allowed channels, fall back to global
  const channel = SUPPORTED_CHANNELS.includes(slug as any) ? slug : "global";

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-neutral-800 p-3">
        <h1 className="text-sm tracking-wide text-neutral-300">
          /crossroads/<span className="text-white font-medium">{channel}</span>
        </h1>
      </div>

      {/* Chat for this channel */}
      <Chat channel={channel} />
    </div>
  );
}
