// src/admin/AdminChat.js
import React, { useEffect, useRef, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import "./AdminChat.css";
import { useParams } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";

export default function AdminChat({ userId: propUserId }) {
  const params = useParams();
  const userId = propUserId || params?.userId;

  const { sendTextMessage, sendFileMessage } = useAdmin();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const bottomRef = useRef(null);

  // ================================
  // LOAD MESSAGES FROM FIREBASE
  // ================================
  useEffect(() => {
    if (!userId) return;

    const messagesRef = ref(db, `messages/${userId}`);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setMessages([]);
        return;
      }

      const msgArray = Object.entries(data)
        .map(([id, msg]) => ({ id, ...msg }))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      setMessages(msgArray);

      // Scroll to bottom
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });

    return () => unsubscribe();
  }, [userId]);

  // ================================
  // SEND TEXT MESSAGE
  // ================================
  const sendMessage = async () => {
    if (!text.trim()) return;

    await sendTextMessage(userId, text.trim());
    setText("");
  };

  // ================================
  // SEND FILE MESSAGE
  // ================================
  const sendFile = async () => {
    if (!file) return;

    await sendFileMessage(userId, file);
    setFile(null);
    document.getElementById("adminFileInput").value = "";
  };

  return (
    <div className="admin-chat-wrapper">
      <div className="admin-chat-header">
        Chat with <strong>{userId || "—"}</strong>
      </div>

      {/* Messages */}
      <div className="admin-chat-body">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={msg.sender === "admin" ? "bubble-right" : "bubble-left"}
          >
            {msg.type === "image" ? (
              <img
                src={msg.imageUrl || msg.url}
                alt="uploaded"
                className="chat-image"
              />
            ) : (
              <div className="bubble-text">{msg.text}</div>
            )}

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

        <input
          id="adminFileInput"
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button onClick={sendFile}>Upload</button>
      </div>
    </div>
  );
}
