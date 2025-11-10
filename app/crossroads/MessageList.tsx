"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function MessageList() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // 1. Load existing messages
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });
      setMessages(data || []);
    };

    load();

    // 2. Subscribe to new messages
    const channel = supabase
      .channel("msg-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((current) => [...current, payload.new]);
        }
      )
      .subscribe();

    // Cleanup if component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 p-4 overflow-y-auto h-[70vh]">
      {messages.map((msg) => (
        <div key={msg.id} className="text-neutral-200">
          <span className="font-bold text-emerald-400">{msg.username}: </span>
          {msg.content}
        </div>
      ))}
    </div>
  );
}
