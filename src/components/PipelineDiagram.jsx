// 路徑圖:把「這次走的路徑」完整畫出來(含檢索管線內部的小步),再用 trace 把走過的亮起來。
// 名詞跟 README 一致:意圖 → 路徑(固定 / 審稿 / agent);檢索管線 = 向量粗篩 → 實體加權 → reranker → 信心閘門。
//
// 格子狀態:done(走過)/ fail(走過但沒過關,例如閘門分數不足)/ alt(替代步驟,例如拒答代替生成)
//          / skip(這條路徑有這一步,但這次用不到)

const C = {
  done: { fill: "#e0e7ff", stroke: "#6366f1", text: "#312e81", sub: "#4338ca" },
  fail: { fill: "#fee2e2", stroke: "#ef4444", text: "#7f1d1d", sub: "#b91c1c" },
  alt:  { fill: "#fef3c7", stroke: "#f59e0b", text: "#78350f", sub: "#b45309" },
  skip: { fill: "#ffffff", stroke: "#cbd5e1", text: "#94a3b8", sub: "#94a3b8", dash: "4 3" },
  group:{ fill: "#f8fafc", stroke: "#94a3b8", text: "#475569" },
};

function Node({ x, y, w, h = 56, label, sub, state = "skip", badge, pulse = false }) {
  const c = pulse ? C.done : C[state];
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={c.fill} stroke={c.stroke} strokeWidth={pulse ? 2.4 : 1.2} strokeDasharray={pulse ? undefined : c.dash} className={pulse ? "pd-pulse" : undefined} />
      <text x={x + w / 2} y={y + (sub ? 20 : h / 2)} textAnchor="middle" dominantBaseline="central" fontSize={12.5} fontWeight={600} fill={c.text}>{label}</text>
      {sub && <text x={x + w / 2} y={y + 38} textAnchor="middle" dominantBaseline="central" fontSize={10.5} fill={c.sub}>{sub}</text>}
      {badge && (
        <g>
          <rect x={x + w - 34} y={y - 9} width={34} height={18} rx={9} fill={c.stroke} />
          <text x={x + w - 17} y={y} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill="#fff">{badge}</text>
        </g>
      )}
    </g>
  );
}

function Arrow({ d, on = true }) {
  return <path d={d} fill="none" stroke={on ? "#6366f1" : "#cbd5e1"} strokeWidth={1.2} markerEnd={on ? "url(#pd-arrow-on)" : "url(#pd-arrow-off)"} />;
}

function Defs() {
  return (
    <defs>
      <style>{`.pd-pulse{animation:pdpulse 1s ease-in-out infinite}@keyframes pdpulse{0%,100%{stroke-opacity:1}50%{stroke-opacity:.25}}`}</style>
      <marker id="pd-arrow-on" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M2 1L8 5L2 9" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </marker>
      <marker id="pd-arrow-off" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M2 1L8 5L2 9" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </marker>
    </defs>
  );
}

const pct = s => (typeof s === "number" ? `分數 ${s.toFixed(2)}` : "");
const has = (trace, n) => trace.filter(s => s.name === n);

