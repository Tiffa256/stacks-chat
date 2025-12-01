import React, { useEffect, useRef, useState } from "react";
import { subscribeToMessages } from "../firebase";
import { useAdmin } from "./AdminContext";
import Composer from "./Composer";
import "./AdminPanel.css";
import ChatMessage from "./ChatMessage";

export default function ChatPanel() {
  const { activeConversation, agentId, sendTextMessage, sendFileMessage, setTypingForActive } = useAdmin();
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }
    const unsub = subscribeToMessages(activeConversation, (msgs) => {
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
    });
    return () => unsub && unsub();
  }, [activeConversation]);

  const handleSendText = async (text) => {
    if (!activeConversation) return;
    await sendTextMessage(activeConversation, text);
  };

  const handleSendFile = async (file, onProgress) => {
    if (!activeConversation) return;
    await sendFileMessage(activeConversation, file, { type: file.type && file.type.startsWith("image") ? "image" : "file" }, onProgress);
  };

  if (!activeConversation) return <div className="empty-state">Select a conversation</div>;

  return (
    <div className="chat-panel">
      <div className="chat-header-admin">
        <div>
          <div className="chat-title">Chat with <strong>{activeConversation}</strong></div>
        </div>
      </div>

      <div className="chat-body-admin">
        {messages.length === 0 ? <div className="no-msg">No messages yet</div> : messages.map((m) => (
          <ChatMessage key={m.id} m={m} isAdmin={m.sender === agentId} />
        ))}
        <div ref={scrollRef} />
      </div>

      <Composer onSendText={handleSendText} onSendFile={handleSendFile} onTyping={(v) => setTypingForActive(v)} />
    </div>
  );
}
