import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { clearTasks, clearDayplan } from "../api";

export default function GameBalloon() {
  const nav = useNavigate();
  const loc = useLocation();
  const { token } = useAuth();
  const reason = loc.state?.reason || "manual";

  const [preLeft, setPreLeft] = useState(3);
  const [started, setStarted] = useState(false);

  const [timeLeft, setTimeLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("playing");

  const yRef = useRef(150);
  const vyRef = useRef(0);
  const [y, setY] = useState(150);
  const [vy, setVy] = useState(0);
  const [press, setPress] = useState(false);

  useEffect(() => { yRef.current = y; }, [y]);
  useEffect(() => { vyRef.current = vy; }, [vy]);

  // Pre-start countdown
  useEffect(() => {
    if (started) return;
    if (preLeft <= 0) {
      setStarted(true);
      setRunning(true);
      return;
    }
    const t = setTimeout(() => setPreLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [preLeft, started]);

  // Physics
  useEffect(() => {
    let raf;
    const G = 0.28, THRUST = -0.6, H = 300;
    const step = () => {
      if (!running) return;
      let v = Math.max(-4, Math.min(4, vyRef.current + (press ? THRUST : 0) + G));
      let ny = yRef.current + v;
      if (ny < 0 || ny > H - 40) {
        setStatus("lose");
        setRunning(false);
        return;
      }
      setVy(v); setY(ny);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running, press]);

  // Timer
  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) {
      setStatus("win");
      setRunning(false);
      return;
    }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, running]);

  // Input
  useEffect(() => {
    const down = e => { if (e.code === "Space" && started) setPress(true); };
    const up = e => { if (e.code === "Space") setPress(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [started]);

  const goHome = () => nav("/", { replace: true, state: { game: "pass" } });
  const goTasksFresh = async () => {
    try { await clearTasks(token); } catch {}
    try { await clearDayplan(token); } catch {}
    nav("/tasks", { replace: true });
  };
  const goChat = () => nav("/chat", { replace: true, state: { game: "fail" } });

  return (
    <div className="card" style={{ padding: 16, background: "#f9fafb", color: "#333", border: "1px solid #ddd", borderRadius: 12 }}>
      <h3 style={{ color: "#0066cc" }}>Balloon Balance — 60s</h3>
      <p className="muted" style={{ color: "#666" }}>
        {reason === "finished_early"
          ? "You finished tasks early! Bonus game 🎈"
          : reason === "time_up"
          ? "Time's up! Quick game break 🎈"
          : "Have fun!"}
      </p>

      <div className="grid" style={{ gridTemplateColumns: "1fr auto", alignItems: "center", marginBottom: 8 }}>
        <div className="bar" style={{ background: "#e5e7eb", height: 8, borderRadius: 4, overflow: "hidden" }}>
          <div
            className="fill"
            style={{
              width: `${(60 - timeLeft) / 60 * 100}%`,
              background: "linear-gradient(90deg, #60a5fa, #93c5fd)"
            }}
          />
        </div>
        <div style={{ minWidth: 70, textAlign: "right" }}>
          <b>{timeLeft}s</b>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          height: 300,
          borderRadius: 16,
          background: "#e0f2fe", // light blue sky
          border: "1px solid #bae6fd",
          overflow: "hidden",
          cursor: "pointer"
        }}
        onMouseDown={() => started && setPress(true)}
        onMouseUp={() => setPress(false)}
        onMouseLeave={() => setPress(false)}
        title="Hold SPACE or click to lift"
      >
        {/* Balloon */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            top: y,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "radial-gradient(circle at 30% 30%, #f87171, #ef4444)", // soft red
            boxShadow: "0 8px 20px rgba(239,68,68,0.3)"
          }}
        />

        {/* Instruction */}
        <div style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 10,
          color: "#0369a1",
          fontSize: 12
        }}>
          Hold SPACE or click to lift
        </div>

        {/* Pre-start overlay */}
        {!started && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 8,
              color: "#1e3a8a"
            }}
          >
            <div style={{ fontSize: 48, fontWeight: 900 }}>{preLeft}</div>
            <div className="muted">Get ready…</div>
          </div>
        )}
      </div>

      {status !== "playing" && (
        <div style={{ marginTop: 12 }}>
          {status === "win" ? (
            <>
              <div className="card" style={{
                padding: 12,
                background: "#ecfdf5",
                border: "1px solid #6ee7b7",
                borderRadius: 8,
                color: "#065f46"
              }}>
                🎉 You passed! Great job!
              </div>
              <div className="actions" style={{ marginTop: 8 }}>
                <button onClick={goHome} style={{ marginRight: 6 }}>Go to Home</button>
                <button onClick={goTasksFresh}>Back to Tasks (new day)</button>
              </div>
            </>
          ) : (
            <>
              <div className="card" style={{
                padding: 12,
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: 8,
                color: "#991b1b"
              }}>
                😅 You missed this time.
              </div>
              <div className="actions" style={{ marginTop: 8 }}>
                <button onClick={goChat}>Back to Interview</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
