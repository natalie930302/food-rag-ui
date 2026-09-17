import { useState } from "react";
import "./App.css";
import QueryPanel from "./components/QueryPanel";
import StatsPanel from "./components/StatsPanel";
import FailedPanel from "./components/FailedPanel";
import KeyGate from "./components/KeyGate";

const TABS = [
  { id: "ask",    label: "查詢" },
  { id: "stats",  label: "資料庫狀態" },
  { id: "failed", label: "解析紀錄" },
];

export default function App() {
  const [tab, setTab] = useState("ask");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("openai_key") || "");

  function handleKey(k) { setApiKey(k); }
  function clearKey() {
    localStorage.removeItem("openai_key");
    setApiKey("");
  }

  if (!apiKey) return <KeyGate onKey={handleKey} />;

  return (
    <div className="layout">
      <div className="mobile-header">
        <div>
          <h1>食品法規查詢系統</h1>
          <span>法規問答 · 裁罰案例 · 廣告文案審查</span>
        </div>
      </div>

      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>食品法規<br />查詢系統</h1>
          <span>法規問答 · 裁罰案例 · 廣告文案審查</span>
        </div>
        <nav>
          {TABS.map(t => (
            <div
              key={t.id}
              className={`nav-item${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </div>
          ))}
        </nav>
        <div
          onClick={clearKey}
          style={{
            padding: "12px 20px", fontSize: "0.75rem", color: "#8892b0",
            borderTop: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
          }}
          title="清除已儲存的 API 金鑰"
        >
          更換 API 金鑰
        </div>
      </aside>

      <main className="main">
        {tab === "ask"    && <QueryPanel apiKey={apiKey} />}
        {tab === "stats"  && <StatsPanel />}
        {tab === "failed" && <FailedPanel />}
      </main>

      <nav className="bottom-nav">
        {TABS.map(t => (
          <div
            key={t.id}
            className={`bottom-nav-item${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span>{t.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
