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
