import { useState } from "react";
import "./App.css";
import QueryPanel from "./components/QueryPanel";
import StatsPanel from "./components/StatsPanel";
import FailedPanel from "./components/FailedPanel";
import KeyGate from "./components/KeyGate";

const TABS = [
  { id: "ask",    icon: "💬", label: "問答 / 審稿" },
  { id: "stats",  icon: "📊", label: "索引統計" },
  { id: "failed", icon: "⚠️",  label: "失敗檔案" },
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
          <h1>食品法規 RAG 系統</h1>
          <span>一個入口・問法規・審廣告・查案例</span>
        </div>
      </div>

      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>食品法規<br />RAG 系統</h1>
          <span>一個入口・問法規・審廣告・查案例</span>
        </div>
        <nav>
          {TABS.map(t => (
            <div
              key={t.id}
              className={`nav-item${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className="nav-icon">{t.icon}</span>
              {t.label}
            </div>
          ))}
        </nav>
        <div
          onClick={clearKey}
          style={{
            padding: "12px 20px", fontSize: "0.72rem", color: "#3d4f6b",
            borderTop: "1px solid rgba(255,255,255,0.06)", cursor: "pointer",
          }}
          title="點擊清除 API Key"
        >
          🔑 更換 API Key
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
            <span className="bottom-nav-icon">{t.icon}</span>
            <span>{t.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
