import React, { useEffect, useMemo, useState } from "react";
import { getSchema, postPredict, getHistory } from "../api";

// Map field names to select options
const OPTIONS = {
  "What is Your Age group?": ["18-24", "25-34", "35-44", "45-54", "55+"],
  "What is Your Gender": ["Male", "Female", "Other", "Prefer not to say"],
  // Yes/No/Sometimes defaults:
  defaultYN: ["Yes", "No", "Sometimes"],
  defaultFreq: ["Never", "Rarely", "Sometimes", "Often", "Always"],
};

// Heuristics: pick a widget based on field text
function pickWidget(field) {
  const f = field.toLowerCase();
  if (field in OPTIONS) return { type: "select", options: OPTIONS[field] };
  if (f.includes("how often")) return { type: "select", options: OPTIONS.defaultFreq };
  // many of your questions are yes/no style:
  if (f.includes("do you") || f.includes("have you") || f.includes("lately")) {
    return { type: "select", options: OPTIONS.defaultYN };
  }
  if (f.includes("timestamp")) return { type: "text", placeholder: "YYYY-MM-DD HH:mm" };
  return { type: "text", placeholder: "Type your answer" };
}

const defaultValueFor = (field, widget) => {
  if (widget.type === "select") return widget.options[0];
  if (field.toLowerCase().includes("timestamp")) {
    return new Date().toISOString().slice(0, 16).replace("T", " ");
  }
  return "";
};

export default function SchemaForm() {
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [schemaErr, setSchemaErr] = useState("");
  const [fields, setFields] = useState([]);
  const [widgets, setWidgets] = useState({});
  const [modelFile, setModelFile] = useState("");

  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [predictErr, setPredictErr] = useState("");

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoadingSchema(true);
        const data = await getSchema();
        const cols = data?.required_columns || [];
        setFields(cols);
        setModelFile(data?.model_file || "");
        // decide widgets
        const w = {};
        cols.forEach((c) => (w[c] = pickWidget(c)));
        setWidgets(w);
        // init defaults
        const initial = {};
        cols.forEach((c) => (initial[c] = defaultValueFor(c, w[c])));
        setForm(initial);
      } catch (e) {
        setSchemaErr(e?.response?.data?.detail || e?.message || "Failed to load schema.");
      } finally {
        setLoadingSchema(false);
      }
    })();
  }, []);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await getHistory();
      setHistory(data?.logs || []);
    } catch (e) {
      // non-fatal
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const missingRequired = useMemo(() => {
    return fields.filter((f) => !String(form[f] ?? "").trim());
  }, [fields, form]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setPredictErr("");
    setResult(null);
    if (missingRequired.length) {
      setPredictErr(`Please fill all fields. Missing: ${missingRequired.join(", ")}`);
      return;
    }
    try {
      setSubmitting(true);
      const payload = { data: { ...form } };
      const data = await postPredict(payload);
      const first = data?.results?.[0];
      setResult(first || null);
      // refresh history after success
      loadHistory();
    } catch (e) {
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data ||
        e?.message ||
        "Prediction failed.";
      setPredictErr(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSchema) return <div className="card">Loading schema…</div>;
  if (schemaErr) return <div className="card error">Schema error: {schemaErr}</div>;

  return (
    <>
      <div className="card">
        <h2>Depression Level Predictor</h2>
        {modelFile && <p className="muted">Model: {modelFile}</p>}

        <form onSubmit={onSubmit} className="grid">
          {fields.map((field) => {
            const widget = widgets[field] || { type: "text" };
            return (
              <label key={field} className="field">
                <span>{field} <b style={{color:"#6ea2ff"}}>*</b></span>
                {widget.type === "select" ? (
                  <select
                    value={form[field] ?? ""}
                    onChange={(e) => handleChange(field, e.target.value)}
                  >
                    {widget.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form[field] ?? ""}
                    onChange={(e) => handleChange(field, e.target.value)}
                    placeholder={widget.placeholder || "Type your answer"}
                  />
                )}
              </label>
            );
          })}
          <div className="actions">
            <button type="submit" disabled={submitting}>
              {submitting ? "Predicting…" : "Predict"}
            </button>
          </div>
        </form>

        {predictErr && <div className="error">Error: {predictErr}</div>}
        <hr />
        <h3>Result</h3>
        {!result && <div className="muted">No prediction yet.</div>}
        {result && <pre className="result">{JSON.stringify(result, null, 2)}</pre>}
      </div>

      <div className="card">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <h3>History</h3>
          <button onClick={loadHistory} disabled={loadingHistory}>
            {loadingHistory ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {/* Lightweight table (or use the separate component) */}
        {(!history || history.length === 0) ? (
          <div className="muted">No history yet.</div>
        ) : (
          <div className="table">
            <div className="thead">
              <div>Timestamp</div>
              <div>Prediction</div>
              <div>Confidence</div>
            </div>
            <div className="tbody">
              {history.map((row, idx) => {
                const pred = row?.result?.prediction ?? "-";
                const conf = row?.result?.confidence;
                return (
                  <div className="tr" key={idx}>
                    <div className="td">{row.ts}</div>
                    <div className="td">{String(pred)}</div>
                    <div className="td">
                      {typeof conf === "number" ? `${(conf * 100).toFixed(1)}%` : "-"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        select { padding: 10px 12px; border-radius: 10px; border: 1px solid #2a335e; background: #0f1530; color: var(--text); }
        .table { display: grid; gap: 6px; }
        .thead, .tr { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 8px; }
        .thead { font-weight: 700; color: var(--muted); }
        .td { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      `}</style>
    </>
  );
}
