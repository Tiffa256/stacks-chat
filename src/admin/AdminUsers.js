// src/admin/AdminUsers.js
// Build admin user list directly from the "messages" root in Realtime DB.
// No Firestore required.
import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import "./admin.css";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const messagesRef = ref(db, "messages");

    const off = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setUsers([]);
        return;
      }

      const list = Object.entries(data)
        .map(([userId, msgs]) => {
          if (!msgs) return null;
          const msgArray = Object.entries(msgs).map(([id, value]) => ({
            id,
            ...value,
          }));
          // newest first
          msgArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          const latest = msgArray[0] || {};

          return {
            id: userId,
            lastMessage: latest.text || "No text",
            lastSender: latest.sender || "unknown",
            lastTime: latest.createdAt
              ? new Date(latest.createdAt).toLocaleString()
              : "No time",
          };
        })
        .filter(Boolean);

      // sort by most recent
      list.sort((a, b) => {
        const ta = a.lastTime ? new Date(a.lastTime).getTime() : 0;
        const tb = b.lastTime ? new Date(b.lastTime).getTime() : 0;
        return tb - ta;
      });

      setUsers(list);
    });

    return () => off();
  }, []);

  const openChat = (userId) => {
    navigate(`/admin/chat/${userId}`);
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">Messages by Users</h1>

      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Last Message</th>
              <th>Sender</th>
              <th>Time</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                onClick={() => openChat(user.id)}
                style={{ cursor: "pointer" }}
              >
                <td>{user.id}</td>
                <td>{user.lastMessage}</td>
                <td>{user.lastSender}</td>
                <td>{user.lastTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
