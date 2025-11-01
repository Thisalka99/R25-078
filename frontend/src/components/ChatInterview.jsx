import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getSchema, postPredict, postPredictTextPerQuestion, clearTasks, clearDayplan, postExplainRow } from "../api";
import { useNavigate } from "react-router-dom";

const robotImg = process.env.PUBLIC_URL + "/img/robot.png";
const girlImg  = process.env.PUBLIC_URL + "/img/girl.png";

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function isQuestion(col) {
  const c = col.toLowerCase();
  return !["timestamp", "age", "gender"].some(k => c.includes(k));
}
function mapYNToSchema(_q, yn) { if (yn === "Unknown") return ""; return yn; }

export default function ChatInterview() {
  const { user, token } = useAuth();
  const [schemaCols, setSchemaCols] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState({});
  const [finalResult, setFinalResult] = useState(null);
  const [finalRow, setFinalRow] = useState(null);

  const [expLoading, setExpLoading] = useState(false);
  const [expError, setExpError] = useState("");
  const [expData, setExpData] = useState(null);

  const chatRef = useRef(null);
  const nav = useNavigate();

  const [msgs, setMsgs] = useState([]);

  useEffect(() => {
    (async () => {
      const data = await getSchema();
      setSchemaCols(data.required_columns || []);
      const qs = (data.required_columns || []).filter(isQuestion);
      setQuestions(qs);

      const name = user?.email?.split("@")[0] || "there";
      setMsgs([
        { who:"bot", text:`Hi ${name}! I’m Robo. I’ll guide you through a quick check-in.` },
        { who:"bot", text:`I see age group: ${user?.ageGroup || "—"}, gender: ${user?.gender || "—"}.` },
        { who:"bot", text:`Please answer each question in 1–2 sentences. If I’m unsure, I’ll ask a follow-up.` }
      ]);
    })();
  }, [user]);

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [msgs]);

  const currentQ = useMemo(() => questions[step], [questions, step]);

  useEffect(() => {
    if (!currentQ) return;
    const alreadyAsked = msgs.some(m => m.who === "bot" && m.text.startsWith(`Q${step+1}.`));
    if (!alreadyAsked) setMsgs(prev => [...prev, { who:"bot", text: `Q${step+1}. ${currentQ}` }]);
    // eslint-disable-next-line
  }, [currentQ]);

  const onSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || busy || !currentQ) return;
    const text = input.trim();
    setInput("");
    setMsgs(prev => [...prev, { who:"user", text }]);

    setBusy(true);
    try {
      const data = await postPredictTextPerQuestion({ text, questions: [currentQ] }, { threshold: 0.7 });
      const res = data?.results?.[0]?.per_question?.[0];

      if (!res) { setMsgs(prev => [...prev, { who:"bot", text:"I couldn't parse that. Could you rephrase?" }]); setBusy(false); return; }
      if (res.prediction === "Unknown") { setMsgs(prev => [...prev, { who:"bot", text:"I’m not sure yet. Could you clarify briefly?" }]); setBusy(false); return; }

      const mapped = mapYNToSchema(currentQ, res.prediction);
      setAnswers(prev => ({ ...prev, [currentQ]: mapped }));
      setMsgs(prev => [...prev, { who:"bot", text:`Understood: ${res.prediction} (conf ${(res.confidence*100).toFixed(0)}%).` }]);

      const next = step + 1;
      if (next < questions.length) setStep(next);
      else await finalize();
    } catch (err) {
      setMsgs(prev => [...prev, { who:"bot", text:`Error: ${err?.response?.data?.detail || err.message}` }]);
    } finally { setBusy(false); }
  };

  async function finalize() {
    const row = {};
    for (const c of schemaCols) {
      if (c.toLowerCase().includes("timestamp")) row[c] = nowStamp();
      else if (c.toLowerCase().includes("age")) row[c] = user?.ageGroup || "";
      else if (c.toLowerCase().includes("gender")) row[c] = user?.gender || "";
      else if (isQuestion(c)) row[c] = answers[c] || "";
      else row[c] = "";
    }

    const missing = Object.entries(row).filter(([k,v]) => isQuestion(k) && !String(v).trim()).map(([k])=>k);
    if (missing.length) {
      setMsgs(prev => [...prev, { who:"bot", text:`I still need clearer info for: ${missing.join("; ")}` }, { who:"bot", text:`Please add a sentence about those and I’ll ask again.` }]);
      const idx = questions.findIndex(q => q === missing[0]); if (idx >= 0) setStep(idx);
      return;
    }

    setMsgs(prev => [...prev, { who:"bot", text:`Thanks! Crunching your overall screening…` }]);
    try {
      const pred = await postPredict({ data: row });
      setFinalRow(row);
      const result = pred?.results?.[0] || null;
      setFinalResult(result);

      if (result) {
        setMsgs(prev => [
          ...prev,
          { who:"bot", text:`Overall screening: ${result.prediction}` },
          { who:"bot", text: typeof result.confidence === "number" ? `Confidence: ${(result.confidence*100).toFixed(1)}%` : `Confidence: n/a` }
        ]);
      } else {
        setMsgs(prev => [...prev, { who:"bot", text:`I couldn’t compute the overall result.` }]);
      }
    } catch (e) {
      setMsgs(prev => [...prev, { who:"bot", text:`Prediction failed: ${e?.response?.data?.detail || e.message}` }]);
    }
  }

  const onExplain = async () => {
    if (!finalRow) return;
    setExpError(""); setExpLoading(true);
    try {
      const exp = await postExplainRow(finalRow);
      setExpData(exp);
      const short = exp?.explanation?.summary_markdown?.replace(/\*\*/g, "") || "Explanation ready.";
      setMsgs(prev => [...prev, { who:"bot", text: short }]);
    } catch (e) {
      setExpError(e?.response?.data?.detail || e.message);
    } finally {
      setExpLoading(false);
    }
  };

  const onDone = async () => {
    try { await clearTasks(token); } catch {}
    try { await clearDayplan(token); } catch {}
    nav("/tasks", { replace: true });
  };

  return (
    <div className="chatpage" style={{ background: "#f9fafb", color: "#333" }}>
      <header className="chatheader" style={{ background: "#e0f2fe", borderBottom: "1px solid #bae6fd" }}>
        <div className="chatpeer">
          <img className="avatar big pulse" src={girlImg} alt="User" onError={(e)=>{e.currentTarget.style.display="none"}} />
          <div className="fallback big">👧</div>
          <div>
            <div className="title" style={{ color: "#0369a1" }}>You</div>
            <div className="subtitle" style={{ color: "#555" }}>{user?.email}</div>
          </div>
        </div>
        <div className="chatpeer">
          <img className="avatar big float" src={robotImg} alt="Robo" onError={(e)=>{e.currentTarget.style.display="none"}} />
          <div className="fallback big">🤖</div>
          <div>
            <div className="title" style={{ color: "#0369a1" }}>Robo</div>
            <div className="subtitle" style={{ color: "#555" }}>Wellness Assistant</div>
          </div>
        </div>
      </header>

      <div className="chatwindow" ref={chatRef} style={{ background: "#ffffff", borderTop: "1px solid #e5e7eb" }}>
        {msgs.map((m, i) => (<Bubble key={i} who={m.who} text={m.text} />))}

        {finalResult && (
          <div className="card" style={{ margin: "12px 52px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 800, color: "#0369a1" }}>Doctor-style explanation</div>
                <div className="muted" style={{ fontSize: 12, color: "#64748b" }}>
                  Method: {expData?.xai_method || (expLoading ? "preparing…" : "—")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onExplain} disabled={expLoading} style={{ background: "#60a5fa", color: "white" }}>
                  {expLoading ? "Explaining…" : "Show explanation"}
                </button>
                <button onClick={onDone} className="composerBtn" style={{ background: "#34d399", color: "white" }}>Done</button>
              </div>
            </div>

            {expError && <div className="error" style={{ marginTop: 8, color: "#b91c1c" }}>XAI error: {expError}</div>}

            {expData && (
              <div style={{ marginTop: 10 }}>
                <div style={{ whiteSpace: "pre-wrap", color: "#1e3a8a" }}>
                  {expData.explanation?.summary_markdown?.replace(/\*\*/g,"")}
                </div>
                {!!(expData.explanation?.top_factors?.length) && (
                  <div style={{ marginTop: 10 }}>
                    <div className="muted" style={{ marginBottom: 6, color: "#64748b" }}>Top contributing answers:</div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: "#1e3a8a" }}>
                      {expData.explanation.top_factors.map((t, idx) => {
                        const sign = t.impact > 0 ? "+" : t.impact < 0 ? "−" : "±";
                        const pct = Math.round(Math.abs(t.impact)*100);
                        return (
                          <li key={idx}>
                            <b>{t.feature}</b>: {t.value} — {t.effect} ({sign}{pct}% of model confidence)
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {!finalResult && (
        <form className="composer" onSubmit={onSend} style={{ background: "#f1f5f9", borderTop: "1px solid #d1d5db" }}>
          <input
            className="composerInput"
            style={{ background: "#fff", border: "1px solid #cbd5e1", color: "#111" }}
            placeholder={busy ? "Analyzing…" : "Type your message"}
            value={input}
            onChange={(e)=>setInput(e.target.value)}
            disabled={busy}
          />
          <button
            className="composerBtn"
            type="submit"
            disabled={busy || !input.trim()}
            style={{ background: "#60a5fa", color: "white" }}
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}

function Bubble({ who, text }) {
  const isUser = who === "user";
  return (
    <div className={`row ${isUser ? "right" : "left"}`}>
      {!isUser && (
        <div className="side">
          <img className="avatar" src={process.env.PUBLIC_URL + "/img/robot.png"} alt="" onError={(e)=>{e.currentTarget.style.display="none"}} />
          <div className="fallback">🤖</div>
        </div>
      )}
      <div
        className={`bubble ${isUser ? "me" : "bot"}`}
        style={{
          background: isUser ? "#dbeafe" : "#ecfdf5",
          color: isUser ? "#1e3a8a" : "#065f46",
          border: isUser ? "1px solid #93c5fd" : "1px solid #6ee7b7",
          borderRadius: 16
        }}
      >
        {text}
      </div>
      {isUser && (
        <div className="side">
          <img className="avatar" src={process.env.PUBLIC_URL + "/img/girl.png"} alt="" onError={(e)=>{e.currentTarget.style.display="none"}} />
          <div className="fallback">👧</div>
        </div>
      )}
    </div>
  );
}
