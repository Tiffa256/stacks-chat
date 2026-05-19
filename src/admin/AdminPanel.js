// src/admin/AdminPanel.js
import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import AdminChat from "./AdminChat";
import "./Admin.css";
import { db } from "../firebase";

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Client-only admin protection configuration.
 *
 * SECURITY NOTE:
 * - Any secret in client-side JS (including REACT_APP_ env variables baked into the build)
 *   is visible to anyone who downloads the bundle. Use server-side auth for production security.
 *
 * USAGE:
 * - Set REACT_APP_ADMIN_PASSWORD in your host (Render/Netlify/Vercel) or in a local .env and rebuild.
 * - Optionally set ADMIN_USERS below (do NOT commit real passwords).
 */
const DEFAULT_GLOBAL_PASSWORD = (process.env.REACT_APP_ADMIN_PASSWORD || "").trim(); // empty by default
const ADMIN_USERS = [
  // Optional admin users (username + password). Do not commit real credentials.
  // Example: { username: "admin", password: "YourStrongPassword" }
];

// Session storage key used to persist the admin auth state in the browser session
const SESSION_KEY = "client_admin_authenticated_v1";

// Toggle debug logging for troubleshooting (set to false in production)
const DEBUG = false;

function AdminPanel() {
  // Authentication state (client-only guard)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      // require ok:true and a timestamp t that is recent (12 hours)
      if (!parsed?.ok || !parsed?.t) return false;
      const age = Date.now() - Number(parsed.t || 0);
      const maxAge = 1000 * 60 * 60 * 12; // 12 hours
      return age > 0 && age < maxAge;
    } catch (e) {
      return false;
    }
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Data state (only populated when authenticated)
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);

  // Utility: persist session in sessionStorage (cleared when browser/tab closed)
  function persistSession(username = null) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ok: true, username, t: Date.now() }));
    } catch (e) {
      // ignore
    }
  }
  function clearSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {
      // ignore
    }
  }

  // Verify credentials locally (client-side)
  // Returns true only when password exactly matches the configured global password
  // OR when username+password exactly match an entry in ADMIN_USERS.
  function verifyCredentialsLocal(username, password) {
    try {
      if (typeof password !== "string" || !password.trim()) return false;
      const candidate = password.trim();
      if (username && String(username).trim()) {
        const uname = String(username).trim();
        const found = ADMIN_USERS.find((u) => String(u.username) === uname);
        if (!found) {
          if (DEBUG) console.debug("[admin] verify: username not found", { uname });
          return false;
        }
        const expected = String(found.password || "").trim();
        const matched = expected !== "" && expected === candidate;
        if (DEBUG) console.debug("[admin] verify username", { uname, matched });
        return matched;
      }

      // No username provided — require a configured global password
      if (!DEFAULT_GLOBAL_PASSWORD) {
        if (DEBUG) console.debug("[admin] verify: no global password configured; rejecting login");
        return false;
      }
      const matched = candidate === DEFAULT_GLOBAL_PASSWORD;
      if (DEBUG) console.debug("[admin] verify global", { matched });
      return matched;
    } catch (err) {
      if (DEBUG) console.error("[admin] verify error", err);
      return false;
    }
  }

  // Handle login submit (username optional)
  async function handleLoginSubmit(e) {
    e && e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    const username = (document.getElementById("admin-username")?.value || "").trim();
    const password = document.getElementById("admin-password")?.value || "";

    // Basic client-side validation
    if (!password || !String(password).trim()) {
      setLoginError("Password is required");
      setLoginLoading(false);
      return;
    }

    // Perform local verification
    try {
      const ok = verifyCredentialsLocal(username || null, password);
      if (DEBUG) console.debug("[admin] login attempt", { usernameProvided: !!username, ok });
      if (ok) {
        persistSession(username || null);
        setIsAuthenticated(true);
        setShowLoginModal(false);
        setLoginError("");
      } else {
        setLoginError("Invalid credentials");
      }
    } catch (err) {
      setLoginError("Login error");
      console.error("client login error:", err);
    } finally {
      setLoginLoading(false);
    }
  }

  // Logout (client-only)
  function handleLogout() {
    clearSession();
    setIsAuthenticated(false);
    setUsers([]);
    setActiveUser(null);
    // Optionally show the login modal again
    setShowLoginModal(true);
  }

  // Subscribe to Firebase messages only when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // ensure we don't have any listeners active
      setUsers([]);
      return;
    }

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
  }, [isAuthenticated]);

  // set default active user when users change (pick most recent)
  useEffect(() => {
    if (!activeUser && users.length > 0) {
      setActiveUser(users[0].userId);
    }
  }, [users, activeUser]);

  // Render login modal overlay (client-only)
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
        onSubmit={handleLoginSubmit}
        style={{
          width: 380,
          background: "#fff",
          padding: 20,
          borderRadius: 8,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Admin Login (Client-only)</h2>
        <div style={{ fontSize: 13, color: "#444", marginBottom: 8 }}>
          Enter admin password (or username + password). This is client-side protection only.
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
            onClick={() => setShowLoginModal(false)}
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

        <div style={{ fontSize: 12, marginTop: 10, color: "#666" }}>
          Note: This is a client-side gate. For robust protection you must use server-side authentication.
        </div>
      </form>
    </div>
  );

  // If not authenticated — show CTA and offer the login modal
  if (!isAuthenticated) {
    return (
      <div className="admin-container">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
          <h2 className="admin-title" style={{ margin: 0 }}>Admin Panel (Client-protected)</h2>
          <div>
            <button
              onClick={() => setShowLoginModal(true)}
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
          <p>You must sign in locally as an admin to access conversations and chat with users.</p>
          <p>
            Click "Sign in" to enter admin credentials (username optional) or use the global admin password.
          </p>

          <div style={{ marginTop: 12 }}>
            <strong>Important:</strong> This protection lives entirely in the browser. It prevents the UI
            from subscribing to messages until you sign in, but does not prevent access to the JS bundle or
            to Firebase if credentials are known. For secure protection use server-side sessions and protected APIs.
          </div>
        </div>

        {showLoginModal && LoginModal}
      </div>
    );
  }

  // Authenticated — render the original AdminPanel UI + a small logout button
  return (
    <div className="admin-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12 }}>
        <div />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#444" }}>Admin</span>
          <button
            onClick={handleLogout}
            title="Logout admin"
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              background: "#ff595e",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 13
            }}
          >
            Logout
          </button>
        </div>
      </div>

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
