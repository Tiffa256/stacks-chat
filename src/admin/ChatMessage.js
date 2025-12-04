import React from "react";
import "./Admin.css";
import MessageMenu from "./MessageMenu";

/*
 WhatsApp-styled ChatMessage
 — No logic changed
 — Only UI changed
*/
export default function ChatMessage({
  m,
  isAdmin,
  onReply,
  onDelete,
  onDownload,
  repliedMessage,
}) {
  const timeLabel = m.createdAt
    ? new Date(m.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const rowClass = isAdmin ? "wa-row admin" : "wa-row user";
  const bubbleClass = isAdmin ? "wa-bubble admin" : "wa-bubble user";

  return (
    <div className={rowClass}>
      <div className="wa-msg-wrapper">
        <div className={bubbleClass}>
          {/* Reply preview (WhatsApp style) */}
          {repliedMessage && (
            <div className="wa-reply-box">
              <div className="wa-reply-name">
                {repliedMessage.sender === "admin" ? "You" : repliedMessage.sender}
              </div>
              <div className="wa-reply-snippet">
                {repliedMessage.text
                  ? repliedMessage.text.length > 120
                    ? repliedMessage.text.slice(0, 120) + "…"
                    : repliedMessage.text
                  : repliedMessage.type === "image"
                  ? "Image"
                  : repliedMessage.fileName || "File"}
              </div>
            </div>
          )}

          {/* Image */}
          {m.type === "image" ? (
            <img
              src={m.url}
              alt={m.fileName || "image"}
              className="wa-img"
              onClick={() => m.url && window.open(m.url, "_blank")}
            />
          ) : m.type === "file" ? (
            // File bubble
            <div
              className="wa-file"
              onClick={() =>
                m.url ? window.open(m.url, "_blank") : onDownload && onDownload(m)
              }
            >
              <div className="wa-file-icon">📄</div>
              <div className="wa-file-name">{m.fileName || "Download file"}</div>
            </div>
          ) : (
            // Text
            <div className="wa-text">{m.text}</div>
          )}

          {/* Footer (time + ticks) */}
          <div className="wa-footer">
            <span className="wa-time">{timeLabel}</span>
            {isAdmin && <span className="wa-ticks">✓✓</span>}
          </div>
        </div>

        {/* Action menu */}
        <div className="wa-menu">
          <MessageMenu
            onReply={() => onReply && onReply(m)}
            onDelete={() => onDelete && onDelete(m)}
            onDownload={() =>
              m.url ? window.open(m.url, "_blank") : onDownload && onDownload(m)
            }
          />
        </div>
      </div>
    </div>
  );
}
