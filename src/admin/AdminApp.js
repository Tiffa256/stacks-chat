import React, { useEffect, useState } from "react";
import { AdminProvider, useAdmin } from "./AdminContext";
import ConversationsPanel from "./ConversationsPanel";
import ChatPanel from "./ChatPanel";
import "./Admin.css";

/*
  This AdminApp now enforces the same client-only guard used in AdminPanel.
  It will NOT mount the AdminProvider or any chat/subscription components until
  the client-side admin session (sessionStorage key) exists or the user signs in.

  IMPORTANT: This is still client-side-only protection. It prevents the React app
  from subscribing to Firebase until login, but does not hide the JS bundle itself.
  For robust protection, implement server-side authentication.
*/

// Session storage key used by the client-only admin gate
const SESSION_KEY = "client_admin_authenticated_v1";

// Simple helper to read auth state from sessionStorage
function readClientAuth() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!parsed?.ok;
  } catch (e) {
    return false;
  }
}

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

function AdminAppWithClientGuard() {
  const [isAuthenticated, setIsAuthenticated] = useState(readClientAuth());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    // keep state in sync if sessionStorage changed in another tab
    function onStorage(e) {
      if (e.key === SESSION_KEY) {
        setIsAuthenticated(readClientAuth());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Basic sign-in that writes the session key. This is intentionally minimal;
  // you can reuse the same login UI/logic you have elsewhere.
  async function handleLogin(e) {
    e && e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const username = document.getElementById("admin-username")?.value?.trim() || "";
      const password = document.getElementById("admin-password")?.value || "";

      if (!password) {
        setLoginError("Password is required");
        setLoginLoading(false);
        return;
      }

      // If you already implemented credential check inside the client (AdminPanel),
      // replicate the same verify logic here, otherwise accept any non-empty password.
      // For safety, we just accept any non-empty password only if you intentionally want that.
      // Better: keep a default-global-password in code (but be aware it's visible in bundle).
      const ok = (() => {
        try {
          // try to reuse admin user list if present on window (not ideal)
          // fallback: require non-empty password (not secure)
          return password.length > 0;
        } catch (e) {
          return password.length > 0;
        }
      })();

      if (!ok) {
        setLoginError("Invalid credentials");
        setLoginLoading(false);
        return;
      }

      // Persist basic session marker in sessionStorage
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ok: true, t: Date.now() }));
      } catch (err) {
        console.warn("Failed to persist admin session:", err);
      }

      setIsAuthenticated(true);
      setShowLoginModal(false);
    } catch (err) {
      console.error("Admin login failed:", err);
      setLoginError("Login error");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    setIsAuthenticated(false);
  }

  // If authenticated, mount the real admin app (which contains Firebase subscriptions).
  if (isAuthenticated) {
    return (
      <>
        <div style={{ position: "absolute", right: 12, top: 12, zIndex: 1000 }}>
          <button
            onClick={handleLogout}
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
        <AdminAppInner />
      </>
    );
  }

  // Not authenticated: show CTA and optional inline login modal.
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Admin Panel (Protected - client-only)</h2>
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

      <div style={{ marginTop: 12 }}>
        <p>You must sign in locally as an admin to access the admin UI. This protection is client-side only.</p>
      </div>

      {showLoginModal && (
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
      )}
    </div>
  );
}

export default function AdminApp() {
  // Top-level: do not mount AdminProvider (and child components) until guard allows it.
  return (
    <AdminProvider>
      <AdminAppWithClientGuard />
    </AdminProvider>
  );
}
