import React from "react";
import { useAdmin } from "./AdminContext";
import "./AdminPanel.css";

export default function ConversationDetails() {
  const { activeConversation, conversationsMap } = useAdmin();
  if (!activeConversation) return null;
  const meta = conversationsMap?.[activeConversation] || {};
  return (
    <div className="conv-details">
      <h3>Details</h3>
      <div><strong>User:</strong> {activeConversation}</div>
      <div><strong>Last message:</strong> {meta.lastMessage || "—"}</div>
      <div><strong>Status:</strong> {meta.status || "open"}</div>
      <div><strong>Assigned:</strong> {meta.assignedAgent || "—"}</div>
    </div>
  );
}
