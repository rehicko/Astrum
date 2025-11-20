// components/Chat.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabaseClient";
import { ensureUniqueById } from "@/lib/dedupe";
import { MAX_HISTORY } from "@/lib/constants";
import { UsernameMenu } from "@/components/UsernameMenu";

type FeedMessage = {
  id: string;
  user_id: string | null;
  channel: string;
  content: string;
  created_at: string;
  display_name: string | null;
  classic_name: string | null;
  classic_realm: string | null;
  classic_region: string | null;
  classic_faction: string | null;
  classic_class: string | null;
  classic_race: string | null;
  classic_level: number | null;
  joined_at: string | null;
  class_color_hex: string | null;
  use_class_color: boolean | null;
  optimistic?: boolean;
  status?: "pending" | "failed" | "sent";
};

type Props = { channel: string };

type RankSummary = {
  level: number;
  xp: number;
  displayTitle: string | null;
  showTitle: boolean;
};

// 🔢 Max messages kept in memory per channel (5k-prep knob)
const MAX_IN_MEMORY = MAX_HISTORY;

// px from bottom that counts as "at bottom" for auto-follow
const BOTTOM_THRESHOLD = 80;

// px from bottom that counts as "close enough" to snap on *send*
const SEND_SNAP_THRESHOLD = 180;

// WoW-style class colors (TBC / classic)
const CLASS_COLOR_MAP: Record<string, string> = {
  Warrior: "#C79C6E",
  Paladin: "#F58CBA",
  Hunter: "#ABD473",
  Rogue: "#FFF569",
  Priest: "#FFFFFF",
  Shaman: "#0070DE",
  Mage: "#40C7EB",
  Warlock: "#8787ED",
  Druid: "#FF7D0A",
};

// ------ Time helpers ------

