from pathlib import Path
from typing import Any, Dict, List, Union, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Zero-shot imports 
import threading
try:
    from transformers import pipeline #NLP Zero-shot classification (BART-MNLI) use
    _TRANSFORMERS_AVAILABLE = True
except Exception:  # pragma: no cover
    _TRANSFORMERS_AVAILABLE = False

#  Optional SHAP (XAI) 
try:
    import shap  # type: ignore
    _SHAP_AVAILABLE = True
except Exception:
    _SHAP_AVAILABLE = False


# models folder path, pre-trained models and preprocessor save foldr

PROJ = Path(__file__).resolve().parents[1]
MODELS = PROJ / "models"

# Load preprocessor scaling encoding imputing
pre = joblib.load(MODELS / "preprocessor.joblib")

# choose tuned, calibrated model; fall back to any model
cands = sorted(MODELS.glob("*_tuned_calibrated.joblib"))
model_path = cands[0] if cands else None
if model_path is None:
    any_model = sorted(MODELS.glob("*.joblib"))
    if not any_model:
        raise RuntimeError("No model artifacts found in models/.")
    model_path = any_model[0]

model = joblib.load(model_path)

# Recover numeric categoricl  raw input columns from the preprocessor
num_cols = list(pre.transformers_[0][2])
cat_cols = list(pre.transformers_[1][2])
RAW_COLS = list(num_cols) + list(cat_cols) #training schema expected input columns


# FastAPI setup

app = FastAPI(title="Depression Level Inference API", version="1.5.0")

# CORS open by Frontend/browser request allow
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


# API request payload validate

class PredictPayload(BaseModel):
    # Accept either a single row (dict) or a list of rows (list[dict])
    data: Union[Dict[str, Any], List[Dict[str, Any]]]

class TextPayload(BaseModel):
    # Accept single string or list of strings
    text: Union[str, List[str]]

class PerQuestionPayload(BaseModel):
    # Free text or list of texts; optional subset of questions to score
    text: Union[str, List[str]]
    questions: Optional[List[str]] = None


# Helpers input data cheked missing error raise

def _ensure_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Validate and order columns to match training schema."""
    missing = [c for c in RAW_COLS if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {missing}")
    # Drop extras and reorder
    return df[RAW_COLS].copy()
    #add preproceer
def _transform(df: pd.DataFrame):
    X = pre.transform(df)
    if hasattr(X, "toarray"):  # sparse -> dense if needed
        X = X.toarray()
    return X

def _predict_df(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Run preprocessing + model prediction and format the response."""
    X = _transform(df)
    preds = model.predict(X)
    probs = model.predict_proba(X) if hasattr(model, "predict_proba") else None

    results: List[Dict[str, Any]] = []
    for i, y in enumerate(preds):
        item: Dict[str, Any] = {"prediction": str(y)}
        if probs is not None:
            item["confidence"] = float(probs[i].max())
            # If the number of classes is small, expose per-class probabilities too
            if probs.shape[1] <= 5:
                for j, p in enumerate(probs[i]):
                    item[f"prob_class_{j}"] = float(p)
        results.append(item)
    return results

def _predict_proba(df: pd.DataFrame) -> np.ndarray:
    X = _transform(df)
    if hasattr(model, "predict_proba"):
        return model.predict_proba(X)
    # Model probability not support , fallback: 0/1 prediction generate 
    pred = model.predict(X)
    # binary classcification case check
    if len(getattr(model, "classes_", [])) == 2:
        probs = np.zeros((len(pred), 2), dtype=float)
        probs[np.arange(len(pred)), (pred == model.classes_[1]).astype(int)] = 1.0
        return probs
    # Multiclass but no proba 
    k = len(getattr(model, "classes_", [0, 1]))
    return np.ones((len(pred), k), dtype=float) / float(k)


# Zero-shot NLP (free-text Yes/No)

_zs_lock = threading.Lock()
_zs_clf = None  # set on first use

