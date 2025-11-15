// components/Chat.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabaseClient";
import { ensureUniqueById } from "@/lib/dedupe";
import { MAX_HISTORY } from "@/lib/constants";
import { UsernameMenu } from "@/components/UsernameMenu";

type FeedMessage = {
  id: string;
  channel: string;
  content: string;
  created_at: string;
  display_name: string | null;
  optimistic?: boolean;
  status?: "pending" | "failed" | "sent";
};

type Props = { channel: string };

export default function Chat({ channel }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [userPresent, setUserPresent] = useState(false);
  const [errText, setErrText] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  // 🔐 Auth state
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUserPresent(Boolean(data.session));
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // 📥 Initial load from VIEW: message_feed
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrText(null);

    (async () => {
      const { data, error } = await supabase
        .from("message_feed")
        .select("id, channel, content, created_at, display_name")
        .eq("channel", channel)
        .order("created_at", { ascending: true })
        .limit(MAX_HISTORY);

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
      scrollBottom();
    })();

    return () => {
      cancelled = true;
    };
  }, [channel, supabase, scrollBottom]);

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
            .select("id, channel, content, created_at, display_name")
            .eq("id", row.id)
            .single();

          if (error || !data) {
            console.warn("realtime hydrate error:", error);
            return;
          }

          const msg = data as FeedMessage;

          setMessages((prev) => {
            // remove any optimistic echo with same content
            const base = prev.filter(
              (m) =>
                !m.optimistic || m.content.trim() !== msg.content.trim()
            );
            return ensureUniqueById([...base, msg]).slice(-MAX_HISTORY);
          });

          scrollBottom();
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
  }, [channel, supabase, scrollBottom]);

  const renderName = (m: FeedMessage) => m.display_name;

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

    setSending(true);
    setErrText(null);

    // optimistic echo in UI
    const optimisticId = `opt_${Date.now()}`;
    const optimistic: FeedMessage = {
      id: optimisticId,
      channel,
      content,
      created_at: new Date().toISOString(),
      display_name: "You",
      optimistic: true,
      status: "pending",
    };

    setMessages((prev) =>
      ensureUniqueById([...prev, optimistic]).slice(-MAX_HISTORY)
    );
    setText("");
    scrollBottom();

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

      // mark optimistic as failed
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
          // treat as failure
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

        // If AI rejected it, remove the optimistic bubble
        if (payload.status === "rejected") {
          setMessages((prev) =>
            prev.filter((m) => m.id !== optimisticId)
          );
          setErrText("Message blocked by moderation.");
        }
        // If approved, realtime INSERT on `messages` will replace the optimistic echo.
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

    // Allow user to send another message while AI runs
    setSending(false);
  }, [channel, text, supabase, sending, scrollBottom, router]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-sm text-neutral-400">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-neutral-400">No messages yet.</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-sm">
              <span className="text-neutral-400 mr-2">
                {new Date(m.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span
                className={m.optimistic ? "text-amber-400" : "text-sky-400"}
              >
                <UsernameMenu name={renderName(m)} messageId={m.id} />
              </span>
              <span className="text-neutral-500 mx-2">→</span>
              <span
                className={`text-neutral-200 break-words ${
                  m.optimistic ? "italic opacity-80" : ""
                }`}
              >
                {m.content}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-neutral-800 p-3 space-y-2">
        {errText && <div className="text-xs text-red-400">{errText}</div>}
        {userPresent ? (
          <>
            <div className="rounded-lg bg-neutral-900 focus-within:ring-1 focus-within:ring-neutral-700">
              <textarea
                className="w-full bg-transparent outline-none p-3 text-sm resize-none"
                rows={2}
                placeholder={`Message #${channel}`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
              />
            </div>
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => void sendMessage()}
                disabled={sending || !text.trim()}
                className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/15 disabled:opacity-50 text-sm"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-400">
              You must be signed in to chat.
            </div>
            <button
              onClick={() => router.push("/auth")}
              className="px-4 py-2 rounded-xl border border-neutral-700 hover:bg-neutral-900"
            >
              Sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
