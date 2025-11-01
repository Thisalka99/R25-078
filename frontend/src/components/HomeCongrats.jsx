// frontend/src/components/HomeCongrats.jsx
import React from "react";
import { useAuth } from "../auth/AuthContext";

export default function HomeCongrats() {
  const { user } = useAuth();
  const name = (user?.email || "").split("@")[0] || "there";
  return (
    <div className="card">
      <h2>Hi {name}, good day! 👋</h2>
      <p>Good work today — see you tomorrow.</p>
    </div>
  );
}
