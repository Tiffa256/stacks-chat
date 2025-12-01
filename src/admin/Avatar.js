import React from "react";

/*
 Avatar - simple initials avatar, color based on seed
 Props: seed (string)
*/
export default function Avatar({ seed = "U" }) {
  const s = (seed || "").toString();
  const char = s.charAt(0).toUpperCase() || "U";
  // pick color from seed
  const colors = ["#67d8a2","#6cc9f8","#f5b267","#c08cff","#ff7b93"];
  const index = Math.abs(Array.from(s).reduce((acc,c)=>acc + c.charCodeAt(0),0)) % colors.length;
  const bg = colors[index];
  return (
    <div className="avatar" style={{ background: bg }}>
      {char}
    </div>
  );
}
