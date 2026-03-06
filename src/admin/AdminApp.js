import React, { useEffect, useState } from "react";
import { AdminProvider, useAdmin } from "./AdminContext";
import ConversationsPanel from "./ConversationsPanel";
import ChatPanel from "./ChatPanel";
import "./Admin.css";

/*
  Updated AdminApp with a single top-right Sign in button and a single,
  well-arranged sign-in card below the header. Background uses a reliable
  Unsplash image URL.

  This file keeps the same client-only guard behavior (sessionStorage key),
  but simplifies the UI as requested. It does not modify any other files.
*/

// Session storage key used by the client-only admin gate
const SESSION_KEY = "client_admin_authenticated_v1";

// Helper to read auth state from sessionStorage
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
        }
      } catch (e) {
        console.warn("Failed to sync path to active conversation", e);
      }
    }
    syncFromPath();
    const onPop = () => syncFromPath();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setActiveConversation]);

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
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    function onStorage(e) {
      if (e.key === SESSION_KEY) {
        setIsAuthenticated(readClientAuth());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Primary login handler
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
      // Client-side acceptance: require non-empty password (replace with stricter check if desired)
      const ok = password.length > 0;
      if (!ok) {
        setLoginError("Invalid credentials");
        setLoginLoading(false);
        return;
      }

      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ok: true, username: username || null, t: Date.now() }));
      setIsAuthenticated(true);
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

  // Background image (reliable Unsplash link)
  const backgroundImageUrl =
    "https://images.unsplash.com/photo-1505765058243-9b67f3f6a5b5?auto=format&fit=crop&w=2200&q=80";

  // If authenticated, mount admin UI
  if (isAuthenticated) {
    return (
      <>
        <div style={{ position: "absolute", right: 12, top: 12, zIndex: 1000 }}>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: "#ff4d4f",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              boxShadow: "0 6px 18px rgba(0,0,0,0.12)"
            }}
          >
            Logout
          </button>
        </div>
        <AdminAppInner />
      </>
    );
  }

  // Not authenticated: show attractive landing + single sign-in card
  return (
    <div style={{ minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", color: "#0b1220" }}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(8,16,30,0.55), rgba(8,16,30,0.55)), url("${backgroundImageUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          zIndex: -1,
          filter: "contrast(0.98) saturate(1.02)"
        }}
      />

      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 36px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: 10,
            background: "linear-gradient(135deg,#4f46e5,#06b6d4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            boxShadow: "0 8px 30px rgba(79,70,229,0.22)"
          }}>
            SC
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Stacks Chat</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Admin Portal</div>
          </div>
        </div>

        <div>
          {/* Single top-right Sign in button */}
          <button
            onClick={() => {
              // scroll to sign-in card
              const el = document.getElementById("admin-signin-card");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
              fontWeight: 700,
              boxShadow: "0 6px 18px rgba(0,0,0,0.12)"
            }}
          >
            Sign in
          </button>
        </div>
      </header>

      <main style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", gap: 28 }}>
        <section style={{ width: "100%", maxWidth: 1100, color: "#fff", textAlign: "left" }}>
          <h1 style={{ margin: "6px 0 0 0", fontSize: 36, lineHeight: 1.03 }}>Admin dashboard</h1>
          <p style={{ marginTop: 12, fontSize: 16, color: "rgba(255,255,255,0.88)" }}>
            Manage conversations, moderate content, and support users in real time. Sign in to continue to the admin workspace.
          </p>
        </section>

        {/* Sign-in card positioned below the header/body as requested */}
        <div id="admin-signin-card" style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 12,
          background: "rgba(255,255,255,0.96)",
          padding: 18,
          boxShadow: "0 20px 60px rgba(2,6,23,0.45)",
          border: "1px solid rgba(2,6,23,0.06)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#08142d" }}>Administrator sign in</div>
              <div style={{ fontSize: 13, color: "#3b4a63" }}>Secure access to the admin tools</div>
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ marginTop: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "#334155", marginBottom: 6 }}>Username (optional)</label>
            <input id="admin-username" placeholder="admin (optional)"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid rgba(15,23,42,0.06)",
                background: "#fff",
                color: "#0b1220",
                outline: "none",
                fontSize: 14,
                boxSizing: "border-box"
              }} />

            <label style={{ display: "block", fontSize: 13, color: "#334155", margin: "12px 0 6px" }}>Password</label>
            <input id="admin-password" placeholder="Password" type="password"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid rgba(15,23,42,0.06)",
                background: "#fff",
                color: "#0b1220",
                outline: "none",
                fontSize: 14,
                boxSizing: "border-box"
              }} />

            {loginError && (
              <div style={{ color: "#b91c1c", marginTop: 10, fontSize: 13 }}>
                {loginError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                type="submit"
                disabled={loginLoading}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "linear-gradient(90deg,#4f46e5,#06b6d4)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 10px 30px rgba(79,70,229,0.14)"
                }}
              >
                {loginLoading ? "Signing in..." : "Sign in"}
              </button>

              <button
                type="button"
                onClick={() => {
                  // clear inputs
                  const u = document.getElementById("admin-username");
                  const p = document.getElementById("admin-password");
                  if (u) u.value = "";
                  if (p) p.value = "";
                  setLoginError("");
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "transparent",
                  color: "#0b1220",
                  border: "1px solid rgba(15,23,42,0.06)",
                  cursor: "pointer",
                  fontWeight: 700
                }}
              >
                Reset
              </button>
            </div>
          </form>

          <div style={{ marginTop: 14, fontSize: 12, color: "#475569" }}>
            If you don't have access, contact your system administrator.
          </div>
        </div>

        <div style={{ height: 12 }} />

      </main>

      <footer style={{ textAlign: "center", padding: "18px 20px", color: "rgba(255,255,255,0.78)", fontSize: 13 }}>
        © {new Date().getFullYear()} Stacks Chat — Admin
      </footer>
    </div>
  );
}

export default function AdminApp() {
  return (
    <AdminProvider>
      <AdminAppWithClientGuard />
    </AdminProvider>
  );
}
