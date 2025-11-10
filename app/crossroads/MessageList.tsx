"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient"; // <-- named import

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

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from<Message>("messages")
        .select("*")
        .eq("channel", "global")
        .order("created_at", { ascending: true })
        .limit(200);

      if (!isMounted) return;

      if (error) {
        console.error("load messages error:", error);
        setMessages([]);
      } else {
        setMessages((data ?? []) as Message[]);
      }
      setLoading(false);
    };

    load();

    const ch = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: "channel=eq.global",
        },
        (payload) => {
          const m = payload.new as Message;
          if (m?.channel === "global") setMessages((prev) => [...prev, m]);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  if (loading) return <div className="text-sm text-zinc-500 px-3 py-2">Loading messages…</div>;
  if (!messages.length)
    return <div className="text-sm text-zinc-500 px-3 py-2">No messages yet. Be the first to speak.</div>;

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {messages.map((m) => (
        <div key={m.id} className="text-sm leading-relaxed">
          <span className="font-medium text-zinc-300">{m.username ?? "anon"}</span>
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
