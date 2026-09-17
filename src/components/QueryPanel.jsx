import { useState, useEffect, useRef } from "react";
import { queryStream } from "../api";
import PipelineDiagram from "./PipelineDiagram";

// 單一窗口:問法規、查案例、貼廣告文案都丟同一格。
// 後端 /query 先判「意圖」(規則層 → LLM 層)再分派到「路徑」;前端只依回傳的 route 決定怎麼呈現。
// 名詞跟 README 一致:意圖 4 種(問規定 / 查案例 / 審稿 / 多步)→ 路徑 3 條(固定 / 審稿 / agent)。

const INTENT_LABEL = {
  regulation_qa: "問規定",
  case_lookup:   "查案例",
  ad_review:     "審稿",
  multi_hop:     "多步",
};

const HANDLER_LABEL = { regulation: "固定路徑", review: "審稿路徑", agent: "agent 路徑" };

const SOURCE_LABEL = { rules: "規則層", llm: "LLM 層", forced: "指定" };

// 每一步的中文名(trace step name → 顯示)
const STEP_LABEL = {
  route: "判定意圖", decompose: "拆子問題", retrieve: "檢索管線", retry: "改寫重查", retrieve_cases: "查案例",
  refuse: "拒答", generate: "生成答案", verify_citations: "引用驗證", keyword_scan: "風險字掃描", verdict: "判燈號",
  "tool:search_regulations": "工具:查法規", "tool:search_violation_cases": "工具:查案例",
  "tool:search_related_laws": "工具:查關聯法條",
};

function stepLabel(name) { return STEP_LABEL[name] ?? name; }

