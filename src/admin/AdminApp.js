import React, { useEffect, useState } from "react";
import { AdminProvider, useAdmin } from "./AdminContext";
import ConversationsPanel from "./ConversationsPanel";
import ChatPanel from "./ChatPanel";
import "./Admin.css";

/*
  AdminApp (client-guarded)

  - Shows a professional landing page with a single top-right "Sign in" button.
  - A beautiful sign-in card (centered beneath the header) is the primary login UI.
  - Clicking the top-right "Sign in" opens an optional modal (same fields) — modal only appears when button is clicked.
  - Client-only protection uses a sessionStorage key; this does NOT replace server-side auth.
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
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    function onStorage(e) {
      if (e.key === SESSION_KEY) {
        setIsAuthenticated(readClientAuth());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Primary login handler (used by card and modal)
  async function handleLogin(e, source = "card") {
    e && e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    const username =
      (source === "modal"
        ? document.getElementById("modal-admin-username")?.value?.trim()
        : document.getElementById("admin-username")?.value?.trim()) || "";
    const password =
      (source === "modal"
        ? document.getElementById("modal-admin-password")?.value
        : document.getElementById("admin-password")?.value) || "";

    if (!password) {
      setLoginError("Password is required");
      setLoginLoading(false);
      return;
    }

    try {
      // Client-only acceptance: require non-empty password.
      // Replace this check with a fixed secret or more complex verification if desired.
      const ok = password.length > 0;
      if (!ok) {
        setLoginError("Invalid credentials");
        setLoginLoading(false);
        return;
      }

      // Persist session marker
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ok: true, username: username || null, t: Date.now() }));
      } catch (err) {
        console.warn("Failed to persist admin session:", err);
      }

      setIsAuthenticated(true);
      setShowModal(false);
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

  // Background image from public folder provided by you
  const bgPath = encodeURI("/ChatGPT Image Dec 6, 2025, 06_09_52 AM.png");
  const backgroundImageUrl = bgPath;

  // If authenticated, mount the admin UI
  if (isAuthenticated) {
    return (
      <>
        <div style={{ position: "absolute", right: 12, top: 12, zIndex: 1000 }}>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: "#ef4444",
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

  // Not authenticated: show elegant landing page with single sign-in card and modal (modal opens only when top-right button pressed)
  return (
    <div style={{ minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(2,6,23,0.60), rgba(2,6,23,0.60)), url("${backgroundImageUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          zIndex: -1,
          filter: "saturate(0.98) contrast(1.03)"
        }}
      />

      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 36px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg,#2563eb,#06b6d4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            boxShadow: "0 10px 30px rgba(37,99,235,0.18)"
          }}>
            SC
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Stacks Chat</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Admin Portal</div>
          </div>
        </div>

        <div>
          {/* Top-right sign-in button (only opens modal) */}
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.10)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.10)",
              cursor: "pointer",
              fontWeight: 700,
              boxShadow: "0 8px 24px rgba(0,0,0,0.14)"
            }}
          >
            Sign in
          </button>
        </div>
      </header>

      <main style={{ display: "flex", justifyContent: "center", padding: "40px 20px 80px 20px" }}>
        <div style={{ width: "100%", maxWidth: 1100, display: "grid", gridTemplateColumns: "1fr 420px", gap: 32, alignItems: "center" }}>
          <div style={{ color: "#fff" }}>
            <h1 style={{ margin: 0, fontSize: 38, fontWeight: 800, lineHeight: 1.02 }}>Welcome to your admin workspace</h1>
            <p style={{ marginTop: 12, fontSize: 16, color: "rgba(255,255,255,0.92)" }}>
              Monitor conversations, assist users, and moderate content with ease. Use the sign-in card to continue.
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 12, background: "rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18
                }}>⚡</div>
                <div>
                  <div style={{ fontWeight: 700 }}>Real-time</div>
                  <div style={{ color: "rgba(255,255,255,0.85)" }}>Instant conversation updates</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 12, background: "rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18
                }}>🔒</div>
                <div>
                  <div style={{ fontWeight: 700 }}>Controls</div>
                  <div style={{ color: "rgba(255,255,255,0.85)" }}>Block, remove, and manage interactions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Single Sign-in Card (primary on page) */}
          <div id="admin-signin-card" style={{
            background: "linear-gradient(180deg,#ffffff,#fbfbfb)",
            borderRadius: 14,
            padding: 22,
            boxShadow: "0 30px 70px rgba(4,9,24,0.55)",
            border: "1px solid rgba(8,18,38,0.06)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#071035" }}>Administrator sign in</div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Enter your credentials to access the admin tools</div>
              </div>
            </div>

            <form onSubmit={(e) => handleLogin(e, "card")} style={{ marginTop: 14 }}>
              <label style={{ display: "block", fontSize: 13, color: "#334155", marginBottom: 6 }}>Username (optional)</label>
              <input id="admin-username" placeholder="admin (optional)"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(8,18,38,0.06)",
                  background: "#fff",
                  color: "#071035",
                  outline: "none",
                  fontSize: 14,
                  boxSizing: "border-box"
                }} />

              <label style={{ display: "block", fontSize: 13, color: "#334155", marginTop: 12, marginBottom: 6 }}>Password</label>
              <input id="admin-password" placeholder="Password" type="password"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(8,18,38,0.06)",
                  background: "#fff",
                  color: "#071035",
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
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "linear-gradient(90deg,#2563eb,#06b6d4)",
                    color: "#fff",
                    border: "none",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 14px 40px rgba(37,99,235,0.14)"
                  }}
                >
                  {loginLoading ? "Signing in..." : "Sign in"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const u = document.getElementById("admin-username");
                    const p = document.getElementById("admin-password");
                    if (u) u.value = "";
                    if (p) p.value = "";
                    setLoginError("");
                  }}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "transparent",
                    color: "#071035",
                    border: "1px solid rgba(8,18,38,0.06)",
                    cursor: "pointer",
                    fontWeight: 700
                  }}
                >
                  Reset
                </button>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
                If you don't have access, contact <a href="mailto:support@example.com" style={{ color: "#2563eb" }}>support@example.com</a>.
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "18px 20px", color: "rgba(255,255,255,0.85)", fontSize: 13 }}>
        © {new Date().getFullYear()} Stacks Chat — Admin
      </footer>

      {/* Modal (only opens when top-right Sign in clicked) */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 420,
              background: "#ffffff",
              borderRadius: 12,
              padding: 22,
              boxShadow: "0 30px 70px rgba(2,6,23,0.55)",
              border: "1px solid rgba(8,18,38,0.06)"
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", color: "#071035" }}>Admin sign in</h3>
            <div style={{ marginBottom: 12, color: "#475569", fontSize: 13 }}>
              Use your administrator credentials.
            </div>

            <div style={{ marginBottom: 10 }}>
              <input id="modal-admin-username" placeholder="Username (optional)"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(8,18,38,0.06)",
                  background: "#fff",
                  color: "#071035",
                  outline: "none",
                  fontSize: 14
                }} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <input id="modal-admin-password" placeholder="Password" type="password"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(8,18,38,0.06)",
                  background: "#fff",
                  color: "#071035",
                  outline: "none",
                  fontSize: 14
                }} />
            </div>

            {loginError && <div style={{ color: "#b91c1c", marginBottom: 10 }}>{loginError}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={(e) => handleLogin(e, "modal")}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "linear-gradient(90deg,#2563eb,#06b6d4)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {loginLoading ? "Signing in..." : "Sign in"}
              </button>

              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "transparent",
                  color: "#071035",
                  border: "1px solid rgba(8,18,38,0.06)",
                  cursor: "pointer",
                  fontWeight: 700
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
