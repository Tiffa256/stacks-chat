// src/admin/AdminChat.js
import React, { useEffect, useRef, useState } from "react";
import { ref, onValue, off } from "firebase/database";
import { db } from "../firebase";
import "./AdminChat.css";
import { useParams } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";

export default function AdminChat({ userId: propUserId }) {
  const params = useParams();
  const userId = propUserId || params?.userId;

  // ← use AdminContext functions
  const { sendTextMessage, sendFileMessage, agentId } = useAdmin();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const bottomRef = useRef(null);

  // ----------------------------------------------------
  // Load messages from Firebase
  // ----------------------------------------------------
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

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });

    return () => off(messagesRef);
  }, [userId]);

  // ----------------------------------------------------
  // SEND TEXT — USE AdminContext
  // ----------------------------------------------------
  const handleSendText = async () => {
    if (!text.trim() || !userId) return;

    await sendTextMessage(userId, text.trim());
    setText("");
  };

  // ----------------------------------------------------
  // SEND FILE — USE AdminContext
  // ----------------------------------------------------
  const handleSendFile = async () => {
    if (!file || !userId) return;

    await sendFileMessage(userId, file);

    setFile(null);
    document.getElementById("adminFileInput").value = "";
  };

  return (
    <div className="admin-chat-wrapper">
      <div className="admin-chat-header">
        Chat with <strong>{userId || "—"}</strong>
      </div>

      <div className="admin-chat-body">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={msg.sender === agentId ? "bubble-right" : "bubble-left"}
          >
            {msg.type === "image" ? (
              <img
                src={msg.url || msg.imageUrl}
                alt="upload"
                className="chat-image"
                style={{ maxWidth: "200px", borderRadius: "8px" }}
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

      <div className="admin-chat-input">
        <input
          type="text"
          placeholder="Type message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendText()}
        />

        <button onClick={handleSendText}>Send</button>

        <input
          id="adminFileInput"
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button onClick={handleSendFile}>Upload</button>
      </div>
    </div>
  );
}
