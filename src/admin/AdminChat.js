// src/admin/AdminChat.js
import React, { useEffect, useRef, useState } from "react";
import { ref, onValue, push } from "firebase/database";
import { db } from "../firebase";
import "./AdminChat.css";
import { useParams } from "react-router-dom";

export default function AdminChat({ userId: propUserId }) {
  // support both prop (when used by AdminPanel) and URL param (when routed via /admin/chat/:userId)
  const params = useParams();
  const userId = propUserId || params?.userId;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    console.log("Admin Chat subscribing to path:", `messages/${userId}`);

    const messagesRef = ref(db, `messages/${userId}`);

    const offFn = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setMessages([]);
        return;
      }

      const msgArray = Object.entries(data)
        .map(([id, msg]) => ({ id, ...msg }))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      setMessages(msgArray);

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });

    // cleanup: onValue doesn't return an unsubscribe directly in modular import; detach using ref.off if available
    return () => messagesRef.off && messagesRef.off();
  }, [userId]);

  const sendMessage = async () => {
    if (!text.trim() || !userId) return;

    const msgRef = ref(db, `messages/${userId}`);

    console.log("Admin sending message to:", `messages/${userId}`, text);

    await push(msgRef, {
      sender: "admin",
      text,
      createdAt: Date.now(),
      type: "text",
    });

    setText("");
  };

  return (
    <div className="admin-chat-wrapper">
      <div className="admin-chat-header">
        Chat with <strong>{userId || "—"}</strong>
      </div>

      {/* Chat Messages */}
      <div className="admin-chat-body">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={msg.sender === "admin" ? "bubble-right" : "bubble-left"}
          >
            <div className="bubble-text">{msg.text}</div>
            <div className="bubble-time">
              {new Date(msg.createdAt || 0).toLocaleTimeString()}
            </div>
          </div>
        ))}

        <div ref={bottomRef}></div>
      </div>

      {/* Input */}
      <div className="admin-chat-input">
        <input
          type="text"
          placeholder="Type message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
