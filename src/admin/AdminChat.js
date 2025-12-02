// src/admin/AdminChat.js
import React, { useEffect, useRef, useState } from "react";
import { ref, onValue, push, off } from "firebase/database";
import { db } from "../firebase";
import "./AdminChat.css";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AdminChat({ userId: propUserId }) {
  // support both prop (AdminPanel) and URL route param
  const params = useParams();
  const userId = propUserId || params?.userId;

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

      // auto scroll
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });

    return () => off(messagesRef);
  }, [userId]);

  // ----------------------------------------------------
  // SEND TEXT MESSAGE — ORIGINAL WORKING LOGIC
  // ----------------------------------------------------
  const sendMessage = async () => {
    if (!text.trim() || !userId) return;

    const msgRef = ref(db, `messages/${userId}`);

    await push(msgRef, {
      sender: "admin",
      text,
      createdAt: Date.now(),
      type: "text",
    });

    setText("");
  };

  // ----------------------------------------------------
  // SEND FILE MESSAGE — SUPABASE ONLY
  // ----------------------------------------------------
  const sendFile = async () => {
    if (!file || !userId) return;

    const filePath = `uploads/${Date.now()}_${file.name}`;

    // upload file to Supabase bucket
    const { error } = await supabase.storage
      .from("public-files")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      alert("Upload failed: " + error.message);
      return;
    }

    // get public URL
    const { data: urlData } = supabase.storage
      .from("public-files")
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;

    // push message to Firebase
    const msgRef = ref(db, `messages/${userId}`);
    await push(msgRef, {
      sender: "admin",
      imageUrl,
      createdAt: Date.now(),
      type: "image",
    });

    setFile(null);
    document.getElementById("adminFileInput").value = "";
  };

  return (
    <div className="admin-chat-wrapper">
      <div className="admin-chat-header">
        Chat with <strong>{userId || "—"}</strong>
      </div>

      {/* Chat messages */}
      <div className="admin-chat-body">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={msg.sender === "admin" ? "bubble-right" : "bubble-left"}
          >
            {msg.type === "image" ? (
              <img
                src={msg.imageUrl}
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
