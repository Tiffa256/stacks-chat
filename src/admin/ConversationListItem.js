import React from "react";
import "./AdminPanel.css";
import Avatar from "./Avatar";

/*
 ConversationListItem - polished layout
 Props:
  - user: { userId, lastMessage, lastSender, lastTimestamp, unreadCount }
  - active: boolean
  - onClick: function
*/

export default function ConversationListItem({ user, active, onClick }) {
  const lastTime = user.lastTimestamp ? new Date(user.lastTimestamp) : null;
  const timeLabel = lastTime ? lastTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const isUnread = (user.unreadCount || 0) > 0 && user.lastSender !== "admin";

  const handleClick = (e) => {
    if (onClick) onClick(e);
  };

  return (
    <div
      className={`user-list-item ${active ? "active" : ""}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick(e)}
    >
      <div className="user-left">
        <Avatar seed={user.userId} />
        <div className="user-meta">
          <div className="user-id">{user.userId}</div>
          <div className="last-msg">{user.lastMessage || "No message yet"}</div>
        </div>
      </div>

      <div className="user-right">
        <div className="time">{timeLabel}</div>
        {isUnread ? <div className="badge">{user.unreadCount}</div> : null}
      </div>
    </div>
  );
}
