import { useEffect, useState } from "react";
import { getHealth, SERVER_KEY } from "../api";

export default function KeyGate({ onKey }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const [serverHasKey, setServerHasKey] = useState(false);

  // 後端 .env 有設 key(本機開發 / 自架 demo)時,提供不輸入 key 的入口
  useEffect(() => {
    let alive = true;
    getHealth()
      .then(h => { if (alive && h?.checks?.openai_key) setServerHasKey(true); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  function useServerKey() {
    localStorage.setItem("openai_key", SERVER_KEY);
    onKey(SERVER_KEY);
  }

  function submit(e) {
    e.preventDefault();
    const k = val.trim();
    if (!k.startsWith("sk-")) {
      setErr("Key 格式不對，應以 sk- 開頭");
      return;
    }
    localStorage.setItem("openai_key", k);
    onKey(k);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#0f1923",
    }}>
      <form onSubmit={submit} style={{
        background: "#1a2535", borderRadius: 12, padding: "40px 36px",
        width: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        <h2 style={{ color: "#e2eaf4", marginBottom: 8 }}>食品法規 RAG</h2>
        <p style={{ color: "#6b7fa0", fontSize: 14, marginBottom: 8 }}>
          本系統需使用 LLM，採用 <code style={{ color: "#94a3b8" }}>gpt-4o-mini</code>，請輸入你的{" "}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer"
            style={{ color: "#60a5fa" }}>
            OpenAI API Key
          </a>
          。
        </p>
        <p style={{ color: "#4a5f7a", fontSize: 12, marginBottom: 24 }}>
          Key 僅存於瀏覽器本地，不會上傳至伺服器以外。
        </p>
        <input
          type="password"
          placeholder="sk-..."
          value={val}
          onChange={e => { setVal(e.target.value); setErr(""); }}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 8,
            border: "1px solid #2d3f5a", background: "#0f1923",
            color: "#e2eaf4", fontSize: 14, marginBottom: 8,
            boxSizing: "border-box",
          }}
          autoFocus
        />
        {err && <p style={{ color: "#f87171", fontSize: 13, margin: "0 0 8px" }}>{err}</p>}
        <button type="submit" style={{
          width: "100%", padding: "10px", borderRadius: 8,
          background: "#2563eb", color: "#fff", border: "none",
          fontSize: 14, cursor: "pointer", marginTop: 4,
        }}>
          進入系統
        </button>
        {serverHasKey && (
          <button type="button" onClick={useServerKey} style={{
            width: "100%", padding: "10px", borderRadius: 8,
            background: "transparent", color: "#94a3b8", border: "1px solid #2d3f5a",
            fontSize: 13, cursor: "pointer", marginTop: 10,
          }}>
            使用伺服器設定的 Key(不輸入)
          </button>
        )}
      </form>
    </div>
  );
}
