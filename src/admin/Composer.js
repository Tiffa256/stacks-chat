import React, { useRef, useState } from "react";
import "./AdminPanel.css";

export default function Composer({ onSendText, onSendFile, onTyping }) {
  const [text, setText] = useState("");
  const fileRef = useRef();

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    const t = text.trim();
    if (t) {
      await onSendText(t);
      setText("");
    }
  };

  const handleFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (onSendFile) onSendFile(f);
    fileRef.current.value = "";
  };

  return (
    <form className="chat-composer" onSubmit={handleSubmit}>
      <input
        type="file"
        ref={fileRef}
        style={{ display: "none" }}
        onChange={handleFile}
      />
      <button type="button" className="attach-btn" onClick={() => fileRef.current.click()}>📎</button>
      <textarea
        placeholder="Type a message..."
        value={text}
        onChange={(e) => { setText(e.target.value); onTyping && onTyping(true); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
            onTyping && onTyping(false);
          }
        }}
      />
      <button type="submit" className="send-btn-admin">Send</button>
    </form>
  );
}
