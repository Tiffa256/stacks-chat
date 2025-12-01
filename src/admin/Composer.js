import React, { useRef, useState } from "react";
import "./AdminPanel.css";

/*
 Composer (with image/file preview)
 Props:
  - onSendText(text)
  - onSendFile(file, onProgress)
  - onTyping(bool)
*/
export default function Composer({ onSendText, onSendFile, onTyping }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    const t = text.trim();
    if (t) {
      await onSendText && onSendText(t);
      setText("");
    }
  };

  const handleFileChange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // show preview for images
    if (f.type && f.type.startsWith("image")) {
      const url = URL.createObjectURL(f);
      setPreview({ url, name: f.name, file: f });
    } else {
      setPreview({ url: null, name: f.name, file: f });
    }
    // If immediate upload desired:
    if (onSendFile) {
      onSendFile(f, (p) => {
        // progress callback (optional)
        // you could display upload progress; omitted for brevity
        console.log("upload progress", p);
      });
      // Clear file input
      fileRef.current.value = "";
      setPreview(null);
    }
  };

  return (
    <form className="chat-composer" onSubmit={handleSubmit}>
      <input
        type="file"
        ref={fileRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <button type="button" className="attach-btn" onClick={() => fileRef.current.click()}>📎</button>

      <div style={{ flex: 1 }}>
        {preview ? (
          <div className="composer-preview">
            {preview.url ? <img className="preview-thumb" src={preview.url} alt={preview.name} /> : <div style={{ width:56, height:56, borderRadius:10, background:"#efefef", display:"flex", alignItems:"center", justifyContent:"center" }}>{preview.name}</div>}
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <div style={{ fontWeight:600 }}>{preview.name}</div>
              <div style={{ fontSize:12, color:"var(--muted)" }}>Preparing upload…</div>
            </div>
          </div>
        ) : (
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
        )}
      </div>

      <button type="submit" className="send-btn-admin">Send</button>
    </form>
  );
}
