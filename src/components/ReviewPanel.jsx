import { useState } from "react";
import { review } from "../api";

const VERDICT_MAP = {
  low:    { cls: "verdict-pass", label: "🟢 低風險" },
  medium: { cls: "verdict-warn", label: "🟡 中風險" },
  high:   { cls: "verdict-fail", label: "🔴 高風險" },
};

function SourceItem({ c }) {
  const fileUrl = c.source_path
    ? `/files/${c.source_path.replace(/\\/g, "/")}`
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

export default function ReviewPanel() {
  const [adText, setAdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function submit() {
    if (!adText.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await review(adText);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const vd = result ? (VERDICT_MAP[result.verdict] ?? VERDICT_MAP.medium) : null;

  return (
    <div>
      <div className="page-title">廣告審稿</div>
      <div className="page-sub">交叉比對食安法 × 藥事法 × 健康食品管理法</div>

      <div className="card">
        <div className="card-title">廣告文案</div>
        <textarea
          rows={5}
          placeholder="例：本產品有效改善高血壓、降低血糖，每天服用效果顯著。"
          value={adText}
          onChange={e => setAdText(e.target.value)}
        />
        <div className="btn-row">
          <button className="btn btn-primary" onClick={submit} disabled={loading || !adText.trim()}>
            {loading ? <><span className="spinner" /> 審核中…</> : "送出審稿"}
          </button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {result && (
        <>
          <div className="card">
            <div className={`verdict ${vd.cls}`}>{vd.label}</div>
            <div className="card-title">審核意見</div>
            <div className="answer-box">{result.answer}</div>
            <div className="meta-row">
              <span>檢索 {result.meta.retrieval_ms} ms</span>
              <span>LLM {result.meta.llm_ms} ms</span>
              <span>模型 {result.meta.model}</span>
            </div>
          </div>

          {result.evidence.matched_keywords?.length > 0 && (
            <div className="card">
              <div className="card-title">偵測到的風險關鍵字</div>
              <div className="keyword-list">
                {result.evidence.matched_keywords.map((kw, i) => (
                  <span key={i} className="keyword-tag">{kw}</span>
                ))}
              </div>
            </div>
          )}

          {result.evidence.laws?.length > 0 && (
            <div className="card">
              <div className="card-title">相關法規依據（{result.evidence.laws.length} 筆）</div>
              <div className="sources-list">
                {result.evidence.laws.map((c, i) => <SourceItem key={i} c={c} />)}
              </div>
            </div>
          )}

          {result.evidence.cases?.length > 0 && (
            <div className="card">
              <div className="card-title">相似違規案例（{result.evidence.cases.length} 筆）</div>
              <div className="table-wrap">
                <table className="cases-table" style={{ tableLayout: "fixed", width: "100%" }}>
                  <colgroup>
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "48%" }} />
                    <col style={{ width: "12%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>廠商</th>
                      <th>產品</th>
                      <th>違規事實</th>
                      <th>裁罰(元)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.evidence.cases.map((c, i) => (
                      <tr key={i}>
                        <td style={{ whiteSpace: "nowrap" }}>{c.year}/{c.month}</td>
                        <td style={{ wordBreak: "break-all" }}>{c.company}</td>
                        <td style={{ wordBreak: "break-all" }}>{c.product}</td>
                        <td>
                          <div style={{ display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-all" }}>
                            {c.violation}
                          </div>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>{c.penalty_twd ? c.penalty_twd.toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
