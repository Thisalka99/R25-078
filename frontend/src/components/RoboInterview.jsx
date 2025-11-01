import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getSchema, postPredict, postPredictTextPerQuestion } from "../api";

// Simple avatars (inline SVG/emoji)
const Robot = () => <span style={{fontSize:28}}>🤖</span>;
const Girl = () => <span style={{fontSize:28}}>👧</span>;

// Helper: current timestamp in your dataset style: "YYYY-MM-DD HH:mm"
function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Heuristic: filter out demographics from questions
function isQuestion(col) {
  const c = col.toLowerCase();
  return !["timestamp", "age", "gender"].some(k => c.includes(k));
}

// Map per-question Yes/No/Unknown into the schema value your model expects.
// If your training expects exactly "Yes"/"No"/"Sometimes"/"Rarely" etc, adjust here.
function mapYNToSchema(question, yn) {
  if (yn === "Unknown") return ""; // will trigger follow-up prompt
  return yn; // "Yes" / "No"
}

export default function RoboInterview() {
  const { user } = useAuth();
  const [schemaCols, setSchemaCols] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0); // which question index
  const [chat, setChat] = useState([]); // [{who:'bot'|'user', text}]
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState({}); // {questionCol: "Yes"/"No"}
  const [finalResult, setFinalResult] = useState(null);
  const [finalRow, setFinalRow] = useState(null);
  const boxRef = useRef(null);

  // Load schema & prep questions
  useEffect(() => {
    (async () => {
      const data = await getSchema();
      setSchemaCols(data.required_columns || []);
      const qs = (data.required_columns || []).filter(isQuestion);
      setQuestions(qs);
      // opening lines
      const name = user?.email?.split("@")[0] || "there";
      const intro = [
        { who:"bot", text: `Hi ${name}! I’m Robo. Let's do a quick check-in.` },
        { who:"bot", text: `I see you're in age group ${user?.ageGroup || "—"} and gender ${user?.gender || "—"}.` },
        { who:"bot", text: `Please answer in 1–2 sentences. If I’m not sure, I’ll ask a short follow-up.` },
      ];
      setChat(intro);
    })();
  }, [user]);

  // Auto scroll chat to bottom
  useEffect(() => {
    boxRef.current?.scrollTo(0, boxRef.current.scrollHeight);
  }, [chat]);

  const currentQuestion = useMemo(() => questions[step], [questions, step]);

  const askNextQuestion = () => {
    if (step >= questions.length) return;
    setChat(prev => [...prev, { who:"bot", text: `Q${step+1}. ${currentQuestion}` }]);
  };

  // Kick off first question when we have them
  useEffect(() => {
    if (questions.length && chat.length && !chat.find(m => m.text.startsWith("Q1."))) {
      askNextQuestion();
    }
    // eslint-disable-next-line
  }, [questions, chat]);

  const onSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || busy || step >= questions.length) return;
    const text = input.trim();
    setInput("");
    setChat(prev => [...prev, { who:"user", text }]);

    setBusy(true);
    try {
      // call per-question endpoint with only this question
      const payload = { text, questions: [currentQuestion] };
      const data = await postPredictTextPerQuestion(payload, { threshold: 0.7 });
      const res = data?.results?.[0]?.per_question?.[0];
      if (!res) {
        setChat(prev => [...prev, { who:"bot", text: "Oops, I couldn't parse that. Can you rephrase?" }]);
        setBusy(false);
        return;
      }

      // Handle Unknown -> ask short follow-up
      if (res.prediction === "Unknown") {
        setChat(prev => [...prev,
          { who:"bot", text: `I’m not sure yet about this one. Could you clarify briefly?` }
        ]);
        setBusy(false);
        return; // do not advance step; wait for better answer
      }

      // Save mapped answer and advance
      const mapped = mapYNToSchema(currentQuestion, res.prediction);
      setAnswers(prev => ({ ...prev, [currentQuestion]: mapped }));
      setChat(prev => [...prev, { who:"bot", text: `Got it — I read this as: ${res.prediction} (confidence ${(res.confidence*100).toFixed(0)}%).` }]);

      const next = step + 1;
      if (next < questions.length) {
        setStep(next);
        // ask next question
        setTimeout(askNextQuestion, 300);
      } else {
        // finished all questions -> build full row and predict
        await finalizePrediction();
      }
    } catch (err) {
      setChat(prev => [...prev, { who:"bot", text: `Sorry, something went wrong: ${err?.message || "error"}` }]);
    } finally {
      setBusy(false);
    }
  };

  async function finalizePrediction() {
    // Build a row matching schema: Timestamp + user profile + all question columns
    const row = {};
    for (const c of schemaCols) {
      if (c.toLowerCase().includes("timestamp")) row[c] = nowStamp();
      else if (c.toLowerCase().includes("age")) row[c] = user?.ageGroup || "";
      else if (c.toLowerCase().includes("gender")) row[c] = user?.gender || "";
      else if (isQuestion(c)) row[c] = answers[c] || ""; // if some remained "", model will 400 -> we can loop back
      else row[c] = ""; // safety
    }

    // If any question unanswered, prompt for those
    const missing = Object.entries(row).filter(([k,v]) => isQuestion(k) && !String(v).trim()).map(([k])=>k);
    if (missing.length) {
      setChat(prev => [...prev,
        { who:"bot", text: `I still need clearer info for these: ${missing.join("; ")}` },
        { who:"bot", text: `Please add a short sentence covering them, and I’ll re-ask one by one.` }
      ]);
      // Move step pointer to first missing
      const firstMissingIdx = questions.findIndex(q => q === missing[0]);
      if (firstMissingIdx >= 0) setStep(firstMissingIdx);
      // Ask that question again
      setTimeout(askNextQuestion, 400);
      return;
    }

    // Call /api/predict
    try {
      setChat(prev => [...prev, { who:"bot", text: `Thanks! Calculating your screening result now…` }]);
      const pred = await postPredict({ data: row });
      setFinalRow(row);
      const result = pred?.results?.[0] || null;
      setFinalResult(result);
      if (result) {
        setChat(prev => [...prev,
          { who:"bot", text: `Overall screening: ${result.prediction}` },
          { who:"bot", text: result.confidence != null ? `Confidence: ${(result.confidence*100).toFixed(1)}%` : `Confidence: n/a` }
        ]);
      } else {
        setChat(prev => [...prev, { who:"bot", text: `I couldn’t compute the overall result.` }]);
      }
    } catch (e) {
      setChat(prev => [...prev, { who:"bot", text: `Prediction failed: ${e?.response?.data?.detail || e.message}` }]);
    }
  }

  return (
    <div className="card">
      <h2>Robo Interview</h2>
      <div className="chatbox" ref={boxRef}>
        {chat.map((m, i) => (
          <div key={i} className={`msg ${m.who}`}>
            <div className="avatar">{m.who === "bot" ? <Robot/> : <Girl/>}</div>
            <div className="bubble">{m.text}</div>
          </div>
        ))}
      </div>

      {finalResult ? (
        <>
          <h3>Summary</h3>
          <div className="grid" style={{gap:8}}>
            <div className="field">
              <span>Overall prediction</span>
              <div className="result">{String(finalResult.prediction)}</div>
            </div>
            {typeof finalResult.confidence === "number" && (
              <div className="field">
                <span>Confidence</span>
                <div className="bar"><div className="fill" style={{width:`${(finalResult.confidence*100).toFixed(0)}%`}}/></div>
              </div>
            )}
          </div>
          <details style={{marginTop:8}}>
            <summary>Show per-question answers</summary>
            <ul>
              {questions.map(q => (
                <li key={q}><b>{q}</b>: {answers[q]}</li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <form onSubmit={onSend} className="grid" style={{gridTemplateColumns:"1fr auto", gap:8, marginTop:12}}>
          <input
            value={input}
            onChange={(e)=>setInput(e.target.value)}
            placeholder="Type your sentence answer…"
          />
          <button type="submit" disabled={busy || !currentQuestion}>
            {busy ? "Analyzing…" : (step < questions.length ? "Send" : "Done")}
          </button>
        </form>
      )}

      <style>{`
        .chatbox { max-height: 380px; overflow:auto; background:#0f1530; padding:12px; border-radius:12px; }
        .msg { display:flex; align-items:flex-start; gap:10px; margin-bottom:10px; }
        .msg .avatar { width:34px; height:34px; display:flex; align-items:center; justify-content:center; }
        .bubble { background:#121936; padding:10px 12px; border-radius:12px; max-width: 80%; }
        .msg.user .bubble { background:#1b2550; }
        .bar { height: 10px; background: #2a335e; border-radius: 999px; overflow: hidden; }
        .fill { height:100%; background: var(--accent); }
      `}</style>
    </div>
  );
}
