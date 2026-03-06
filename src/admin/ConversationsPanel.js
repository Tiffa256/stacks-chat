import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConversationListItem from "./ConversationListItem";
import "./Admin.css";
import { ref as dbRef, onValue, off } from "firebase/database";
import { db } from "../firebase";
import { useAdmin } from "./AdminContext";

/*
  ConversationsPanel

  - Protects a specific conversation (Giulia) with a client-side password modal.
  - Clicking Giulia will open a password modal; only after entering the correct secret
    will the admin be allowed to open the conversation.
  - Unlocked status is stored in localStorage under UNLOCKED_KEY so it persists across tabs.
  - NOTE: This is client-side protection only. For real security, enforce server-side auth
    or Firebase Security Rules.
*/

/**
 * PROTECT THIS USER:
 * Replace 'change_this_password' with the password you want to require to open Giulia's chat.
 */
const PROTECTED_CHATS = {
  Giulia: "@money-2026" // <-- set the password you want for Giulia here
};

const UNLOCKED_KEY = "unlockedProtectedChats_client_v1";

function readUnlocked() {
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch (e) {
    return [];
  }
}

function addUnlocked(userId) {
  try {
    const list = readUnlocked();
    if (!list.includes(userId)) {
      list.push(userId);
      localStorage.setItem(UNLOCKED_KEY, JSON.stringify(list));
      // emit storage event for same-tab listeners (some browsers won't trigger if same tab wrote it)
      try {
        window.dispatchEvent(new StorageEvent("storage", { key: UNLOCKED_KEY, newValue: JSON.stringify(list) }));
      } catch (e) {}
    }
  } catch (e) {}
}

