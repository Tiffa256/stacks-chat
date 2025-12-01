import React, { useState, useEffect, useRef } from "react";
import "./Chat.css";
import { db } from "./firebase";
import {
  ref,
  push,
  onValue,
  serverTimestamp,
} from "firebase/database";

// Get user ID from URL
function getUserId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user") || "unknown-user";
}

function Chat() {
  const userId = getUserId(); // ← VERY IMPORTANT
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const dummy = useRef();

  useEffect(() => {
    const userChatRef = ref(db, `chats/${userId}`);

    onValue(userChatRef, (snapshot) => {
      const data = snapshot.val();
      const loaded = data
        ? Object.keys(data).map((id) => ({ id, ...data[id] }))
        : [];

      setMessages(loaded);
      dummy.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [userId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    const chatRef = ref(db, `chats/${userId}`);

    await push(chatRef, {
      text,
      sender: userId, // USER BUBBLE
      createdAt: serverTimestamp(),
      type: "text",
    });

    setText("");
  };

  return (
    <div className="chat-container">

      {/* Header */}
      <div className="chat-header">
        <button className="back-btn">←</button>
        <h3>Customer Support</h3>
        <div className="header-right">
          <span>English ▾</span>
          <span className="volume-icon">🔊</span>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-body">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} userId={userId} />
        ))}
        <div ref={dummy}></div>
      </div>

      {/* Input */}
      <form className="chat-input" onSubmit={sendMessage}>
        <button type="button" className="attach-btn">📎</button>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your message"
        />

        <button type="submit" className="send-btn">➤</button>
      </form>
    </div>
  );
}

function ChatBubble({ message, userId }) {
  const isUser = message.sender === userId;

  return (
    <div className={`bubble-row ${isUser ? "right" : "left"}`}>
      <div className={`bubble ${isUser ? "blue" : "grey"}`}>
        {message.type === "image" ? (
          <img src={message.url} alt="sent" className="bubble-img" />
        ) : (
          <p>{message.text}</p>
        )}
      </div>
    </div>
  );
}

export default Chat;
