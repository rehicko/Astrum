// app/crossroads/[channel]/page.tsx
import Chat from "@/components/Chat";
import { SUPPORTED_CHANNELS } from "@/lib/constants";

// In Next 15, params is a Promise in server components.
type Props = { params: Promise<{ channel: string }> };

export default async function ChannelPage({ params }: Props) {
  const { channel: raw } = await params; // <- await params
  const slug = (raw ?? "").toLowerCase();

  const channel = (SUPPORTED_CHANNELS as readonly string[]).includes(slug)
    ? slug
    : "global";

  return (
    <div className="flex flex-col h-full">
      <Chat channel={channel} />
    </div>
  );
}
