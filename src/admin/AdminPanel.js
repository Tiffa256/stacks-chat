// src/admin/AdminPanel.js
// Ensure we read from the "messages" root (NOT "chats") so admin opens the same path users write to.
import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import AdminChat from "./AdminChat";
import "./Admin.css";
import { db } from "../firebase";

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);

  useEffect(() => {
    const messagesRef = ref(db, "messages");

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setUsers([]);
        return;
      }

      const userList = Object.entries(data)
        .map(([userId, msgs]) => {
          if (!msgs) return null;
          const msgArray = Object.entries(msgs).map(([k, v]) => ({
            id: k,
            ...v,
          }));
          // newest first
          msgArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          const lastMsg = msgArray[0];

          return {
            userId,
            lastMessage: lastMsg ? (lastMsg.type === "image" ? "Image" : lastMsg.text || "") : "",
            lastTimestamp: lastMsg?.createdAt || 0,
          };
        })
        .filter(Boolean);

      userList.sort((a, b) => b.lastTimestamp - a.lastTimestamp);

      setUsers(userList);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // set default active user when users change (pick most recent)
  useEffect(() => {
    if (!activeUser && users.length > 0) {
      setActiveUser(users[0].userId);
    }
  }, [users, activeUser]);

  return (
    <div className="admin-container">
      {/* LEFT SIDEBAR (user list) */}
      <div className="admin-users">
        <h2 className="admin-title">Users</h2>

        {users.length === 0 && <div className="no-msg">No conversations yet</div>}

        {users.map((u) => (
          <div
            key={u.userId}
            className={`user-item ${activeUser === u.userId ? "active" : ""}`}
            onClick={() => setActiveUser(u.userId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setActiveUser(u.userId)}
          >
            <div className="user-left">
              <div className="user-avatar" title={u.userId}>
                {u.userId?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div className="user-meta">
                <div className="user-id">{u.userId}</div>
                <div className="last-msg">{u.lastMessage}</div>
              </div>
            </div>

            <div className="user-right">
              <div className="time">{formatTime(u.lastTimestamp)}</div>
              {/* badge placeholder (if you have unread counts, render inside .badge) */}
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT SIDE (chat window) */}
      <div className="admin-chat">
        {activeUser ? (
          <AdminChat userId={activeUser} />
        ) : (
          <div className="empty-state">
            <p>Select a user to chat</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
