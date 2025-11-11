// components/Chat.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
const supabase = createClient();
import type { RealtimeChannel } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { ensureUniqueById } from "@/lib/dedupe";
import { MAX_HISTORY } from "@/lib/constants";

type MessageRow = {
  id: string;
  channel: string;          // 'global' | 'trade' | 'lfg' | 'guild'
  user_id: string | null;
  username: string | null;
  content: string;
  created_at: string;       // ISO
  optimistic?: boolean;     // client-side flag for UI
};

type Props = {
  channel: string;
};

export default function Chat({ channel }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  // Scroll to bottom helper
  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  // Load initial history for this channel
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, channel, user_id, username, content, created_at")
        .eq("channel", channel)
        .order("created_at", { ascending: true })
        .limit(MAX_HISTORY);

      if (!cancelled) {
        if (error) {
          console.warn("load messages error:", error);
          setMessages([]);
        } else {
          setMessages((data ?? []) as MessageRow[]);
        }
        setLoading(false);
        scrollBottom();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [channel, supabase, scrollBottom]);

  // Realtime subscription for only this channel
  useEffect(() => {
    // Cleanup old subscription (if any)
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
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((prev) => {
            const merged = ensureUniqueById([...prev, row]).slice(-MAX_HISTORY);
            return merged;
          });
          scrollBottom();
        }
      );

    ch.subscribe();
    realtimeRef.current = ch;

    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
  }, [supabase, channel, scrollBottom]);

  const sendMessage = useCallback(async () => {
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);

    // Pull current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Optimistic row
    const optimisticId = `opt_${nanoid(10)}`;
    const optimistic: MessageRow = {
      id: optimisticId,
      channel,
      user_id: user?.id ?? null,
      username: user?.email ?? "You",
      content,
      created_at: new Date().toISOString(),
      optimistic: true,
    };

    setMessages((prev) => {
      const merged = ensureUniqueById([...prev, optimistic]).slice(-MAX_HISTORY);
      return merged;
    });
    setText("");
    scrollBottom();

    // Insert to DB
    const { data, error } = await supabase
      .from("messages")
      .insert({
        channel,
        user_id: user?.id ?? null,
        username: user?.email ?? null,
        content,
      })
      .select("id, channel, user_id, username, content, created_at")
      .single();

    if (error) {
      console.warn("send error:", error);
      // Mark optimistic message as failed (optional: keep UI feedback simple)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId ? { ...m, username: "(failed) You" } : m
        )
      );
    } else if (data) {
      // Replace optimistic with real row immediately (dedupe fn also helps)
      setMessages((prev) => {
        const replaced = prev
          .filter((m) => m.id !== optimisticId)
          .concat([data as MessageRow]);
        return ensureUniqueById(replaced).slice(-MAX_HISTORY);
      });
    }

    setSending(false);
  }, [channel, text, supabase, sending, scrollBottom]);

  // Enter to send
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
              <span className={m.optimistic ? "text-amber-400" : "text-sky-400"}>
                {m.username ?? "anon"}
              </span>
              <span className="text-neutral-500 mx-2">→</span>
              <span className="text-neutral-200 break-words">{m.content}</span>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-neutral-800 p-3">
        <div className="rounded-lg bg-neutral-900 focus-within:ring-1 focus-within:ring-neutral-700">
          <textarea
            className="w-full bg-transparent outline-none p-3 text-sm resize-none"
            rows={2}
            placeholder={`Message #${channel} — press Enter to send`}
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
      </div>
    </div>
  );
}
