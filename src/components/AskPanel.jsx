import { useState } from "react";
import { ask } from "../api";

function SourceItem({ c }) {
  const fileUrl = c.source_path
    ? `http://localhost:8000/files/${c.source_path.replace(/\\/g, "/")}`
    : null;
  return (
    <div className="source-item">
      <div className="source-meta">
        {c.primary_law && <span className="tag tag-law">{c.primary_law}</span>}
        {c.kind && <span className="tag tag-kind">{c.kind}</span>}
        {c.is_ocr && <span className="tag tag-ocr">OCR</span>}
        {c.has_table && <span className="tag tag-table">表格</span>}
        <span className="score-badge">相似度 {(c.score * 100).toFixed(1)}%</span>
      </div>
      {c.document && (
        fileUrl
          ? <a href={fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.78rem", color: "#6366f1", marginBottom: 4, display: "block", textDecoration: "underline" }}>{c.document}</a>
          : <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 4 }}>{c.document}</div>
      )}
      <div className="source-text">{c.text}</div>
    </div>
  );
}

function CasesTable({ cases }) {
  if (!cases.length) return null;
  return (
    <div className="table-wrap">
      <table className="cases-table">
        <thead>
          <tr>
            <th>日期</th><th>廠商</th><th>產品</th><th>違規事實</th><th>裁罰(元)</th><th>法條</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c, i) => (
            <tr key={i}>
              <td style={{ whiteSpace: "nowrap" }}>{c.year}/{c.month}</td>
              <td>{c.company}</td>
              <td>{c.product}</td>
              <td style={{ minWidth: 320, whiteSpace: "normal" }}>{c.violation}</td>
              <td style={{ whiteSpace: "nowrap" }}>{c.penalty_twd ? c.penalty_twd.toLocaleString() : "-"}</td>
              <td>{c.law_cited}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AskPanel() {
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(5);
  const [includeCases, setIncludeCases] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function submit() {
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await ask(question, {}, topK, includeCases);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
  }

  return (
    <div>
      <div className="page-title">法規問答</div>
      <div className="page-sub">針對食藥署法規與北市違規案例提問</div>

      <div className="card">
        <div className="card-title">輸入問題</div>
        <textarea
          rows={4}
          placeholder="例：真空包裝豆干要符合什麼規定？"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKey}
        />
        <div className="btn-row">
          <button className="btn btn-primary" onClick={submit} disabled={loading || !question.trim()}>
            {loading ? <><span className="spinner" /> 查詢中…</> : "送出查詢"}
          </button>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "#475569" }}>
            <input type="checkbox" checked={includeCases} onChange={e => setIncludeCases(e.target.checked)} />
            包含違規案例
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "#475569" }}>
            Top-K
            <select
              value={topK}
              onChange={e => setTopK(+e.target.value)}
              style={{ border: "1.5px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontFamily: "inherit", fontSize: "0.85rem" }}
            >
              {[3, 5, 8, 10].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Ctrl+Enter 送出</span>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {result && (
        <>
          <div className="card">
            <div className="card-title">AI 回答</div>
            <div className="answer-box">{result.answer}</div>
            <div className="meta-row">
              <span>檢索 {result.meta.retrieval_ms} ms</span>
              <span>LLM {result.meta.llm_ms} ms</span>
              <span>模型 {result.meta.model}</span>
              <span>共搜尋 {result.meta.total_chunks_searched.toLocaleString()} 筆向量</span>
            </div>
          </div>

          {result.sources.length > 0 && (
            <div className="card">
              <div className="card-title">參考法規來源（{result.sources.length} 筆）</div>
              <div className="sources-list">
                {result.sources.map((c, i) => <SourceItem key={i} c={c} />)}
              </div>
            </div>
          )}

          {result.related_cases.length > 0 && (
            <div className="card">
              <div className="card-title">相關違規案例（{result.related_cases.length} 筆）</div>
              <CasesTable cases={result.related_cases} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