def _get_zero_shot():
    if not _TRANSFORMERS_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="Transformers is not installed. Please `pip install transformers torch` in the API environment."
        )
    global _zs_clf
    if _zs_clf is None:
        with _zs_lock:
            if _zs_clf is None:
                # You can swap to facebook/bart-large-mnli model use
                _zs_clf = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
    return _zs_clf

def _infer_yes_no_from_text(text: str) -> Dict[str, Any]:
    """
    Use zero-shot NLI to map free text to {Yes/No} for "depressed" vs "not depressed".
    """
    clf = _get_zero_shot()
    candidate_labels = ["depressed", "not depressed"]
    hypothesis_template = "This statement indicates the person is {}." #ero-shot classification BART-MNLI model  Natural Language Inference (NLI) use
    out = clf(
        sequences=text,
        candidate_labels=candidate_labels,
        multi_label=False,
        hypothesis_template=hypothesis_template
    )
    # get top label
    top_label = out["labels"][0]
    top_score = float(out["scores"][0])
    second_score = float(out["scores"][1]) if len(out["scores"]) > 1 else 0.0
    margin = top_score - second_score

    # Convert to strict Yes/No
    pred = "Yes" if top_label == "depressed" else "No"

    # Simple confidence shaping using margin
    confidence = top_score * max(0.5, min(1.0, 0.5 + margin))

    return {
        "prediction": pred,
        "confidence": round(confidence, 4),
        "model": "facebook/bart-large-mnli",
        "raw": {
            "labels": out["labels"],
            "scores": [float(s) for s in out["scores"]],
        },
    }


# Per-question zero-shot helpers

DEMOGRAPHIC_KEYS = {"timestamp", "age", "gender"}

def _is_question_col(col: str) -> bool:
    c = col.strip().lower()
    if any(k in c for k in DEMOGRAPHIC_KEYS):
        return False
    # check only columns that exist in training schema
    return col in RAW_COLS

def _question_columns() -> List[str]:
    # real questions colom list
    return [c for c in RAW_COLS if _is_question_col(c)]

def _yesno_or_unknown(
    q: str,
    yes_score: float,
    no_score: float,
    threshold: Optional[float]
) -> Dict[str, Any]:
    """
    Convert raw yes/no scores into Yes/No/Unknown with a practical abstention policy.
    """
    top = max(yes_score, no_score)
    margin = abs(yes_score - no_score)

    MIN_CONF = float(threshold) if threshold is not None else 0.65
    MIN_MARGIN = 0.15

    if top < MIN_CONF or margin < MIN_MARGIN:
        return {
            "question": q,
            "prediction": "Unknown",
            "confidence": round(float(top), 4),
            "raw": {"yes": float(yes_score), "no": float(no_score)},
            "low_confidence": True
        }

    label = "Yes" if yes_score >= no_score else "No"
    conf = top * max(0.5, min(1.0, 0.5 + margin))
    return {
        "question": q,
        "prediction": label,
        "confidence": round(float(conf), 4),
        "raw": {"yes": float(yes_score), "no": float(no_score)},
        "low_confidence": bool(conf < MIN_CONF)
    }


# XAI helpers (SHAP or local sensitivity)

def _baseline_row_from_pre() -> Dict[str, Any]:
    """
    Build a plausible baseline row using the imputers inside the preprocessor.
    Numeric -> imputer.statistics_ (median/mean), Categorical -> most_frequent.
    Fallback to empty string or 0 if not found.
    """
    baseline: Dict[str, Any] = {}
    # Numeric pipeline is usually at index 0
    num_pipe = pre.transformers_[0][1]
    num_stats = getattr(getattr(num_pipe, "steps", [])[0][1], "statistics_", None) if getattr(num_pipe, "steps", None) else None
    # Categorical pipeline at index 1
    cat_pipe = pre.transformers_[1][1]
    cat_stats = getattr(getattr(cat_pipe, "steps", [])[0][1], "statistics_", None) if getattr(cat_pipe, "steps", None) else None
    #safe default values assign
    for c in RAW_COLS:
        if c in num_cols:
            if num_stats is not None:
                idx = num_cols.index(c)
                baseline[c] = float(num_stats[idx])
            else:
                baseline[c] = 0.0
        elif c in cat_cols:
            if cat_stats is not None:
                idx = cat_cols.index(c)
                baseline[c] = str(cat_stats[idx])
            else:
                baseline[c] = ""
        else:
            baseline[c] = "" #baseline/reference row  generate for xai
    return baseline

