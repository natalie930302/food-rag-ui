import { useState, useEffect } from "react";
import { getFailed } from "../api";

export default function FailedPanel() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    getFailed(200)
      .then(setFiles)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter
    ? files.filter(f =>
        f.file_name?.toLowerCase().includes(filter.toLowerCase()) ||
        f.failure_reason?.toLowerCase().includes(filter.toLowerCase()) ||
        f.file_ext?.toLowerCase().includes(filter.toLowerCase())
      )
    : files;

  if (loading) return <div className="empty-msg">載入中…</div>;
  if (error) return <div className="error-msg">{error}</div>;

  return (
    <div>
      <div className="page-title">解析失敗檔案</div>
      <div className="page-sub">Ingest 過程中無法處理的檔案清單</div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: "0.875rem", color: "#475569" }}>
            共 <strong>{files.length}</strong> 個失敗檔案
          </span>
          <input
            type="text"
            placeholder="搜尋檔名 / 原因 / 副檔名…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ minWidth: 0, flex: "1 1 180px", maxWidth: 260, padding: "8px 12px", fontSize: "0.85rem" }}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-msg">無符合條件的結果</div>
        ) : (
          <div className="table-wrap">
            <table className="failed-table">
              <thead>
                <tr>
                  <th>檔名</th>
                  <th>類型</th>
                  <th>頁數</th>
                  <th>失敗原因</th>
                  <th>推測法條</th>
                  <th>備註</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, i) => (
                  <tr key={i}>
                    <td title={f.file_name}>{f.file_name}</td>
                    <td>{f.file_ext}</td>
                    <td>{f.page_count ?? "-"}</td>
                    <td title={f.failure_reason}>{f.failure_reason}</td>
                    <td>{f.inferred_law ?? "-"}</td>
                    <td title={f.note}>{f.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
