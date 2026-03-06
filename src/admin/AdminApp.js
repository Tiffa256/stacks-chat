import React, { useEffect, useState } from "react";
import { AdminProvider, useAdmin } from "./AdminContext";
import ConversationsPanel from "./ConversationsPanel";
import ChatPanel from "./ChatPanel";
import "./Admin.css";

/*
  This AdminApp includes a client-side guard and an attractive sign-in landing page.
  It will not mount the chat/components until the client session key is present.

  IMPORTANT: This is client-side only protection. For production security, implement
  server-side authentication. This file only changes the look of the protected page
  (visual/login modal) — it does not touch any other files.
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

  // Basic sign-in that writes the session key.
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

      // Client-side credential acceptance:
      // Accept any non-empty password here (you can replace with a fixed value or additional checks).
      const ok = password.length > 0;

      if (!ok) {
        setLoginError("Invalid credentials");
        setLoginLoading(false);
        return;
      }

      // Persist session marker in sessionStorage
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ok: true, username: username || null, t: Date.now() }));
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

  // When authenticated, mount the inner admin UI
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

  // Not authenticated: attractive landing page with background image and sign-in CTA.
  // We removed the previously requested phrases and present a clean professional UI.
  const backgroundImageUrl =
    "https://images.unsplash.com/photo-1508385082359-fd1c533d3d2c?auto=format&fit=crop&w=2000&q=80";

  return (
    <div style={{ minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(6,21,35,0.55), rgba(6,21,35,0.55)), url("${backgroundImageUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "saturate(0.95) contrast(1.02)",
          zIndex: -1
        }}
      />

      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "linear-gradient(135deg,#6b63ff,#3ad7ff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
            boxShadow: "0 6px 20px rgba(59,48,180,0.18)"
          }}>
            SC
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>Stacks Chat</div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>Admin Portal</div>
          </div>
        </div>

        <div>
          <button
            onClick={() => setShowLoginModal(true)}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Sign in
          </button>
        </div>
      </header>

      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", minHeight: "calc(100vh - 120px)" }}>
        <div style={{
          maxWidth: 980,
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gap: 28,
          alignItems: "center",
          background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
          borderRadius: 14,
          padding: 28,
          boxShadow: "0 12px 50px rgba(2,6,23,0.45)",
          border: "1px solid rgba(255,255,255,0.04)",
          color: "#fff"
        }}>
          <section style={{ paddingRight: 8 }}>
            <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.05 }}>Welcome back</h1>
            <p style={{ marginTop: 12, color: "rgba(255,255,255,0.85)", fontSize: 15 }}>
              Access your staff dashboard to monitor conversations, respond to users, and manage support activity.
              Sign in to continue to the admin workspace.
            </p>

            <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 10, background: "rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700
                }}>A</div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Live conversations</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Real-time view & response</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 10, background: "rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700
                }}>M</div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Moderation tools</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Block, remove, or flag content</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 26 }}>
              <button
                onClick={() => setShowLoginModal(true)}
                style={{
                  padding: "12px 18px",
                  borderRadius: 10,
                  background: "linear-gradient(90deg,#6b63ff,#3ad7ff)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                  boxShadow: "0 10px 30px rgba(59,48,180,0.22)",
                  cursor: "pointer",
                  fontSize: 15
                }}
              >
                Sign in to Admin
              </button>
            </div>
          </section>

          <aside style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
            borderRadius: 12,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "stretch",
            minHeight: 200
          }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>Admin sign in</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Enter your credentials to continue.</div>

            <div style={{ marginTop: 8 }}>
              <input id="admin-username" placeholder="Username (optional)"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(0,0,0,0.28)",
                  color: "#fff",
                  outline: "none",
                  fontSize: 14
                }} />
            </div>

            <div>
              <input id="admin-password" placeholder="Password" type="password"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(0,0,0,0.28)",
                  color: "#fff",
                  outline: "none",
                  fontSize: 14
                }} />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button
                onClick={handleLogin}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "linear-gradient(90deg,#6b63ff,#3ad7ff)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {loginLoading ? "Signing in..." : "Sign in"}
              </button>

              <button
                onClick={() => { setShowLoginModal(true); }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "transparent",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer"
                }}
              >
                More
              </button>
            </div>

            <div style={{ marginTop: "auto", fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
              Need help? Contact <a href="mailto:support@example.com" style={{ color: "#fff", textDecoration: "underline" }}>support@example.com</a>
            </div>
          </aside>
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "18px 20px", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
        © {new Date().getFullYear()} Stacks Chat — Admin
      </footer>

      {/* Modal (kept for advanced options; shown when showLoginModal true) */}
      {showLoginModal && (
        <div
          onClick={() => setShowLoginModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.6)",
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
              background: "#0b1220",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 20px 50px rgba(2,6,23,0.6)",
              border: "1px solid rgba(255,255,255,0.04)",
              color: "#fff"
            }}
          >
            <h3 style={{ margin: "0 0 8px 0" }}>Administrator sign in</h3>
            <div style={{ marginBottom: 12, color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
              Sign in with your admin credentials.
            </div>

            <div style={{ marginBottom: 10 }}>
              <input id="modal-admin-username" placeholder="Username (optional)"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                  color: "#fff",
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
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                  color: "#fff",
                  outline: "none",
                  fontSize: 14
                }} />
            </div>

            {loginError && <div style={{ color: "#ff8b8b", marginBottom: 10 }}>{loginError}</div>}

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button
                onClick={() => {
                  // try modal values first; fallback to main inputs
                  const uname = document.getElementById("modal-admin-username")?.value?.trim() || document.getElementById("admin-username")?.value?.trim() || "";
                  const pwd = document.getElementById("modal-admin-password")?.value || document.getElementById("admin-password")?.value || "";
                  // populate main inputs so handleLogin can use them
                  const mainU = document.getElementById("admin-username");
                  const mainP = document.getElementById("admin-password");
                  if (mainU) mainU.value = uname;
                  if (mainP) mainP.value = pwd;
                  handleLogin();
                }}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "linear-gradient(90deg,#6b63ff,#3ad7ff)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {loginLoading ? "Signing in..." : "Sign in"}
              </button>

              <button
                onClick={() => setShowLoginModal(false)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "transparent",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer"
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
  // Top-level: do not mount sensitive components until client guard allows it.
  return (
    <AdminProvider>
      <AdminAppWithClientGuard />
    </AdminProvider>
  );
}
