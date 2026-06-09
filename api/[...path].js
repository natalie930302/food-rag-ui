const HF_SPACE = "https://natalie93-food-rag.hf.space";

export default async function handler(req, res) {
  const upstreamPath = "/" + req.query.path.join("/");
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const url = `${HF_SPACE}${upstreamPath}${qs}`;

  const upstream = await fetch(url, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.HF_TOKEN}`,
    },
    body: req.method === "GET" || req.method === "HEAD"
      ? undefined
      : JSON.stringify(req.body),
  });

  const data = await upstream.json();
  res.status(upstream.status).json(data);
}