export default function ConversationsPanel() {
  const { activeConversation, setActiveConversation } = useAdmin();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenConversations, setHiddenConversations] = useState(() => {
    try {
      const raw = localStorage.getItem("hiddenConversations");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  // Modal state for protected-unlock flow
  const [showProtectModal, setShowProtectModal] = useState(false);
  const [protectTarget, setProtectTarget] = useState(null);
  const [protectPwd, setProtectPwd] = useState("");
  const [protectError, setProtectError] = useState("");

  // Listen for localStorage changes (hiddenConversations and unlocked list)
  useEffect(() => {
    function onStorage(e) {
      if (e.key === "hiddenConversations") {
        try {
          setHiddenConversations(e.newValue ? JSON.parse(e.newValue) : []);
        } catch (err) {
          setHiddenConversations([]);
        }
      }
      if (e.key === UNLOCKED_KEY) {
        // unlock list changed in another tab — no special handling needed here
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const messagesRef = dbRef(db, "messages");

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setList([]);
        setLoading(false);
        return;
      }

      // Convert messages into a list
      const users = Object.entries(data)
        .map(([userId, msgs]) => {
          if (!msgs) return null;

          const arr = Object.values(msgs);

          // Sort by time
          arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          const last = arr[0] || {};

          let lastMsgText = "";
          if (last.type === "text") lastMsgText = last.text || "";
          else if (last.type === "image") lastMsgText = "📷 Image";
          else if (last.type === "file") lastMsgText = last.fileName || "📁 File";

          return {
            userId,
            lastMessage: lastMsgText,
            lastSender: last.sender || "unknown",
            lastTimestamp: last.createdAt || 0,
            unreadCount: 0,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.lastTimestamp - a.lastTimestamp);

      setList(users);
      setLoading(false);
    });

    return () => {
      off(messagesRef);
      unsubscribe && unsubscribe();
    };
  }, []);

  // Filter out locally-hidden conversations
  const visibleList = list.filter((c) => !hiddenConversations.includes(c.userId));

  // Attempt to open conversation, with protection for configured users (Giulia)
  const handleClick = (userId) => {
    // If protected and not unlocked, show modal
    if (PROTECTED_CHATS && Object.prototype.hasOwnProperty.call(PROTECTED_CHATS, userId)) {
      const unlocked = readUnlocked();
      if (!unlocked.includes(userId)) {
        setProtectTarget(userId);
        setProtectPwd("");
        setProtectError("");
        setShowProtectModal(true);
        return;
      }
    }
    // not protected or already unlocked -> open chat
    setActiveConversation(userId);
    navigate(`/admin/chat/${encodeURIComponent(userId)}`);
  };

  const submitProtectPassword = (e) => {
    e && e.preventDefault();
    if (!protectTarget) return;
    const expected = PROTECTED_CHATS[protectTarget];
    if (protectPwd === expected) {
      addUnlocked(protectTarget);
      setShowProtectModal(false);
      // open chat
      setActiveConversation(protectTarget);
      navigate(`/admin/chat/${encodeURIComponent(protectTarget)}`);
    } else {
      setProtectError("Incorrect password");
    }
  };

  const handleModalKey = (e) => {
    if (e.key === "Enter") submitProtectPassword(e);
    if (e.key === "Escape") {
      setShowProtectModal(false);
      setProtectError("");
    }
  };

  return (
    <div className="admin-users">
      <div className="sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="admin-title" style={{ margin: 0 }}>Conversations</h2>
      </div>

      <div className="users-list" style={{ padding: 8 }}>
        {loading ? (
          <div className="no-msg">Loading conversations…</div>
        ) : visibleList.length === 0 ? (
          <div className="no-msg">No conversations</div>
        ) : (
          visibleList.map((c) => {
            const isProtected = PROTECTED_CHATS && Object.prototype.hasOwnProperty.call(PROTECTED_CHATS, c.userId);
            const unlocked = readUnlocked();
            const isUnlocked = unlocked.includes(c.userId);

            // Render a small lock badge for protected chats (locked or unlocked)
            return (
              <div
                key={c.userId}
                onClick={() => handleClick(c.userId)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 6px",
                  borderRadius: 8,
                  marginBottom: 6,
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleClick(c.userId)}
              >
                {/* Left: small lock badge if protected */}
                {isProtected ? (
                  <div style={{
                    width: 36,
                    height: 36,
                    minWidth: 36,
                    borderRadius: 8,
                    background: isUnlocked ? "linear-gradient(90deg,#06b6d4,#2563eb)" : "rgba(0,0,0,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isUnlocked ? "#fff" : "#374151",
                    fontWeight: 700,
                    marginRight: 8,
                    fontSize: 14
                  }} title={isUnlocked ? "Unlocked" : "Protected"}>
                    {isUnlocked ? "🔓" : "🔒"}
                  </div>
                ) : (
                  <div style={{ width: 12, marginRight: 8 }} />
                )}

                <div style={{ flex: 1 }}>
                  <ConversationListItem
                    user={c}
                    active={activeConversation === c.userId}
                    onClick={() => handleClick(c.userId)}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Password modal for protected conversations (styled and accessible) */}
      {showProtectModal && protectTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Unlock conversation ${protectTarget}`}
          onKeyDown={handleModalKey}
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(2,6,23,0.55)",
            zIndex: 3000
          }}
          onClick={() => { setShowProtectModal(false); setProtectError(""); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 380,
              maxWidth: "94%",
              background: "#fff",
              borderRadius: 12,
              padding: 18,
              boxShadow: "0 20px 60px rgba(2,6,23,0.3)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Protected conversation</div>
                <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>Enter password to open <strong>{protectTarget}</strong></div>
              </div>
              <button
                aria-label="Close"
                onClick={() => { setShowProtectModal(false); setProtectError(""); }}
                style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitProtectPassword}>
              <label style={{ fontSize: 13, color: "#374151" }}>Password</label>
              <input
                autoFocus
                value={protectPwd}
                onChange={(e) => setProtectPwd(e.target.value)}
                type="password"
                placeholder="Enter password"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #e6e7eb",
                  marginTop: 8,
                  marginBottom: 6,
                  boxSizing: "border-box"
                }}
              />
              {protectError && <div style={{ color: "#b91c1c", marginBottom: 8 }}>{protectError}</div>}

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="submit" style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "linear-gradient(90deg,#06b6d4,#2563eb)",
                  border: "none",
                  color: "#07203a",
                  fontWeight: 700,
                  cursor: "pointer"
                }}>
                  Unlock
                </button>
                <button type="button" onClick={() => { setShowProtectModal(false); setProtectError(""); }} style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "transparent",
                  border: "1px solid #e6e7eb",
                  color: "#374151",
                  cursor: "pointer",
                  fontWeight: 700
                }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
