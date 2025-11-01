import React from "react";

export default function HistoryTable({ logs }) {
  if (!logs?.length) return <div className="muted">No history yet.</div>;
  return (
    <div className="card">
      <h3>Recent Predictions</h3>
      <div className="table">
        <div className="thead">
          <div>Timestamp</div>
          <div>Prediction</div>
          <div>Confidence</div>
        </div>
        <div className="tbody">
          {logs.map((row, idx) => {
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
      <style>{`
        .table { display: grid; gap: 6px; }
        .thead, .tr { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 8px; }
        .thead { font-weight: 700; color: var(--muted); }
        .td { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      `}</style>
    </div>
  );
}
