import React, { useState } from "react";
import { authLogin, authRegister } from "../api";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import loginImg from "./login.png";

export default function AuthPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("login"); // or 'register'
  const [form, setForm] = useState({ email: "", password: "", ageGroup: "25-34", gender: "Male" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      setBusy(true);
      const fn = mode === "login" ? authLogin : authRegister;
      const res = await fn(form);
      login(res.token, res.user);
      nav("/tasks", { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  // ---- inline styles (no external/class CSS) ----
  const styles = {
    shell: {
      display: "flex",
      minHeight: "100vh",
      width: "100%",
      backgroundColor: "#fff",
      fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji"',
      color: "#111827",
      lineHeight: 1.35,
    },
    leftPane: {
      position: "relative",
      width: "50%",
      display: "block",
      overflow: "hidden",
    },
    leftImg: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      filter: "grayscale(100%)",
    },
    rightPane: {
      width: "50%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
    },
    card: {
      width: "100%",
      maxWidth: 560,
      margin: "0 auto",
    },
    title: {
      fontSize: 36,
      fontWeight: 700,
      textAlign: "center",
      margin: 0,
      color: "#000",
    },
    subtitle: {
      marginTop: 12,
      marginBottom: 36,
      fontSize: 16,
      textAlign: "center",
      color: "#4B5563",
    },
    form: {
      width: "100%",
    },
    labelText: {
      display: "block",
      fontSize: 14,
      fontWeight: 600,
      color: "#111827",
      marginBottom: 8,
    },
    input: {
      width: "100%",
      height: 48,
      border: "1px solid #E5E7EB",
      borderRadius: 10,
      padding: "0 14px",
      fontSize: 16,
      outline: "none",
      boxSizing: "border-box",
    },
    fieldWrap: {
      marginBottom: 18,
    },
    buttonPrimary: {
      display: "inline-block",
      backgroundColor: "#000000",
      color: "#FFFFFF",
      border: "none",
      borderRadius: 10,
      padding: "12px 28px",
      fontSize: 20,
      fontWeight: 700,
      cursor: "pointer",
      transition: "opacity 0.15s ease",
    },
    actionsRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      marginTop: 10,
    },
    linkRow: {
      marginTop: 40,
      textAlign: "center",
      fontSize: 14,
      color: "#4B5563",
    },
    link: {
      color: "#2563EB",
      textDecoration: "underline",
      cursor: "pointer",
      marginLeft: 6,
    },
    error: {
      marginTop: 16,
      color: "#B91C1C",
      background: "#FEE2E2",
      border: "1px solid #FCA5A5",
      borderRadius: 8,
      padding: "10px 12px",
      fontSize: 14,
    },
  };

  return (
    <div style={styles.shell}>
      {/* Left photo panel */}
      <div style={styles.leftPane}>
        {/* Put Login.png in /public or adjust this path */}
          <img src={loginImg} alt="Office" style={styles.leftImg} />
      </div>

      {/* Right form panel */}
      <div style={styles.rightPane}>
        <div style={styles.card}>
          <h1 style={styles.title}>Enter the System</h1>
          <div style={styles.subtitle}>
            Understand Your Team Better – One Emotion at a Time.
          </div>

          <form onSubmit={submit} style={styles.form}>
            <div style={styles.fieldWrap}>
              <span style={styles.labelText}>Company Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                style={styles.input}
                placeholder=""
              />
            </div>

            <div style={styles.fieldWrap}>
              <span style={styles.labelText}>Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                style={styles.input}
                placeholder=""
              />
            </div>

            {/* Extra fields only for Register mode (kept functional, styled inline) */}
            {mode === "register" && (
              <>
                <div style={styles.fieldWrap}>
                  <span style={styles.labelText}>Age group</span>
                  <select
                    value={form.ageGroup}
                    onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
                    style={styles.input}
                  >
                    {["18-24", "25-34", "35-44", "45-54", "55+"].map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.fieldWrap}>
                  <span style={styles.labelText}>Gender</span>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    style={styles.input}
                  >
                    {["Male", "Female", "Other", "Prefer not to say"].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div style={styles.actionsRow}>
              <button type="submit" disabled={busy} style={styles.buttonPrimary}>
                {busy ? "Please wait…" : mode === "login" ? "Login" : "Create account"}
              </button>
            </div>
          </form>

          {err && <div style={styles.error}>Error: {err}</div>}

          <div style={styles.linkRow}>
            {mode === "login" ? (
              <>
                Don’t have an account?
                <span
                  style={styles.link}
                  onClick={() => setMode("register")}
                >
                  Register Here
                </span>
              </>
            ) : (
              <>
                Already have an account?
                <span
                  style={styles.link}
                  onClick={() => setMode("login")}
                >
                  Login Here
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
