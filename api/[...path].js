const HF_SPACE = "https://natalie93-food-rag.hf.space";

export default async function handler(req, res) {
  try {
    const pathParam = req.query["...path"] ?? req.query.path;
    const parts = Array.isArray(pathParam) ? pathParam : [pathParam].filter(Boolean);
    const upstreamPath = "/" + parts.join("/");

    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (k !== "path" && k !== "...path") params.append(k, v);
    }
    const qs = params.toString() ? "?" + params.toString() : "";
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
      redirect: "manual",
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      return res.status(401).json({
        error: "HF_TOKEN invalid or missing",
        redirect_to: upstream.headers.get("location"),
      });
    }

    const text = await upstream.text();
    try {
      res.status(upstream.status).json(JSON.parse(text));
    } catch {
      res.status(upstream.status).send(text);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
