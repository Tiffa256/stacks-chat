import React from "react";
import "./Admin.css";
import Avatar from "./Avatar";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "./AdminContext";

/*
 ConversationListItem - navigates to /admin/chat/:userId when clicked
*/
export default function ConversationListItem({ user, active }) {
  const lastTime = user.lastTimestamp
    ? new Date(user.lastTimestamp)
    : null;

  const timeLabel = lastTime
    ? lastTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const isUnread =
    (user.unreadCount || 0) > 0 && user.lastSender !== "admin";

  const navigate = useNavigate();
  const { setActiveConversation } = useAdmin();

  const handleClick = () => {
    const uid = user.userId || user.id;
    setActiveConversation(uid);
    navigate(`/admin/chat/${encodeURIComponent(uid)}`, {
      replace: false,
    });
  };

  return (
    <div
      className={`user-item ${active ? "active" : ""}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      {/* LEFT SIDE: Avatar + User info */}
      <div className="user-avatar">
        <Avatar seed={user.userId} />
      </div>

      <div className="user-meta">
        <div className="user-id">{user.userId}</div>
        <div className="user-last">
          {user.lastMessage || "No message yet"}
        </div>
      </div>

      {/* RIGHT SIDE: Time + Unread bubble */}
      <div className="user-time">
        {timeLabel}

        {isUnread && (
          <span className="user-unread">{user.unreadCount}</span>
        )}
      </div>
    </div>
  );
}
