export default function handler(req, res) {
  res.json({
    method: req.method,
    url: req.url,
    path: req.query.path,
    hasToken: !!process.env.HF_TOKEN,
    tokenPrefix: process.env.HF_TOKEN?.slice(0, 6) ?? "unset",
    body: req.body,
  });
}
