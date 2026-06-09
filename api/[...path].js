export const config = { runtime: "edge" };

const HF_SPACE = "https://natalie93-food-rag.hf.space";

export default async function handler(req) {
  const url = new URL(req.url);
  const upstreamPath = url.pathname.replace(/^\/api/, "");
  const upstreamUrl = `${HF_SPACE}${upstreamPath}${url.search}`;

  const body = req.method !== "GET" && req.method !== "HEAD"
    ? await req.text()
    : undefined;

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.HF_TOKEN}`,
  };
  const key = req.headers.get("x-openai-key");
  if (key) headers["X-OpenAI-Key"] = key;

  const upstream = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
