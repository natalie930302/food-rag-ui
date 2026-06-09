const HF_SPACE = "https://natalie93-food-rag.hf.space";

export default async function handler(req, res) {
  try {
    // 直接測試 POST /ask
    const upstream = await fetch(`${HF_SPACE}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
      },
      body: JSON.stringify({ question: "測試" }),
      redirect: "manual",
    });

    const text = await upstream.text();
    res.json({
      status: upstream.status,
      body_preview: text.slice(0, 200),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
