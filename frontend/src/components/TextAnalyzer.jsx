import React, { useEffect, useMemo, useState } from "react";
import { getSchema, postPredictText, postPredictTextPerQuestion } from "../api";

export default function TextAnalyzer() {
  const [fields, setFields] = useState([]);
  const [text, setText] = useState("");
  const [threshold, setThreshold] = useState(0.7);
  const [subset, setSubset] = useState([]); // optional selected questions
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [err, setErr] = useState("");
  const [resSingle, setResSingle] = useState(null);
  const [resPerQ, setResPerQ] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoadingSchema(true);
        const data = await getSchema();
        setFields(data?.required_columns || []);
      } catch (e) {
        setErr(e?.response?.data?.detail || e?.message || "Failed to load schema");
      } finally {
        setLoadingSchema(false);
      }
    })();
  }, []);

  const questionCols = useMemo(() => {
    const lower = (s) => s.trim().toLowerCase();
    return fields.filter((c) => !["timestamp","age","gender"].some(k => lower(c).includes(k)));
  }, [fields]);

  const doPredict = async () => {
    setErr("");
    setResSingle(null);
    setResPerQ(null);
    if (!text.trim()) { setErr("Please type 1–3 sentences."); return; }
    try {
      setSubmitting(true);
      // 1) quick single Yes/No
      const r1 = await postPredictText({ text }, { threshold });
      setResSingle(r1?.results?.[0] || null);
      // 2) per-question
      const payload = subset.length ? { text, questions: subset } : { text };
      const r2 = await postPredictTextPerQuestion(payload, { threshold });
      setResPerQ(r2?.results?.[0] || null);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Prediction failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2>Free-text Analyzer</h2>
      <p className="muted">Type 1–3 sentences describing the last two weeks (sleep, appetite, mood, energy, focus, guilt, support).</p>

      {loadingSchema ? <div>Loading…</div> : (
        <>
          <label className="field">
            <span>Text</span>
            <textarea rows={4} value={text} onChange={(e)=>setText(e.target.value)} placeholder="e.g., I can't sleep, lost appetite, and feel hopeless about work." />
          </label>

          <div className="grid" style={{gridTemplateColumns:"1fr 1fr", gap:12}}>
            <label className="field">
              <span>Confidence threshold: {threshold}</span>
              <input type="range" min="0.5" max="0.9" step="0.05" value={threshold} onChange={(e)=>setThreshold(parseFloat(e.target.value))}/>
            </label>
            <label className="field">
              <span>Subset of questions (optional)</span>
              <select multiple value={subset} onChange={(e)=>setSubset(Array.from(e.target.selectedOptions).map(o=>o.value))}>
                {questionCols.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <small className="muted">Hold Ctrl/Cmd to multi-select. Leave empty to score all questions.</small>
            </label>
          </div>

          <div className="actions">
            <button onClick={doPredict} disabled={submitting}>{submitting ? "Analyzing…" : "Analyze"}</button>
          </div>

          {err && <div className="error">Error: {err}</div>}

          <hr />
          <h3>Single Yes/No (overall)</h3>
          {!resSingle && <div className="muted">No result yet.</div>}
          {resSingle && (
            <pre className="result">{JSON.stringify(resSingle, null, 2)}</pre>
          )}

          <h3>Per-question Yes/No/Unknown</h3>
          {!resPerQ && <div className="muted">No result yet.</div>}
          {resPerQ && (
            <div className="table">
              <div className="thead">
                <div>Question</div>
                <div>Answer</div>
                <div>Confidence</div>
              </div>
              <div className="tbody">
                {resPerQ.per_question.map((row, i) => (
                  <div className="tr" key={i}>
                    <div className="td" title={row.question}>{row.question}</div>
                    <div className="td">
                      <span className={`badge ${row.prediction.toLowerCase()}`}>{row.prediction}</span>
                      {row.low_confidence ? <span className="badge warn">low</span> : null}
                    </div>
                    <div className="td">{(row.confidence*100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <style>{`
            textarea { padding: 10px 12px; border-radius: 10px; border: 1px solid #2a335e; background:#0f1530; color:var(--text); }
            select { min-height: 120px; padding: 8px; border-radius: 10px; border: 1px solid #2a335e; background:#0f1530; color:var(--text); }
            .table { display:grid; gap:6px; margin-top:8px; }
            .thead, .tr { display:grid; grid-template-columns: 2fr 0.8fr 0.8fr; gap:8px; }
            .thead { color:var(--muted); font-weight:700; }
            .badge { padding:2px 8px; border-radius:999px; font-size:12px; background:#2a335e; margin-right:6px; }
            .badge.yes { background:#43d08a; color:#052a1f; }
            .badge.no { background:#ff6b6b; color:#2b0a0a; }
            .badge.unknown { background:#888; color:#111; }
            .badge.warn { background:#ffc260; color:#3a2800; }
          `}</style>
        </>
      )}
    </div>
  );
}
