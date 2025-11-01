"""
Predict depression level for new employee responses.
Usage:
  python -m src.predict --csv path/to/file.csv
  python -m src.predict --json path/to/file.json
"""
import argparse, json, sys
from pathlib import Path
import pandas as pd
import numpy as np
import joblib

PROJ = Path(__file__).resolve().parents[1]
MODELS = PROJ / "models"
REPORTS = PROJ / "reports"
REPORTS.mkdir(exist_ok=True, parents=True)

def find_model_path():
    cands = sorted(MODELS.glob("*_tuned_calibrated.joblib"))
    if cands:
        return cands[0]
    any_model = sorted(MODELS.glob("*.joblib"))
    if any_model:
        return any_model[0]
    raise FileNotFoundError("No model *.joblib found in models/.")

def load_artifacts():
    pre = joblib.load(MODELS / "preprocessor.joblib")
    model_path = find_model_path()
    model = joblib.load(model_path)
    return pre, model, model_path

def ensure_columns(df: pd.DataFrame, needed_cols):
    missing = [c for c in needed_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in input: {missing}")
    return df[needed_cols].copy()

def predict_df(df: pd.DataFrame):
    pre, model, model_path = load_artifacts()
    num_cols = pre.transformers_[0][2]
    cat_cols = pre.transformers_[1][2]
    raw_needed = sorted(set(list(num_cols) + list(cat_cols)))
    df_in = ensure_columns(df, raw_needed)
    X = pre.transform(df_in) #dataframe pre process using prepoeosessr
    if hasattr(X, "toarray"):
        X = X.toarray()
    preds = model.predict(X)
    proba = model.predict_proba(X) if hasattr(model, "predict_proba") else None
    return preds, proba, model_path, raw_needed

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", type=str, help="Path to CSV file with rows to predict")
    ap.add_argument("--json", type=str, help="Path to JSON file with list[dict] rows to predict")
    args = ap.parse_args()

    if not args.csv and not args.json:
        print("Provide --csv or --json", file=sys.stderr)
        sys.exit(2)

    if args.csv:
        df = pd.read_csv(args.csv)
    else:
        data = json.loads(Path(args.json).read_text(encoding="utf-8"))
        df = pd.DataFrame(data)

    preds, proba, model_path, used_cols = predict_df(df)
    print(f"Loaded model: {model_path.name}")
    print(f"Used input columns ({len(used_cols)}):", used_cols)
    out = df.copy()
    out["prediction"] = preds
    if proba is not None:
        # Add top-1 confidence and (for <=5 classes) per-class probs
        if proba.shape[1] <= 5:
            for j in range(proba.shape[1]):
                out[f"prob_class_{j}"] = proba[:, j]
        out["confidence"] = proba.max(axis=1)
    out_path = REPORTS / "predictions.csv"
    out.to_csv(out_path, index=False)
    print(f"Saved predictions to: {out_path}")
    print(out.head().to_string(index=False))

if __name__ == "__main__":
    main()