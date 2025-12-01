// src/admin/AdminChat.js
import React, { useEffect, useRef, useState } from "react";
import { ref, onValue, push, serverTimestamp } from "firebase/database";
import { db } from "../firebase";
import { useParams } from "react-router-dom";
import "./AdminChat.css";

export default function AdminChat() {
  const { userId } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    const messagesRef = ref(db, `messages/${userId}`);

    return onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setMessages([]);
        return;
      }

      const msgArray = Object.entries(data)
        .map(([id, msg]) => ({ id, ...msg }))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); // oldest → newest

      setMessages(msgArray);

      // auto-scroll down
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });
  }, [userId]);

  const sendMessage = async () => {
    if (text.trim() === "") return;

    const msgRef = ref(db, `messages/${userId}`);
    await push(msgRef, {
      sender: "admin",
      text,
      createdAt: Date.now(),
    });

    setText(""); // clear input
  };

  return (
    <div className="admin-chat-wrapper">
      <div className="admin-chat-header">Chat with {userId}</div>

      {/* Chat messages */}
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

      {/* Input Area */}
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