// ---------- 固定路徑 ----------
function FixedPath({ trace, meta, live }) {
  const last = live ? trace[trace.length - 1]?.name : null;
  const dec = has(trace, "decompose")[0];
  const rets = has(trace, "retrieve");
  const retries = has(trace, "retry");
  const cases = has(trace, "retrieve_cases")[0];
  const gen = has(trace, "generate")[0];
  const refuse = has(trace, "refuse")[0];
  const ver = has(trace, "verify_citations")[0];
  const anyRetOk = rets.some(s => s.confident);
  const anyRetryOk = retries.some(s => s.confident);
  const gateState = rets.length === 0 ? "skip" : anyRetOk ? "done" : "fail";
  const bestRet = rets.reduce((m, s) => (s.top_score != null && (m == null || s.top_score > m) ? s.top_score : m), null);
  const retryState = retries.length === 0 ? "skip" : anyRetryOk ? "done" : "fail";
  const casesState = !cases ? "skip" : cases.confident === false ? "fail" : "done";
  const genState = gen ? "done" : refuse ? "alt" : "skip";
  return (
    <svg viewBox="0 0 900 250" width="100%" role="img" aria-label="固定路徑的步驟圖">
      <Defs />
      <Node x={10} y={20} w={90} label="判定類型" state="done" pulse={last === "route"} />
      <Arrow d="M104 48 L116 48" />
      <Node x={120} y={20} w={95} label="拆子問題" pulse={last === "decompose"} sub={dec ? `${(dec.arguments?.subquestions || []).length} 個子問題` : "單一問題"} state={dec ? "done" : "skip"} />
      <Arrow d="M219 48 L236 48" />
      {/* 檢索管線 group */}
      <rect x={240} y={8} width={440} height={80} rx={12} fill={C.group.fill} stroke={C.group.stroke} strokeWidth={1} strokeDasharray="5 4" />
      <text x={252} y={16} fontSize={10.5} fill={C.group.text} dominantBaseline="central">檢索管線{rets.length > 1 ? `(跑了 ${rets.length} 次,每個子問題一次)` : ""}</text>
      <Node x={252} y={24} w={92} h={52} label="向量粗篩" sub="BGE-M3 + FAISS" state={rets.length ? "done" : "skip"} />
      <Arrow d="M348 50 L356 50" on={rets.length > 0} />
      <Node x={360} y={24} w={92} h={52} label="實體加權" sub="列舉名詞補候選" state={rets.length ? "done" : "skip"} />
      <Arrow d="M456 50 L464 50" on={rets.length > 0} />
      <Node x={468} y={24} w={92} h={52} label="reranker" sub="逐段打分重排" state={rets.length ? "done" : "skip"} />
      <Arrow d="M564 50 L572 50" on={rets.length > 0} />
      <Node x={576} y={24} w={96} h={52} label="信心閘門" sub={gateState === "skip" ? "≥ 0.52 才放行" : `${pct(bestRet)} ${anyRetOk ? "通過" : "未過"}`} state={gateState} pulse={last === "retrieve"} />
      <Arrow d="M684 48 L696 48" on={retries.length > 0} />
      <Node x={700} y={20} w={95} label="改寫重查" sub={retries.length ? (anyRetryOk ? "改寫後通過門檻" : "改寫後仍未達門檻") : "閘門已通過"} state={retryState} pulse={last === "retry"} />
      {/* 換行連接 */}
      <path d="M 747 80 L 747 118 L 55 118 L 55 146" fill="none" stroke="#6366f1" strokeWidth={1.2} markerEnd="url(#pd-arrow-on)" />
      <Node x={10} y={150} w={90} label="查案例" pulse={last === "retrieve_cases"} sub={!cases ? "本次未觸發" : cases.confident === false ? "相關度不足,不採用" : `${cases.chunk_ids?.length ?? 0} 筆,達門檻`} state={casesState} />
      <Arrow d="M104 178 L116 178" />
      <Node x={120} y={150} w={120} pulse={last === "generate" || last === "refuse"} label={genState === "alt" ? "拒答" : "生成答案"} sub={genState === "alt" ? "法規與案例都不可信,不呼叫 LLM" : gen ? (meta?.confident === false ? "只憑案例作答" : "gpt-4o-mini 依段落作答") : ""} state={genState} />
      <Arrow d="M244 178 L256 178" on={!!gen} />
      <Node x={260} y={150} w={100} label="引用驗證" pulse={last === "verify_citations"} sub={ver ? (ver.detail?.includes("unsupported=0") ? "條號全部對得上" : "有條號對不上") : (live ? "" : "未作答,免驗證")} state={ver ? (ver.detail?.includes("unsupported=0") ? "done" : "fail") : "skip"} />
      <Arrow d="M364 178 L376 178" on={!live} />
      <Node x={380} y={150} w={80} label="回傳" state={live ? "skip" : "done"} />
    </svg>
  );
}

