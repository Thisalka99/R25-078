import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { authUpdateProfile } from "../api";

export default function ProfileForm() {
  const { user, token, setUser, logout } = useAuth();
  const [ageGroup, setAgeGroup] = useState(user?.ageGroup || "25-34");
  const [gender, setGender] = useState(user?.gender || "Male");
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const save = async () => {
    try {
      setErr(""); setMsg("");
      const res = await authUpdateProfile(token, { ageGroup, gender });
      setUser(res.user);
      setMsg("Profile updated.");
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  };
  return (
    <div className="card">
      <h3>Profile</h3>
      <p className="muted">Your account has an automatic timestamp (createdAt) on the server.</p>
      <div className="grid">
        <label className="field">
          <span>Age group</span>
          <select value={ageGroup} onChange={e=>setAgeGroup(e.target.value)}>
            {["18-24","25-34","35-44","45-54","55+"].map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Gender</span>
          <select value={gender} onChange={e=>setGender(e.target.value)}>
            {["Male","Female","Other","Prefer not to say"].map(g=><option key={g} value={g}>{g}</option>)}
          </select>
        </label>
      </div>
      <div className="actions">
        <button onClick={save}>Save</button>
        <button onClick={logout} style={{marginLeft:8}}>Logout</button>
      </div>
      {msg && <div className="muted">{msg}</div>}
      {err && <div className="error">{err}</div>}
    </div>
  );
}
