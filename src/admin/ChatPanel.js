import React, { useEffect, useRef, useState } from "react";
import { subscribeToMessages, deleteMessage as firebaseDeleteMessage, pushMessage } from "../firebase";
import { useAdmin } from "./AdminContext";
import Composer from "./Composer";
import "./AdminPanel.css";
import ChatMessage from "./ChatMessage";

/*
 ChatPanel - updated to support reply/delete/download actions.
*/

export default function ChatPanel() {
  const { activeConversation, agentId } = useAdmin();
  const [messages, setMessages] = useState([]);
  const [replyTo, setReplyTo] = useState(null); // message object being replied to
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      setReplyTo(null);
      return;
    }
    const unsub = subscribeToMessages(activeConversation, (msgs) => {
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
    });
    return () => unsub && unsub();
  }, [activeConversation]);

  // create lookup by id to show repliedMessage inline
  const messageById = messages.reduce((acc, m) => {
    acc[m.id] = m;
    return acc;
  }, {});

  // handle sending text (with optional replyTo)
  const handleSendText = async (text) => {
    if (!activeConversation) return;
    const payload = {
      sender: agentId,
      text,
      type: "text",
      createdAt: Date.now(),
    };
    if (replyTo) {
      payload.replyTo = replyTo.id;
      payload.replyText = replyTo.text || "";
    }
    await pushMessage(activeConversation, payload);
    setReplyTo(null);
  };

  const handleSendFile = async (file, onProgress) => {
    // Use Composer's existing onSendFile flow (it calls AdminContext or ChatPanel's handler depending on wiring)
    // If you want file replies support, extend similarly to include replyTo metadata in pushMessageWithFile flow.
    // For now, delegate to the Composer's onSendFile prop.
  };

  const handleReply = (message) => {
    setReplyTo(message);
    // focus composer if desired
    const el = document.querySelector(".chat-composer textarea");
    if (el) el.focus();
  };

  const handleDelete = async (message) => {
    if (!activeConversation || !message?.id) return;
    try {
      await firebaseDeleteMessage(activeConversation, message.id);
      // optional: remove from local state immediately for snappy UX
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
    } catch (e) {
      console.error("delete failed", e);
      alert("Failed to delete message");
    }
  };

  if (!activeConversation) return <div className="empty-state">Select a conversation</div>;

  return (
    <div className="chat-panel" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="chat-header-admin">
        <div>
          <div className="chat-title">Chat with <strong>{activeConversation}</strong></div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Admin: {agentId}</div>
        </div>
      </div>

      <div className="chat-body-admin">
        {messages.length === 0 ? (
          <div className="no-msg">No messages yet</div>
        ) : (
          messages.map((m) => (
            <ChatMessage
              key={m.id}
              m={m}
              isAdmin={m.sender === agentId}
              onReply={handleReply}
              onDelete={handleDelete}
              onDownload={() => {
                if (m.url) window.open(m.url, "_blank");
              }}
              repliedMessage={m.replyTo ? messageById[m.replyTo] : null}
            />
          ))
        )}
        <div ref={scrollRef} />
      </div>

      <Composer
        onSendText={handleSendText}
        onSendFile={handleSendFile}
        onTyping={() => {}}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