// ---------- 審稿路徑 ----------
function ReviewPath({ trace, result, live }) {
  const last = live ? trace[trace.length - 1]?.name : null;
  const scan = has(trace, "keyword_scan")[0];
  const ret = has(trace, "retrieve")[0];
  const cases = has(trace, "retrieve_cases")[0];
  const gen = has(trace, "generate")[0];
  const ver = has(trace, "verify_citations")[0];
  const vd = has(trace, "verdict")[0];
  const nKw = (result?.matched_keywords || []).length;
  const verdictLabel = { high: "高風險", medium: "中風險", low: "低風險" }[result?.verdict] || "";
  return (
    <svg viewBox="0 0 900 250" width="100%" role="img" aria-label="審稿路徑的步驟圖">
      <Defs />
      <Node x={10} y={20} w={90} label="判定類型" state="done" />
      <Arrow d="M104 48 L116 48" />
      <Node x={120} y={20} w={110} pulse={last === "keyword_scan"} label="風險字掃描" sub={scan ? `${nKw} 個高風險詞` : ""} state={scan ? "done" : "skip"} />
      <Arrow d="M234 48 L246 48" />
      <Node x={250} y={20} w={150} label="檢索" sub="保證第 28 條 + 全庫補檢索" state={ret ? "done" : "skip"} pulse={last === "retrieve"} />
      <Arrow d="M404 48 L416 48" />
      <Node x={420} y={20} w={100} label="查案例" sub={cases ? `${cases.chunk_ids?.length ?? 0} 筆相似廣告` : ""} state={cases ? "done" : "skip"} pulse={last === "retrieve_cases"} />
      <Arrow d="M524 48 L536 48" />
      <Node x={540} y={20} w={130} label="生成三段報告" sub="法規 / 案例 / 修改建議" state={gen ? "done" : "skip"} pulse={last === "generate"} />
      <path d="M 605 80 L 605 118 L 55 118 L 55 146" fill="none" stroke="#6366f1" strokeWidth={1.2} markerEnd="url(#pd-arrow-on)" />
      <Node x={10} y={150} w={100} label="引用驗證" pulse={last === "verify_citations"} sub={ver ? (ver.detail?.includes("unsupported=0") ? "條號全部對得上" : "有條號對不上") : ""} state={ver ? (ver.detail?.includes("unsupported=0") ? "done" : "fail") : "skip"} />
      <Arrow d="M114 178 L126 178" />
      <Node x={130} y={150} w={100} pulse={last === "verdict"} label="判燈號" sub={verdictLabel} state={vd ? (result?.verdict === "high" ? "fail" : result?.verdict === "medium" ? "alt" : "done") : "skip"} />
      <Arrow d="M234 178 L246 178" on={!live} />
      <Node x={250} y={150} w={80} label="回傳" state={live ? "skip" : "done"} />
    </svg>
  );
}

