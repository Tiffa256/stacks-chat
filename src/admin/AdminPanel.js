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
  // Authentication state for admin panel (client-side guard)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Data state
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);

  // --- Auth helpers ---
  async function checkAuth() {
    setIsCheckingAuth(true);
    try {
      // Calls a protected admin endpoint; server should return 200 when admin session is valid
      const resp = await fetch("/admin/api/stats", { credentials: "same-origin" });
      if (resp.ok) {
        setIsAuthenticated(true);
        setShowLoginModal(false);
        setLoginError("");
      } else {
        setIsAuthenticated(false);
        setShowLoginModal(true);
      }
    } catch (err) {
      // network error -> treat as not authenticated (but still allow attempt to login)
      setIsAuthenticated(false);
      setShowLoginModal(true);
    } finally {
      setIsCheckingAuth(false);
    }
  }

  // Call once on mount
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Login handler (username optional)
  async function handleLogin(e) {
    e && e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    const username = document.getElementById("admin-username")?.value?.trim() || "";
    const password = document.getElementById("admin-password")?.value || "";

    if (!password) {
      setLoginError("Password is required");
      setLoginLoading(false);
      return;
    }

    try {
      const body = { password };
      if (username) body.username = username;

      const resp = await fetch("/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (resp.ok) {
        // Server should set cookie/session. Verify quickly.
        await checkAuth();
        // If authenticated now, close modal and proceed.
        if (isAuthenticated || (await (async () => { const r = await fetch("/admin/api/stats", { credentials: "same-origin" }); return r.ok; })())) {
          setShowLoginModal(false);
          setLoginError("");
        } else {
          setLoginError("Login succeeded but session validation failed. Try again.");
        }
      } else {
        // Try to read json error
        let msg = "Invalid admin credentials";
        try {
          const j = await resp.json();
          if (j && j.message) msg = j.message;
        } catch (e) {}
        setLoginError(msg);
      }
    } catch (err) {
      setLoginError(err && err.message ? err.message : "Network error");
    } finally {
      setLoginLoading(false);
    }
  }

  // If not authenticated, do not subscribe to Firebase messages.
  useEffect(() => {
    if (isCheckingAuth) return;

    if (!isAuthenticated) {
      // not allowed to proceed; clear any existing users
      setUsers([]);
      return;
    }

    // Authenticated: subscribe to messages
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingAuth, isAuthenticated]);

  // set default active user when users change (pick most recent)
  useEffect(() => {
    if (!activeUser && users.length > 0) {
      setActiveUser(users[0].userId);
    }
  }, [users, activeUser]);

  // Render login modal overlay
  const LoginModal = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: 360,
          background: "#fff",
          padding: 20,
          borderRadius: 8,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Admin Login</h2>
        <div style={{ fontSize: 13, color: "#444", marginBottom: 8 }}>
          You can sign in with an admin username & password or with the global admin password.
        </div>

        <label style={{ display: "block", marginTop: 8, fontSize: 13 }}>Username (optional)</label>
        <input
          id="admin-username"
          name="username"
          placeholder="admin (optional)"
          style={{ width: "100%", padding: "8px 10px", marginTop: 6, borderRadius: 6, border: "1px solid #ddd" }}
        />

        <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>Password</label>
        <input
          id="admin-password"
          name="password"
          type="password"
          required
          style={{ width: "100%", padding: "8px 10px", marginTop: 6, borderRadius: 6, border: "1px solid #ddd" }}
        />

        {loginError && (
          <div style={{ color: "crimson", marginTop: 10, fontSize: 13 }}>
            {loginError}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            type="submit"
            disabled={loginLoading}
            style={{
              flex: 1,
              padding: "10px 12px",
              background: "#0366d6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {loginLoading ? "Signing in..." : "Sign in"}
          </button>

          <button
            type="button"
            onClick={() => {
              // allow dismiss to view message saying they must sign in
              setShowLoginModal(false);
            }}
            style={{
              padding: "10px 12px",
              background: "#eee",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </form>
    </div>
  );

  // When still checking auth, show a simple placeholder
  if (isCheckingAuth) {
    return (
      <div className="admin-container">
        <div style={{ padding: 24 }}>Checking admin session…</div>
      </div>
    );
  }

  // When not authenticated, show a notice and the login modal (modal can be toggled)
  if (!isAuthenticated) {
    return (
      <div className="admin-container">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
          <h2 className="admin-title" style={{ margin: 0 }}>Admin Panel (Protected)</h2>
          <div>
            <button
              onClick={() => {
                setShowLoginModal(true);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                background: "#0366d6",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Sign in
            </button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <p>You must sign in as an admin to access conversations and chat with users.</p>
          <p>
            Click "Sign in" to enter admin credentials (username optional) or use the global admin password.
          </p>
        </div>

        {showLoginModal && LoginModal}
      </div>
    );
  }

  // Authenticated — render the original AdminPanel UI
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
