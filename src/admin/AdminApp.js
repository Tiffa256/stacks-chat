import React, { useEffect, useState } from "react";
import { AdminProvider, useAdmin } from "./AdminContext";
import ConversationsPanel from "./ConversationsPanel";
import ChatPanel from "./ChatPanel";
import "./Admin.css";

/*
 AdminApp wraps the admin UI and reads the URL to set activeConversation:
 - /admin -> normal layout (sidebar + chat)
 - /admin/chat/:userId -> opens the chat page for that user (sidebar still accessible)

 This file now includes a lightweight client-side admin auth guard:
 - On mount it calls a protected endpoint (/admin/api/stats) to verify the admin session.
 - If not authenticated it shows a Sign in button and an inline modal to POST credentials to /admin/login.
 - When authentication succeeds the normal admin UI mounts and syncs the path as before.

 Notes:
 - This guard assumes your server exposes /admin/login and /admin/api/stats (protected) and sets an admin session cookie.
 - The fetch calls use credentials: "same-origin" so ensure client and server share origin or adjust CORS and use credentials: "include".
*/

function AdminAppInner() {
  const { setActiveConversation } = useAdmin();

  useEffect(() => {
    function syncFromPath() {
      try {
        const path = window.location.pathname || "";
        // look for /admin/chat/:userId
        const match = path.match(/\/admin\/chat\/([^/]+)/);
        if (match && match[1]) {
          setActiveConversation(decodeURIComponent(match[1]));
        } else {
          // leave activeConversation as-is or null if no explicit chat in URL
        }
      } catch (e) {
        console.warn("Failed to sync path to active conversation", e);
      }
    }
    // On initial mount:
    syncFromPath();
    // Also update when history changes (back/forward)
    const onPop = () => syncFromPath();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setActiveConversation]);

  // layout: left sidebar + main chat (details removed per screenshot)
  return (
    <div className="admin-container" style={{ display: "flex", alignItems: "stretch", height: "100vh" }}>
      <ConversationsPanel />
      <div className="admin-main" style={{ flex: 1, minWidth: 0 }}>
        <ChatPanel />
      </div>
    </div>
  );
}

function AdminAppWithAuth() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Check admin session by calling a protected endpoint.
  async function checkAuth() {
    setIsCheckingAuth(true);
    try {
      const resp = await fetch("/admin/api/stats", { credentials: "same-origin" });
      if (resp.ok) {
        setIsAuthenticated(true);
        setShowLoginModal(false);
        setLoginError("");
      } else {
        setIsAuthenticated(false);
        setShowLoginModal(false); // don't force modal open; show sign-in CTA
      }
    } catch (err) {
      setIsAuthenticated(false);
      setShowLoginModal(false);
    } finally {
      setIsCheckingAuth(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  // handle login (username optional)
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
        // server should set cookie/session; verify by calling protected endpoint
        await checkAuth();
        // if authenticated now, close modal
        const verify = await fetch("/admin/api/stats", { credentials: "same-origin" });
        if (verify.ok) {
          setShowLoginModal(false);
          setLoginError("");
        } else {
          setLoginError("Login succeeded but validation failed. Try again.");
        }
      } else {
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

  // Simple login modal JSX
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
          Sign in with an admin username & password, or use the global admin password.
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
      </form>
    </div>
  );

  // While checking, show a simple placeholder
  if (isCheckingAuth) {
    return (
      <div style={{ padding: 24 }}>Checking admin session…</div>
    );
  }

  // If not authenticated show CTA and allow opening the modal
  if (!isAuthenticated) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Admin Panel (Protected)</h2>
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

        <div style={{ marginTop: 16 }}>
          <p>You must sign in as an admin to access conversations and chat with users.</p>
          <p>Click &ldquo;Sign in&rdquo; to enter admin credentials (username optional) or use the global admin password.</p>
        </div>

        {showLoginModal && LoginModal}
      </div>
    );
  }

  // Authenticated => render the actual admin UI
  return <AdminAppInner />;
}

export default function AdminApp() {
  return (
    <AdminProvider>
      <AdminAppWithAuth />
    </AdminProvider>
  );
}
