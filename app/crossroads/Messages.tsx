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

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Run async work without making the effect itself async
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel", "global")
        .order("created_at", { ascending: true })
        .limit(200);

      if (!mounted) return;

      if (error) {
        console.error("load messages error:", error);
        setMessages([]);
      } else {
        setMessages(((data ?? []) as unknown) as Message[]);
      }
      setLoading(false);
    })();

    // Realtime subscription
    const channel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: "channel=eq.global" },
        (payload) => {
          const m = payload.new as Message;
          if (m?.channel === "global") {
            setMessages((prev) => [...prev, m]);
          }
        }
      )
      .subscribe();

    // Cleanup must return void or a function — not a Promise
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-zinc-500 px-3 py-2">Loading messages…</div>;
  }

  if (!messages.length) {
    return <div className="text-sm text-zinc-500 px-3 py-2">No messages yet. Be the first to speak.</div>;
  }

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
