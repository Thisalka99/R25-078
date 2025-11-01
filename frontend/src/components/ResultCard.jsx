import React from "react";

export default function ResultCard({ result }) {
  if (!result) return null;
  const { prediction, confidence, ...rest } = result;

  return (
    <div className="card">
      <h3>Prediction</h3>
      <div className="prediction">{String(prediction)}</div>
      {typeof confidence === "number" && (
        <div className="confidence">
          Confidence: {(confidence * 100).toFixed(1)}%
          <div className="bar">
            <div className="fill" style={{ width: `${confidence * 100}%` }} />
          </div>
        </div>
      )}
      {/* Show per-class probs if present */}
      {Object.keys(rest).length > 0 && (
        <details>
          <summary>Details</summary>
          <pre>{JSON.stringify(rest, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
