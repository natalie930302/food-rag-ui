const BASE = "/api";

function authHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { "X-OpenAI-Key": apiKey } : {}),
  };
}

/**
 * 單一入口。後端先判斷意圖(規則 → LLM),再分派:
 *   regulation_qa / case_lookup → 固定管線, ad_review → 審稿, multi_hop → tool-calling agent。
 * 不管走哪條,回傳格式都一樣:answer / route / sources / related_cases / verdict / trace / usage / meta。
 * forceIntent 可以跳過路由(審稿分頁用 "ad_review")。
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