// 後端 prompt 已要求純文字;這裡再把殘留的 Markdown 符號清掉(**粗體**、# 標題、行首 - 改成 ・)
function plainText(t) {
  return (t || "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "・")
    .replace(/`([^`]+)`/g, "$1");
}

const VERDICT_MAP = {
  low:    { cls: "verdict-pass", label: "🟢 低風險" },
  medium: { cls: "verdict-warn", label: "🟡 中風險" },
  high:   { cls: "verdict-fail", label: "🔴 高風險" },
};

const EXAMPLES = [
  "真空包裝豆干要符合什麼規定?",
  "有哪些業者因為宣稱減肥被罰?罰了多少?",
  "本產品有效改善高血壓、降低血糖,每天服用效果顯著。",
  "食安法第28條跟哪些條文有關聯?違反的話會依哪條處罰?",
];

function SourceItem({ c }) {
  const fileUrl = c.source_path ? `/files/${c.source_path.replace(/\\/g, "/")}` : null;
  return (
    <div className="source-item">
      <div className="source-meta">
        {c.primary_law && <span className="tag tag-law">{c.primary_law}</span>}
        {c.kind && <span className="tag tag-kind">{c.kind}</span>}
        {c.is_ocr && <span className="tag tag-ocr">OCR</span>}
        {c.has_table && <span className="tag tag-table">表格</span>}
        {c.score > 0 && <span className="score-badge">相似度 {(c.score * 100).toFixed(1)}%</span>}
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
  if (!cases?.length) return null;
  return (
    <div className="table-wrap">
      <table className="cases-table" style={{ tableLayout: "fixed", width: "100%" }}>
        <colgroup>
          <col style={{ width: "7%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "41%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
        </colgroup>
        <thead>
          <tr><th>日期</th><th>廠商</th><th>產品</th><th>違規事實</th><th>裁罰(元)</th><th>法條</th></tr>
        </thead>
        <tbody>
          {cases.map((c, i) => (
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
              <td style={{ wordBreak: "break-all" }}>{c.law_cited}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TraceList({ trace }) {
  if (!trace?.length) return null;
  return (
    <ol style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: "0.8rem", color: "#475569", lineHeight: 1.7 }}>
      {trace.map((s, i) => (
        <li key={i}>
          <code style={{ fontSize: "0.78rem" }}>{s.name}</code>
          {s.ms > 0 && <span style={{ color: "#94a3b8" }}> · {s.ms} ms</span>}
          {s.confident === false && <span style={{ color: "#f59e0b" }}> · 信心不足</span>}
          {s.query_drift_detected && <span style={{ color: "#ef4444" }}> · 偵測到查詢漂移,已用原話重查</span>}
          {s.detail && <span style={{ color: "#64748b" }}> — {s.detail}</span>}
        </li>
      ))}
    </ol>
  );
}

export default function QueryPanel({ apiKey = "" }) {
  const [text, setText] = useState("");
  const [topK, setTopK] = useState(5);
  const [showTrace, setShowTrace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slowWarning, setSlowWarning] = useState(false);
  const [result, setResult] = useState(null);
  const [liveSteps, setLiveSteps] = useState([]);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  // 送出超過 8 秒才提示暖機;timer 只在 loading 期間存在
  useEffect(() => {
    if (!loading) return undefined;
    timerRef.current = setTimeout(() => setSlowWarning(true), 8000);
    return () => clearTimeout(timerRef.current);
  }, [loading]);

  async function submit() {
    if (!text.trim()) return;
    setLoading(true);
    setSlowWarning(false);
    setError("");
    setResult(null);
    setLiveSteps([]);
    try {
      const data = await queryStream(text, { topK, apiKey, onStep: s => setLiveSteps(prev => [...prev, s]) });
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

  const isReview = result?.route?.intent === "ad_review";
  const vd = isReview ? (VERDICT_MAP[result.verdict] ?? VERDICT_MAP.medium) : null;

  return (
    <div>
      <div className="page-title">問答 / 審稿</div>
      <div className="page-sub">問規定、查案例、或直接貼廣告文案,一個框就好;系統判定意圖後自己選路徑</div>

      <div className="card">
        <div className="card-title">輸入</div>
        <textarea
          rows={5}
          placeholder={"例:" + EXAMPLES[0] + "\n例:" + EXAMPLES[2]}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
        />
        <div className="btn-row">
          <button className="btn btn-primary" onClick={submit} disabled={loading || !text.trim()}>
            {loading ? <><span className="spinner" /> 查詢中…</> : "送出"}
          </button>
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
        {loading && slowWarning && (
          <p style={{ fontSize: "0.78rem", color: "#f59e0b", margin: "6px 0 0" }}>
            伺服器暖機中,首次查詢較慢,請稍候…
          </p>
        )}
        {!result && !loading && (
          <div className="keyword-list" style={{ marginTop: 10 }}>
            {EXAMPLES.map((ex, i) => (
              <span
                key={i}
                className="keyword-tag"
                style={{ cursor: "pointer" }}
                title="點擊帶入"
                onClick={() => setText(ex)}
              >
                {ex}
              </span>
            ))}
          </div>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading && (
        <div className="card">
          <div className="card-title">執行中</div>
          {liveSteps.length > 0 && (() => {
            // 第一步 route 的 detail 是「intent (source) reason」,先從 intent 推出路徑,把整條路先畫出來
            const intent = (liveSteps[0].detail || "").split(" ")[0];
            const handler = intent === "ad_review" ? "review" : intent === "multi_hop" ? "agent" : "regulation";
            return (
              <div style={{ marginBottom: 10 }}>
                <PipelineDiagram live result={{ route: { intent, handler }, trace: liveSteps, meta: {}, matched_keywords: [] }} />
              </div>
            );
          })()}
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: "0.85rem", color: "#475569", lineHeight: 1.8 }}>
            {liveSteps.map((s, i) => (
              <li key={i}>
                <strong>{stepLabel(s.name)}</strong>
                {s.ms > 0 && <span style={{ color: "#94a3b8" }}> · {s.ms} ms</span>}
                {s.confident === false && <span style={{ color: "#f59e0b" }}> · 信心不足</span>}
                {s.detail && <span style={{ color: "#94a3b8" }}> — {s.detail.slice(0, 60)}</span>}
              </li>
            ))}
            <li style={{ listStyle: "none", marginLeft: -20, color: "#6366f1" }}><span className="spinner" /> {liveSteps.length === 0 ? "送出中…" : "下一步…"}</li>
          </ol>
        </div>
      )}

      {result && (
        <>
          <div className="card">
            <div className="meta-row" style={{ marginBottom: 10 }}>
              <span>
                意圖 <strong>{INTENT_LABEL[result.route.intent] ?? result.route.intent}</strong>
                ({SOURCE_LABEL[result.route.source] ?? result.route.source}
                {result.route.router_ms ? `,${result.route.router_ms} ms` : ""}) → 路徑 <strong>{HANDLER_LABEL[result.route.handler] ?? result.route.handler}</strong>
              </span>
              {result.route.reason && <span style={{ color: "#94a3b8" }}>{result.route.reason}</span>}
            </div>

            {isReview ? (
              <>
                <div className={`verdict ${vd.cls}`}>{vd.label}</div>
                <div className="card-title">審核意見</div>
              </>
            ) : (
              <>
                {result.meta.confident === false ? (
                  <span className="verdict verdict-warn">⚠️ 信心不足,誠實拒答</span>
                ) : result.meta.confident === true ? (
                  <span className="verdict verdict-pass">✓ 已找到可信法規依據</span>
                ) : null}
                {result.meta.used_retry && (
                  <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: "0 0 10px" }}>
                    系統自動把問題換一種說法重新檢索過一次
                    {result.meta.confident ? ",這次找到了可信的依據。" : ",但仍未找到足夠可信的依據。"}
                  </p>
                )}
                <div className="card-title">回答</div>
              </>
            )}

            <div className="answer-box">{plainText(result.answer)}</div>

            <div className="meta-row">
              {result.meta.retrieval_ms > 0 && <span>檢索 {result.meta.retrieval_ms} ms</span>}
              {result.meta.llm_ms > 0 && <span>LLM {result.meta.llm_ms} ms</span>}
              <span>模型 {result.meta.model}</span>
              <span>LLM 呼叫 {result.usage.llm_calls} 次 · {result.usage.total_tokens.toLocaleString()} tokens · {result.usage.elapsed_s}s</span>
              {result.meta.hit_tool_call_limit && <span style={{ color: "#f59e0b" }}>已達工具呼叫上限</span>}
              {result.meta.unsupported_citations?.length > 0 && (
                <span style={{ color: "#ef4444" }}>⚠ 引用了檢索內容裡沒有的條號:{result.meta.unsupported_citations.join("、")}</span>
              )}
              {result.meta.citation_regenerated && <span style={{ color: "#94a3b8" }}>引用驗證未過,已重新生成</span>}
            </div>

            <div style={{ margin: "12px 0 4px", fontSize: "0.8rem", color: "#64748b" }}>
              路徑圖({HANDLER_LABEL[result.route.handler] ?? result.route.handler}):這條路徑的完整步驟,用這次的執行軌跡上色
            </div>
            <PipelineDiagram result={result} />

            <div className="meta-row" style={{ marginTop: 10 }}>
              <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setShowTrace(v => !v)}>
                {showTrace ? "收起" : "展開"}執行軌跡({result.trace.length} 步)
              </span>
              {!showTrace && <span>{result.trace.map(s => s.name).join(" → ")}</span>}
            </div>
            {showTrace && <TraceList trace={result.trace} />}
          </div>

          {isReview && result.matched_keywords?.length > 0 && (
            <div className="card">
              <div className="card-title">偵測到的風險關鍵字</div>
              <div className="keyword-list">
                {result.matched_keywords.map((kw, i) => <span key={i} className="keyword-tag">{kw}</span>)}
              </div>
            </div>
          )}

          {result.sources?.length > 0 && (
            <div className="card">
              <div className="card-title">{isReview ? "相關法規依據" : "參考法規來源"}({result.sources.length} 筆)</div>
              <div className="sources-list">
                {result.sources.map((c, i) => <SourceItem key={i} c={c} />)}
              </div>
            </div>
          )}

          {result.related_cases?.length > 0 && (
            <div className="card">
              <div className="card-title">{isReview ? "相似違規案例" : "相關違規案例"}({result.related_cases.length} 筆)</div>
              <CasesTable cases={result.related_cases} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