function formatTime(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFullTimestamp(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleString();
}

function getDayKey(dateString: string) {
  const d = new Date(dateString);
  return d.toDateString(); // stable day key (Mon Nov 15 2025)
}

function getDayLabel(dateString: string) {
  const d = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Chat({ channel }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [userPresent, setUserPresent] = useState(false);
  const [errText, setErrText] = useState<string | null>(null);

  const [rank, setRank] = useState<RankSummary | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [atBottom, setAtBottom] = useState(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const realtimeRef = useRef<RealtimeChannel | null>(null);
  const lastDistanceFromBottomRef = useRef(0);

  // Scroll to bottom helper
  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  // Track manual scrolling and whether user is at the bottom
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;

    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    lastDistanceFromBottomRef.current = distanceFromBottom;

    const isAtBottom = distanceFromBottom <= BOTTOM_THRESHOLD;
    setAtBottom(isAtBottom);

    if (isAtBottom) {
      setHasNewBelow(false);
    }
  }, []);

  // 🔐 Auth state + user id
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const session = data.session;
      setUserPresent(Boolean(session));

      if (session) {
        setCurrentUserId(session.user.id);
      } else {
        setCurrentUserId(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // 🔁 Load rank summary for the current user
  const refreshRank = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("level, xp, display_title, show_title")
        .eq("id", userId)
        .maybeSingle();

      if (error || !data) {
        console.warn("rank load error:", error);
        return;
      }

      setRank({
        level: data.level ?? 1,
        xp: data.xp ?? 0,
        displayTitle: data.display_title ?? null,
        showTitle: data.show_title ?? false,
      });
    },
    [supabase]
  );

  useEffect(() => {
    if (!currentUserId) return;
    void refreshRank(currentUserId);
  }, [currentUserId, refreshRank]);

  const feedSelect =
    "id, user_id, channel, content, created_at, display_name, classic_name, classic_realm, classic_region, classic_faction, classic_class, classic_race, classic_level, joined_at, class_color_hex, use_class_color";

  // 📥 Initial load from VIEW: message_feed
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrText(null);

    (async () => {
      const { data, error } = await supabase
        .from("message_feed")
        .select(feedSelect)
        .eq("channel", channel)
        .order("created_at", { ascending: true })
        .limit(MAX_IN_MEMORY);

      if (cancelled) return;

      if (error) {
        console.warn("load feed error:", error);
        setErrText(`Load failed: ${error.message}`);
        setMessages([]);
        setLoading(false);
        return;
      }

      setMessages((data ?? []) as FeedMessage[]);
      setLoading(false);

      // On first load, always go to bottom
      setTimeout(() => {
        scrollBottom();
        setAtBottom(true);
        lastDistanceFromBottomRef.current = 0;
      }, 0);
    })();

    return () => {
      cancelled = true;
    };
  }, [channel, supabase, feedSelect, scrollBottom]);

  // 🔴 Realtime: listen on messages, hydrate from message_feed
  useEffect(() => {
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
      realtimeRef.current = null;
    }

    const ch = supabase
      .channel(`messages-${channel}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel=eq.${channel}`,
        },
        async (payload) => {
          const row = payload.new as { id: string };

          const { data, error } = await supabase
            .from("message_feed")
            .select(feedSelect)
            .eq("id", row.id)
            .single();

          if (error || !data) {
            console.warn("realtime hydrate error:", error);
            return;
          }

          const msg = data as FeedMessage;

          setMessages((prev) => {
            const base = prev.filter(
              (m) =>
                !m.optimistic || m.content.trim() !== msg.content.trim()
            );
            return ensureUniqueById([...base, msg]).slice(-MAX_IN_MEMORY);
          });

          // If user is at bottom, auto-scroll.
          // If they're scrolled up, don't yank them; show "new messages" pill.
          if (atBottom) {
            scrollBottom();
            lastDistanceFromBottomRef.current = 0;
          } else {
            setHasNewBelow(true);
          }
        }
      )
      .subscribe();

    realtimeRef.current = ch;

    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
  }, [channel, supabase, feedSelect, atBottom, scrollBottom]);

  // Fallback display name: "Guest" when null/empty (we'll leave "Anonymous" as-is)
  const renderName = (m: FeedMessage) =>
    m.display_name && m.display_name.trim().length > 0
      ? m.display_name
      : "Guest";

  // Decide what color the name should be
  const getNameColorHex = (m: FeedMessage): string | undefined => {
    // If user explicitly turned class color OFF, respect that
    if (m.use_class_color === false) return undefined;

    // Prefer whatever the view sends us
    if (m.class_color_hex && m.class_color_hex.trim().length > 0) {
      return m.class_color_hex;
    }

    // Fallback: derive from WoW class if present
    if (!m.classic_class) return undefined;

    const hex =
      CLASS_COLOR_MAP[m.classic_class as keyof typeof CLASS_COLOR_MAP];

    return hex || undefined;
  };

  // ✉️ Send message -> pending queue -> AI moderation -> messages
  const sendMessage = useCallback(async () => {
    const content = text.trim();
    if (!content || sending) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/auth");
      return;
    }

    const userId = session.user.id;

    // if you're reasonably close to the bottom, snapping is allowed
    const distance = lastDistanceFromBottomRef.current;
    const shouldSnap = distance <= SEND_SNAP_THRESHOLD;

    setSending(true);
    setErrText(null);

    // optimistic echo in UI
    const optimisticId = `opt_${Date.now()}`;
    const optimistic: FeedMessage = {
      id: optimisticId,
      user_id: userId,
      channel,
      content,
      created_at: new Date().toISOString(),
      display_name: "You",
      classic_name: null,
      classic_realm: null,
      classic_region: null,
      classic_faction: null,
      classic_class: null,
      classic_race: null,
      classic_level: null,
      joined_at: null,
      class_color_hex: null,
      use_class_color: null,
      optimistic: true,
      status: "pending",
    };

    setMessages((prev) =>
      ensureUniqueById([...prev, optimistic]).slice(-MAX_IN_MEMORY)
    );
    setText("");

    if (shouldSnap) {
      scrollBottom();
      setAtBottom(true);
      setHasNewBelow(false);
      lastDistanceFromBottomRef.current = 0;
    }

    // Insert into pending queue with GLOBAL channel UUID + user_id
    const {
      data,
      error,
    }: { data: { id: string } | null; error: any } = await supabase
      .from("messages_pending_tbl")
      .insert({
        channel_id: "98d09700-c18f-4c12-9820-7858ef5ebae0", // GLOBAL channel
        content,
        user_id: userId,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.warn("send error:", error);

      setErrText(
        error?.code === "42501"
          ? "You are currently blocked from chatting."
          : `Send failed: ${error?.message ?? "Unknown error"}`
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId
            ? {
                ...m,
                display_name: "(failed) You",
                status: "failed",
              }
            : m
        )
      );

      setSending(false);
      return;
    }

    // 🔥 Fire off AI moderation (non-blocking)
    fetch("/api/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pendingId: data.id }),
    })
      .then(async (res) => {
        if (!res.ok) {
          console.error("Moderation request failed:", res.status);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimisticId
                ? {
                    ...m,
                    display_name: "(failed) You",
                    status: "failed",
                  }
                : m
            )
          );
          setErrText("Message failed moderation.");
          return;
        }

        const payload = await res.json();

        if (payload.status === "rejected") {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
          setErrText("Message blocked by moderation.");
        } else if (payload.status === "approved" && userId) {
          void refreshRank(userId);
        }
      })
      .catch((err) => {
        console.error("Failed to call moderation endpoint:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId
              ? {
                  ...m,
                  display_name: "(failed) You",
                  status: "failed",
                }
              : m
          )
        );
        setErrText("Message failed moderation.");
      });

    setSending(false);
  }, [text, sending, supabase, router, refreshRank, channel, scrollBottom]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  const inputPlaceholder =
    channel === "GLOBAL" ? "Message Astrum…" : `Message #${channel}`;

  // Nicely formatted rank line text
  const rankLine = useMemo(() => {
    if (!rank) return null;
    const parts: string[] = [];
    parts.push(`Level ${rank.level}`);
    if (rank.showTitle && rank.displayTitle) {
      parts.push(rank.displayTitle);
    }
    parts.push(`${rank.xp} XP`);
    return parts.join(" • ");
  }, [rank]);

  // ------ Render ------

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages area + "new messages" pill */}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto astrum-scroll px-4 pt-3 pb-20 space-y-2"
        >
          {loading ? (
            <div className="text-sm text-neutral-400">Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-neutral-400">No messages yet.</div>
          ) : (
            (() => {
              let lastDayKey = "";
              return messages.map((m) => {
                const dayKey = getDayKey(m.created_at);
                const showDivider = dayKey !== lastDayKey;
                if (showDivider) {
                  lastDayKey = dayKey;
                }

                const isOptimisticPending =
                  m.optimistic && m.status !== "failed";

                const colorHex = getNameColorHex(m);
                const nameColorStyle: CSSProperties | undefined = colorHex
                  ? { color: colorHex }
                  : undefined;

                return (
                  <div key={m.id} className="space-y-1.5">
                    {showDivider && (
                      <div className="my-2 flex items-center gap-3 text-[11px] text-neutral-500">
                        <div className="h-px flex-1 bg-neutral-800" />
                        <span>{getDayLabel(m.created_at)}</span>
                        <div className="h-px flex-1 bg-neutral-800" />
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-sm leading-relaxed">
                      <span
                        className="mt-0.5 w-16 shrink-0 text-right text-[11px] text-neutral-500"
                        title={formatFullTimestamp(m.created_at)}
                      >
                        {formatTime(m.created_at)}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center gap-1 text-[13px] font-medium text-sky-400"
                            style={nameColorStyle}
                          >
                            <UsernameMenu
                              name={renderName(m)}
                              messageId={m.id}
                              userId={m.user_id}
                              classicName={m.classic_name}
                              classicRealm={m.classic_realm}
                              classicRegion={m.classic_region}
                              classicFaction={m.classic_faction}
                              classicClass={m.classic_class}
                              classicRace={m.classic_race}
                              classicLevel={m.classic_level}
                              joinedAt={m.joined_at}
                            />
                            {isOptimisticPending && (
                              <span className="ml-1 inline-flex items-center">
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-amber-400/90 animate-pulse"
                                  aria-hidden="true"
                                />
                              </span>
                            )}
                          </span>
                          <span className="text-neutral-500 mx-1.5">→</span>
                          <span className="text-neutral-200 break-words">
                            {m.content}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>

        {hasNewBelow && !atBottom && (
          <button
            type="button"
            onClick={() => {
              scrollBottom();
              setHasNewBelow(false);
              setAtBottom(true);
              lastDistanceFromBottomRef.current = 0;
            }}
            className="absolute right-6 bottom-24 px-3 py-1.5 rounded-full bg-sky-500/90 hover:bg-sky-400 text-[11px] font-medium text-black shadow-[0_8px_30px_rgba(0,0,0,0.7)]"
          >
            New messages ↓
          </button>
        )}
      </div>

      {/* Composer - pinned under the scroll area */}
      <div className="border-t border-neutral-800 px-4 py-3 space-y-2 bg-black">
        {errText && <div className="text-xs text-red-400">{errText}</div>}
        {userPresent ? (
          <>
            <div className="rounded-lg bg-neutral-950 border border-neutral-800 focus-within:border-neutral-600 focus-within:bg-neutral-900">
              <textarea
                className="w-full bg-transparent outline-none px-3 py-2 text-sm resize-none"
                rows={2}
                placeholder={inputPlaceholder}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
              />
            </div>
            <div className="mt-1 flex justify-end">
              <button
                onClick={() => void sendMessage()}
                disabled={sending || !text.trim()}
                className="px-4 py-1.5 rounded-md bg-white/10 hover:bg-white/15 disabled:opacity-50 text-xs font-medium tracking-wide"
              >
                Send
              </button>
            </div>

            {rankLine && (
              <div className="mt-1 text-[11px] text-neutral-500">
                {rankLine}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-neutral-400">
              You must be signed in to chat.
            </div>
            <button
              onClick={() => router.push("/auth")}
              className="px-4 py-1.5 rounded-xl border border-neutral-700 text-xs font-medium hover:bg-neutral-900"
            >
              Sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