// ---------- agent 路徑 ----------
function AgentPath({ trace, meta, live }) {
  const last = live ? trace[trace.length - 1]?.name : null;
  const tools = trace.filter(s => s.name.startsWith("tool:"));
  const order = name => tools.map((s, i) => (s.name === name ? i + 1 : null)).filter(Boolean);
  const reg = has(trace, "tool:search_regulations");
  const cas = has(trace, "tool:search_violation_cases");
  const rel = has(trace, "tool:search_related_laws");
  const gen = has(trace, "generate")[0];
  const forced = reg.some(s => s.arguments?.forced);
  const regOk = reg.some(s => s.confident);
  const casOk = cas.some(s => s.confident);
  const regFlags = [
    reg.some(s => (s.detail || "").includes("關鍵字→問句")) && "關鍵字補成問句",
    reg.some(s => (s.detail || "").includes("工具內改寫重查")) && "工具內改寫重查",
    reg.some(s => s.query_drift_detected) && "漂移→用原話重查",
  ].filter(Boolean).join(" · ");
  const seq = n => (n.length ? `第 ${n.join("、")} 次` : "");
  const grounded = live ? undefined : meta?.grounded;
  return (
    <svg viewBox="0 0 905 300" width="100%" role="img" aria-label="agent 路徑的步驟圖">
      <Defs />
      <Node x={10} y={122} w={90} label="判定類型" state="done" />
      <Arrow d="M104 150 L116 150" />
      <rect x={120} y={10} width={340} height={280} rx={12} fill={C.group.fill} stroke={C.group.stroke} strokeWidth={1} strokeDasharray="5 4" />
      <text x={132} y={22} fontSize={11} fill={C.group.text} dominantBaseline="central">LLM 決策迴圈:由模型選擇工具與呼叫次數(上限 4 次);本次 {tools.length} 次</text>
      <Node x={136} y={36} w={308} h={70} pulse={last === "tool:search_regulations"} label="工具:查法規(= 檢索管線 + 改寫重查)" sub={reg.length ? `${seq(order("tool:search_regulations"))}${regOk ? " · 有可信段落" : " · 都未過閘門"}${regFlags ? " · " + regFlags : ""}` : "未呼叫"} state={reg.length ? (regOk ? "done" : "fail") : "skip"} badge={forced ? "系統補查" : undefined} />
      <Node x={136} y={120} w={308} pulse={last === "tool:search_violation_cases"} label="工具:查案例" sub={cas.length ? `${seq(order("tool:search_violation_cases"))} · ${casOk ? "相似度過門檻,可當依據" : "相關度不足,不採用"}` : "未呼叫"} state={cas.length ? (casOk ? "done" : "fail") : "skip"} />
      <Node x={136} y={190} w={308} pulse={last === "tool:search_related_laws"} label="工具:查關聯法條" sub={rel.length ? `${seq(order("tool:search_related_laws"))} · 條文共現統計(只當引用證據)` : "未呼叫"} state={rel.length ? "done" : "skip"} />
      <Arrow d="M464 150 L476 150" />
      <Node x={480} y={122} w={140} label="harness 檢查" badge={forced ? "補查" : undefined} sub={live ? "作答前檢查" : (grounded === false ? "無可信依據,改為拒答" : "有可信依據,准許作答")} state={live ? (last === "generate" ? "done" : "skip") : grounded === false ? "fail" : "done"} />
      <Arrow d="M624 150 L636 150" />
      <Node x={640} y={122} w={90} pulse={last === "generate"} label={grounded === false ? "拒答" : "生成答案"} sub={gen?.detail?.includes("regenerated=True") ? "引用不符,重寫過一次" : ""} state={grounded === false ? "alt" : gen ? "done" : "skip"} />
      <Arrow d="M734 150 L746 150" on={grounded !== false} />
      <Node x={750} y={122} w={85} label="引用驗證" sub={live ? "" : grounded === false ? "未作答,免驗證" : (meta?.unsupported_citations?.length ? "有條號對不上" : "全部對得上")} state={live ? "skip" : grounded === false ? "skip" : (meta?.unsupported_citations?.length ? "fail" : "done")} />
      <Arrow d="M839 150 L851 150" on={!live} />
      <Node x={855} y={122} w={45} label="回傳" state={live ? "skip" : "done"} />
    </svg>
  );
}

export default function PipelineDiagram({ result, live = false }) {
  const { route, trace, meta } = result;
  const legend = (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: "0.74rem", color: "#64748b", marginTop: 4 }}>
      {[["done", "已執行"], ["fail", "執行但未通過"], ["alt", "替代步驟"], ["skip", "本次未觸發"]].map(([k, t]) => (
        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: C[k].fill, border: `1.5px ${C[k].dash ? "dashed" : "solid"} ${C[k].stroke}` }} />{t}
        </span>
      ))}
    </div>
  );
  return (
    <div>
      {route.handler === "agent" ? <AgentPath trace={trace} meta={meta} live={live} />
        : route.handler === "review" ? <ReviewPath trace={trace} result={result} live={live} />
        : <FixedPath trace={trace} meta={meta} live={live} />}
      {legend}
    </div>
  );
}
