"use client";

import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function ChatMessageInput() {
  const [message, setMessage] = useState("");

  const send = async () => {
    const text = message.trim();
    if (!text) return;

    const { error } = await supabase.from("messages").insert({
      content: text,
      username: "guest",
      channel: "global",
    });

    if (!error) setMessage("");
  };

  return (
    <div className="p-4 border-t border-neutral-800 bg-neutral-900">
      <input
        type="text"
        placeholder="Type a message..."
        className="w-full p-3 rounded bg-neutral-800 text-white outline-none"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            send();
          }
        }}
      />
    </div>
  );
}
