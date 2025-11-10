"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

type Message = {
  id: string;
  content: string;
  username: string | null;
  channel: string | null;
  created_at: string;
};

export default function MessageList() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // ---- INITIAL LOAD (no filters; sort oldest->newest) ----
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, content, username, channel, created_at")
        .order("created_at", { ascending: true })
        .limit(200);

      if (!mounted) return;

      if (error) {
        console.error("select error:", error);
        setErr(error.message);
        setMessages([]);
      } else {
        console.log("loaded messages:", data?.length ?? 0, data);
        setMessages((data ?? []) as Message[]);
      }
      setLoading(false);
    })();

    // ---- REALTIME (listen to ALL inserts; we can filter in code) ----
    const ch = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          console.log("realtime insert:", m);
          // keep only 'global' in UI for now
          if (m.channel === null || m.channel === "global") {
            setMessages((prev) => [...prev, m]);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-zinc-500 px-3 py-2">Loading messages…</div>;
  }

  if (err) {
    return (
      <div className="text-sm text-red-400 px-3 py-2">
        Error loading messages: {err}
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="text-sm text-zinc-500 px-3 py-2">
        No messages yet. Be the first to speak.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {messages
        .filter((m) => m.channel === null || m.channel === "global")
        .map((m) => (
          <div key={m.id} className="text-sm leading-relaxed">
            <span className="font-medium text-zinc-300">{m.username ?? "guest"}</span>
            <span className="text-zinc-500">: </span>
            <span className="text-zinc-100">{m.content}</span>
            <span className="ml-2 text-xs text-zinc-500">
              {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
    </div>
  );
}
