"use client";

import ChatLayout from "./ChatLayout";
import MessageList from "./MessageList";
import ChatMessageInput from "./ChatMessageInput";

export default function CrossroadsPage() {
  return (
    <ChatLayout>
      <MessageList />
      <ChatMessageInput />
    </ChatLayout>
  );
}
