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

  useEffect(() => {
    // initial load
    const load = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel", "global")
        .order("created_at", { ascending: true })
        .limit(200);
      if (!error && data) setMessages(data);
    };
    load();

    // realtime inserts
    const ch = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-2">
      {messages.map((m) => (
        <div key={m.id} className="text-sm">
          <span className="opacity-60 mr-2">{m.username ?? "guest"}:</span>
          <span>{m.content}</span>
        </div>
      ))}
    </div>
  );
}
