const BASE = "/api";

/** KeyGate 的「使用伺服器設定的 Key」選項存的哨兵值;此時不送 X-OpenAI-Key,後端用自己的 .env。 */
export const SERVER_KEY = "__server__";

function authHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    ...(apiKey && apiKey !== SERVER_KEY ? { "X-OpenAI-Key": apiKey } : {}),
  };
}

/**
 * 單一入口。後端先判斷意圖(規則 → LLM),再分派:
 *   意圖 regulation_qa / case_lookup → 固定路徑, ad_review → 審稿路徑, multi_hop → agent 路徑。
 * 不管走哪條,回傳格式都一樣:answer / route / sources / related_cases / verdict / trace / usage / meta。
 * forceIntent 可以跳過分流直接指定意圖(前端不提供,保留給評估腳本與 API 呼叫端)。
 */
export async function query(question, { forceIntent = null, topK = 8, maxToolCalls = 4, apiKey = "" } = {}) {
  const body = { question, top_k: topK, max_tool_calls: maxToolCalls };
  if (forceIntent) body.force_intent = forceIntent;
  const res = await fetch(`${BASE}/query`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/**
 * 跟 query() 同一條流程,但走 /query/stream(SSE):每完成一步就呼叫 onStep(step),
 * 最後 resolve 完整結果(跟 query() 回傳一樣的物件)。用 fetch 讀串流是因為 EventSource 不能 POST。
 */
export async function queryStream(question, { topK = 8, maxToolCalls = 4, apiKey = "", onStep = () => {} } = {}) {
  const res = await fetch(`${BASE}/query/stream`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ question, top_k: topK, max_tool_calls: maxToolCalls }),
  });
  if (!res.ok) throw new Error(await res.text());
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let result = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const ev = /^event: (.*)$/m.exec(frame)?.[1];
      const dataLine = frame.split("\n").find(l => l.startsWith("data: "));
      if (!ev || !dataLine) continue;
      const data = JSON.parse(dataLine.slice(6));
      if (ev === "step") onStep(data);
      else if (ev === "result") result = data;
      else if (ev === "error") throw new Error(data.detail || "server error");
    }
  }
  if (!result) throw new Error("串流結束但沒有收到結果");
  return result;
}

/** 系統狀態:模型/索引載好了沒、裝置、索引統計、失敗檔清單。 */
export async function getHealth() {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getLawRelated(article) {
  const res = await fetch(`${BASE}/laws/${encodeURIComponent(article)}/related`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
