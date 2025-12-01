import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import AdminChat from "./AdminChat";
import "./Admin.css";

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);

  // Load users and preview message
  useEffect(() => {
    const chatsRef = ref(db, "chats");

    onValue(chatsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setUsers([]);
        return;
      }

      const userList = Object.keys(data).map((userId) => {
        const messages = data[userId];
        const keys = Object.keys(messages);
        const lastKey = keys[keys.length - 1];
        const lastMsg = messages[lastKey];

        return {
          userId,
          lastMessage: lastMsg?.text || "Image",
          lastTimestamp: lastMsg?.timestamp || 0,
        };
      });

      // Sort users by most recent message
      userList.sort((a, b) => b.lastTimestamp - a.lastTimestamp);

      setUsers(userList);
    });
  }, []);

  return (
    <div className="admin-container">

      {/* LEFT SIDEBAR (user list) */}
      <div className="admin-users">
        <h2 className="admin-title">Users</h2>

        {users.map((u) => (
          <div
            key={u.userId}
            className={`user-item ${activeUser === u.userId ? "active" : ""}`}
            onClick={() => setActiveUser(u.userId)}
          >
            <strong>{u.userId}</strong>
            <p className="last-msg">{u.lastMessage}</p>
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
