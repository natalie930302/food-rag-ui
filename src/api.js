const BASE = "/api";

export async function ask(question, filters = {}, top_k = 5, include_cases = false) {
  const res = await fetch(`${BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, filters, top_k, include_cases }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function review(ad_text, top_k = 5) {
  const res = await fetch(`${BASE}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