def _local_sensitivity_attributions(row_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Fast, deterministic local explanation:
    For each raw feature, replace with baseline value, recompute predicted-class probability,
    and take delta as the contribution (positive = pushes toward predicted class).
    """
    base_row = _baseline_row_from_pre()
    baseline_df = pd.DataFrame([base_row])[RAW_COLS]
    # Original proba & predicted class
    proba = _predict_proba(row_df)[0]
    pred_idx = int(np.argmax(proba))
    p_star = float(proba[pred_idx])

    atts: List[Dict[str, Any]] = []
    for c in RAW_COLS:
        alt = row_df.copy()
        alt[c] = baseline_df[c].iloc[0]
        p_alt = float(_predict_proba(alt)[0][pred_idx])
        delta = p_star - p_alt  # >0 means current value increases predicted class probability
        direction = "risk_up" if delta > 0 else ("risk_down" if delta < 0 else "neutral")
        atts.append({
            "feature": c,
            "value": row_df[c].iloc[0],
            "baseline": baseline_df[c].iloc[0],
            "delta_pred_prob": round(delta, 6),
            "direction": direction
        })
    # Sort by absolute impact size strenght
    atts.sort(key=lambda x: abs(x["delta_pred_prob"]), reverse=True)
    return atts

def _doctor_style_summary(pred_label: str, confidence: Optional[float], atts: List[Dict[str, Any]], top_k: int = 5) -> Dict[str, Any]:
    """
    Concise summary (kept for backward compatibility). 
    """
    #model result  doctor-like readable text
    lead = []
    for a in atts[:top_k]:
        if a["direction"] == "risk_up":
            lead.append(f"“{a['feature']}” as answered ({a['value']}) increased the likelihood of {pred_label}.")
        elif a["direction"] == "risk_down":
            lead.append(f"“{a['feature']}” as answered ({a['value']}) decreased the likelihood of {pred_label}.")
    lead_txt = " ".join(lead) if lead else "Your responses had a balanced effect without a single dominant driver."

    ctxt = f" (confidence {confidence:.0%})" if isinstance(confidence, float) else ""
    note = (
        f"Result: **{pred_label}**{ctxt}. "
        f"{lead_txt} "
        "These patterns can reflect mood changes, energy/sleep/appetite shifts, and cognitive load at work. "
        "This is a screening explanation, not a medical diagnosis."
    )
    table = [{
        "feature": a["feature"],
        "value": a["value"],
        "impact": a["delta_pred_prob"],
        "effect": "↑ risk" if a["direction"] == "risk_up" else ("↓ risk" if a["direction"] == "risk_down" else "neutral")
    } for a in atts[:top_k]]

    return {"summary_markdown": note, "top_factors": table}

def _shap_attributions(row_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Try SHAP on the *raw* schema by wrapping f(raw)->proba(pred_class).
    For robustness across model types, we’ll compute SHAP for the predicted class probability.
    """
    # Choose predicted class first
    proba = _predict_proba(row_df)[0]
    pred_idx = int(np.argmax(proba))

    # f: raw df raw input predicted probabilityclass 
    def f(X_raw: np.ndarray) -> np.ndarray:
        cols = RAW_COLS
        df_tmp = pd.DataFrame(X_raw, columns=cols)
        p = _predict_proba(df_tmp)
        return p[:, pred_idx:pred_idx+1]  # SHAP expects 2D output

    baseline = _baseline_row_from_pre()
    bg = pd.DataFrame([baseline])[RAW_COLS]
    masker = shap.maskers.Independent(bg, max_samples=50)

    explainer = shap.Explainer(f, masker=masker, algorithm="permutation")
    vals = explainer(row_df.values, silent=True)  # single sample
    contrib = vals.values[0, :, 0]
    atts = []
    for j, c in enumerate(RAW_COLS):
        direction = "risk_up" if contrib[j] > 0 else ("risk_down" if contrib[j] < 0 else "neutral")
        atts.append({
            "feature": c,
            "value": row_df[c].iloc[0],
            "baseline": baseline[c],
            "delta_pred_prob": float(contrib[j]),
            "direction": direction
        })
    atts.sort(key=lambda x: abs(x["delta_pred_prob"]), reverse=True)
    return atts

# Rich clinician-style narrative helpers 
SYMPTOM_KEYWORDS = {
    "mood": ["sad", "hopeless", "unhappy", "down", "tearful"],
    "anhedonia": ["unhappy even when", "don’t enjoy", "not enjoy", "pleasure"],
    "sleep": ["sleep", "waking early", "falling asleep", "too much"],
    "appetite": ["appetite", "eating", "much less", "less than usual"],
    "energy": ["tired", "fatigue", "lack energy", "exhausted"],
    "guilt_worthlessness": ["guilty", "worthless", "blame"],
    "concentration": ["focus", "concentrat", "hard to stay", "forget", "mistakes"],
    "psychomotor": ["moving slowly", "restless", "agitated"],
    "death": ["hopeless about future", "giving up", "life", "death", "suicid"],
}

def _detect_symptom_domains(raw_row: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    Use question text + user's yes/no to infer DSM-like symptom domains.
    """
    domains = {k: {"present": False, "evidence": []} for k in SYMPTOM_KEYWORDS.keys()}
    for q, ans in raw_row.items():
        ql = str(q).lower()
        al = str(ans).strip().lower()
        if al not in {"yes", "no"}:
            continue
        for dom, kws in SYMPTOM_KEYWORDS.items():
            if any(kw in ql for kw in kws):
                if al == "yes":
                    domains[dom]["present"] = True
                    domains[dom]["evidence"].append(q)
    return domains

def _severity_phrase(pred_label: str, conf: Optional[float]) -> str:
    ctxt = f" (confidence {conf:.0%})" if isinstance(conf, float) else ""
    label = pred_label.strip().lower()
    if "severe" in label:
        return f"Screening impression: **Severe depressive symptoms**{ctxt}."
    if "moderate" in label:
        return f"Screening impression: **Moderate depressive symptoms**{ctxt}."
    if "mild" in label:
        return f"Screening impression: **Mild depressive symptoms**{ctxt}."
    if "none" in label or "no" in label or "not depressed" in label:
        return f"Screening impression: **No significant depressive pattern detected**{ctxt}."
    return f"Screening impression: **{pred_label}**{ctxt}."

def _doctor_style_narrative(pred_label: str,
                            confidence: Optional[float],
                            atts: List[Dict[str, Any]],
                            raw_row: Dict[str, Any],
                            top_k: int = 5) -> Dict[str, Any]:
    """
    Build a comprehensive, clinician-style narrative.
    """
    # Top drivers
    lead_bits = []
    for a in atts[:top_k]:
        feat = a['feature']
        val  = a['value']
        if a['direction'] == 'risk_up':
            lead_bits.append(f"• **{feat}** as answered (**{val}**) increased the model’s estimate.")
        elif a['direction'] == 'risk_down':
            lead_bits.append(f"• **{feat}** as answered (**{val}**) reduced the model’s estimate.")
    if not lead_bits:
        lead_bits = ["• No individual answer dominated the result; the pattern was balanced."]

    # Symptom domains
    doms = _detect_symptom_domains(raw_row)
    present = [d for d,v in doms.items() if v["present"]]
    absent  = [d for d,v in doms.items() if not v["present"] and v["evidence"]]
    nice = {
        "mood":"low mood",
        "anhedonia":"loss of interest/pleasure",
        "sleep":"sleep disturbance",
        "appetite":"appetite/weight change",
        "energy":"low energy/fatigue",
        "guilt_worthlessness":"guilt/worthlessness",
        "concentration":"concentration difficulty",
        "psychomotor":"psychomotor change",
        "death":"thoughts of death/hopelessness"
    }
    present_readable = ", ".join(nice[d] for d in present) if present else "no core mood symptoms flagged"
    absent_readable  = ", ".join(nice[d] for d in absent)  if absent  else "none specifically reduced"

    header = _severity_phrase(pred_label, confidence)

    if "severe" in pred_label.lower() or "moderate" in pred_label.lower():
        next_steps = (
            "• Consider talking with a licensed clinician (primary care or mental health).\n"
            "• Evidence-based options include cognitive-behavioral therapy (CBT) and, where appropriate, medication.\n"
            "• If you’re in crisis or having thoughts of self-harm, **seek immediate help** (local emergency services or a crisis hotline)."
        )
    elif "mild" in pred_label.lower():
        next_steps = (
            "• Try structured self-care: consistent sleep, brief daylight activity, and scheduled pleasant activities.\n"
            "• If symptoms persist or worsen, consider a professional consultation."
        )
    else:
        next_steps = (
            "• Keep monitoring your mood and routines. If changes appear or persist, consider a check-in with a professional."
        )

    crisis_line = ""
    if doms.get("death", {}).get("present"):
        crisis_line = (
            "\n\n**Important:** Your responses hint at hopelessness or thoughts about life. If you feel unsafe or at risk, "
            "please contact your local emergency number or a crisis hotline right now."
        )

    narrative = (
        f"{header}\n\n"
        f"**What seems to be driving this result**\n"
        f"{chr(10).join(lead_bits)}\n\n"
        f"**Symptom pattern (screening, not diagnosis)**\n"
        f"• Present: {present_readable}\n"
        f"• Less evident in answers: {absent_readable}\n\n"
        f"**What you can consider next**\n{next_steps}"
        f"{crisis_line}\n\n"
        "_This is a screening explanation from a machine-learning model and does not replace a clinical evaluation._"
    )

    table = [{
        "feature": a["feature"],
        "value": a["value"],
        "impact": a["delta_pred_prob"],
        "effect": "↑ risk" if a["direction"] == "risk_up" else ("↓ risk" if a["direction"] == "risk_down" else "neutral")
    } for a in atts[:top_k]]

    return {
        "summary_markdown": narrative,
        "top_factors": table,
        "symptom_domains": {k: {"present": v["present"], "evidence": v["evidence"]} for k,v in doms.items()},
        "next_steps": next_steps
    }

def _explain_row(df_row: pd.DataFrame) -> Dict[str, Any]:
    """
    Main XAI entry: returns prediction + attributions + rich clinician-style narrative.
    """
    pred_pack = _predict_df(df_row)[0]
    pred_label = pred_pack.get("prediction", "Unknown")
    confidence = pred_pack.get("confidence", None)

    try:
        if _SHAP_AVAILABLE:
            atts = _shap_attributions(df_row)
        else:
            atts = _local_sensitivity_attributions(df_row)
    except Exception:
        atts = _local_sensitivity_attributions(df_row)

    raw_row = {c: df_row[c].iloc[0] for c in df_row.columns}
    narrative = _doctor_style_narrative(pred_label, confidence, atts, raw_row, top_k=5)

    return {
        "prediction": pred_label,
        "confidence": confidence,
        "attributions": atts,
        "explanation": narrative,
        "xai_method": "shap" if _SHAP_AVAILABLE else "local_sensitivity",
    }


# Endpoints

@app.get("/health")
def health():
    return {"status": "ok", "model_file": model_path.name}

@app.get("/schema")
def schema():
    """Return exact required raw input columns and the active model file."""
    return {"required_columns": RAW_COLS, "model_file": model_path.name}

@app.post("/predict")
def predict(payload: PredictPayload):
    # Normalize to a list of dicts
    rows = payload.data
    if isinstance(rows, dict):
        rows = [rows]

    if not isinstance(rows, list) or not rows:
        raise HTTPException(status_code=400, detail="`data` must be a non-empty object or list of objects.")

    df = pd.DataFrame(rows)
    df = _ensure_columns(df)
    return {"results": _predict_df(df)}

@app.post("/predict_text")
def predict_text(
    payload: TextPayload,
    threshold: Optional[float] = Query(
        None,
        description="Optional confidence threshold (0-1). If provided, responses will include `low_confidence: true` when confidence < threshold."
    )
):
    """
    Zero-shot Yes/No from free text using BART-MNLI.
    Body accepts:
      { "text": "single sentence" }  OR  { "text": ["s1", "s2"] }
    """
    texts = payload.text if isinstance(payload.text, list) else [payload.text]
    if not texts or not all(isinstance(t, str) and t.strip() for t in texts):
        raise HTTPException(status_code=400, detail="Provide non-empty `text` (string or list of strings).")

    results = []
    for t in texts:
        r = _infer_yes_no_from_text(t)
        if threshold is not None:
            r["low_confidence"] = bool(r["confidence"] < float(threshold))
        results.append(r)
    return {"results": results}

@app.post("/predict_text_per_question")
def predict_text_per_question(
    payload: PerQuestionPayload,
    threshold: Optional[float] = Query(
        None,
        description="Optional confidence threshold (0-1). If set, each question may return 'Unknown' below threshold or with low margin."
    )
):
    """
    For each question column, decide Yes/No/Unknown from the input text using zero-shot NLI with a question-aware template.
    Body:
      {
        "text": "single sentence" | ["s1","s2"],
        "questions": ["Q1","Q2"]  # optional; defaults to all questionnaire columns (excludes demographics)
      }
    """
    texts = payload.text if isinstance(payload.text, list) else [payload.text]
    if not texts or not all(isinstance(t, str) and t.strip() for t in texts):
        raise HTTPException(status_code=400, detail="Provide non-empty `text` (string or list of strings).")

    if payload.questions:
        qcols = payload.questions
        missing = [q for q in qcols if q not in RAW_COLS]
        if missing:
            raise HTTPException(status_code=400, detail=f"Unknown question columns: {missing}")
    else:
        qcols = _question_columns()

    clf = _get_zero_shot()
    results_batch: List[Dict[str, Any]] = []
    for txt in texts:
        perq = []
        for q in qcols:
            out = clf(
                sequences=txt,
                candidate_labels=["Yes", "No"],
                multi_label=False,
                hypothesis_template=f"{q} Answer is {{}}."
            )
            labels = out["labels"]
            scores = out["scores"]
            yes_score = float(scores[labels.index("Yes")]) if "Yes" in labels else 0.0
            no_score  = float(scores[labels.index("No")])  if "No" in labels  else 0.0
            top = _yesno_or_unknown(q, yes_score, no_score, threshold)
            perq.append(top)
        results_batch.append({"text": txt, "per_question": perq})

    return {"results": results_batch}


# NEW: XAI endpoint (for ChatInterview to call)

class ExplainPayload(BaseModel):
    data: Dict[str, Any]  # one row only (same schema as /predict)

@app.post("/explain")
def explain(payload: ExplainPayload):
    if not isinstance(payload.data, dict) or not payload.data:
        raise HTTPException(status_code=400, detail="Provide a non-empty object in `data`.")
    df = pd.DataFrame([payload.data])
    df = _ensure_columns(df)
    try:
        out = _explain_row(df)
        return out
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation failed: {str(e)}")

# Alias so frontend /api/explain also works 
@app.post("/api/explain")
def explain_alias(payload: ExplainPayload):
    return explain(payload)
