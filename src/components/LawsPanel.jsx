import { useState } from "react";
import { getLawRelated } from "../api";

const EXAMPLES = ["28", "15", "22", "15之一", "47"];

export default function LawsPanel() {
  const [article, setArticle] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function submit(val) {
    const q = (val ?? article).trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await getLawRelated(q);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-title">法條關聯查詢</div>
      <div className="page-sub">查詢某法條在法規文件中常與哪些條文一起引用</div>

      <div className="card">
        <div className="card-title">輸入條號</div>
        <div className="input-row">
          <input
            type="text"
            placeholder="例：28 或 15之一"
            value={article}
            onChange={e => setArticle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
          />
          <button className="btn btn-primary" onClick={() => submit()} disabled={loading || !article.trim()}>
            {loading ? <><span className="spinner" /> 查詢中…</> : "查詢"}
          </button>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>常見條號：</span>
          {EXAMPLES.map(e => (
            <button
              key={e}
              onClick={() => { setArticle(e); submit(e); }}
              style={{
                background: "#ede9fe", color: "#5b21b6", border: "none",
                borderRadius: 12, padding: "3px 12px", fontSize: "0.82rem",
                cursor: "pointer", fontFamily: "inherit", fontWeight: 600
              }}
            >
              第 {e} 條
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {result && (
        <div className="card">
          <div className="card-title">
            食安法第 {result.law} 條 — 共出現於 {result.total_chunks.toLocaleString()} 個 chunks
          </div>

          {result.co_cited_laws.length === 0 ? (
            <div className="empty-msg">找不到與此條文共同引用的法條</div>
          ) : (
            <>
              <div className="section-header" style={{ marginBottom: 14 }}>
                共同引用法條（{result.co_cited_laws.length} 筆）
              </div>
              <div className="law-grid">
                {result.co_cited_laws.map((l, i) => (
                  <div key={i} className="law-chip">
                    <div className="law-chip-name">{l.law_name} 第 {l.article_full} 條</div>
                    <div className="law-chip-count">共同引用 {l.co_occurrence} 次</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
