const BASE = "/api";

function authHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { "X-OpenAI-Key": apiKey } : {}),
  };
}

export async function ask(question, filters = {}, top_k = 5, include_cases = false, apiKey = "") {
  const res = await fetch(`${BASE}/ask`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ question, filters, top_k, include_cases }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function review(ad_text, top_k = 5, apiKey = "") {
  const res = await fetch(`${BASE}/review`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ ad_text, top_k }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getStats() {
  const res = await fetch(`${BASE}/stats`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getLawRelated(article) {
  const res = await fetch(`${BASE}/laws/${encodeURIComponent(article)}/related`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getFailed(limit = 200) {
  const res = await fetch(`${BASE}/failed?limit=${limit}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
