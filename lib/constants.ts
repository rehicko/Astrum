// lib/constants.ts
export const SUPPORTED_CHANNELS = ["global", "trade", "lfg", "guild"] as const;
export type ChannelSlug = (typeof SUPPORTED_CHANNELS)[number];

export const DEFAULT_CHANNELS: { slug: ChannelSlug; label: string }[] = [
  { slug: "global", label: "Global" },
  { slug: "trade", label: "Trade" },
  { slug: "lfg", label: "LFG" },
  { slug: "guild", label: "Guild" },
];

// how many historical messages to load per channel
export const MAX_HISTORY = 200;
