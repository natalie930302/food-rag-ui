import { useState } from "react";
import "./App.css";
import AskPanel from "./components/AskPanel";
import ReviewPanel from "./components/ReviewPanel";
import StatsPanel from "./components/StatsPanel";
import LawsPanel from "./components/LawsPanel";
import FailedPanel from "./components/FailedPanel";

const TABS = [
  { id: "ask",    icon: "💬", label: "法規問答" },
  { id: "review", icon: "📋", label: "廣告審稿" },
  { id: "laws",   icon: "⚖️",  label: "法條關聯" },
  { id: "stats",  icon: "📊", label: "索引統計" },
  { id: "failed", icon: "⚠️",  label: "失敗檔案" },
];

export default function App() {
  const [tab, setTab] = useState("ask");

  return (
    <div className="layout">
      <div className="mobile-header">
        <div>
          <h1>食品法規 RAG 系統</h1>
          <span>食安法 × 藥事法 × 健康食品法 × 違規案例</span>
        </div>
      </div>

      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>食品法規<br />RAG 系統</h1>
          <span>食安法 × 藥事法 × 健康食品法 × 違規案例</span>
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
        <div style={{ padding: "16px 20px", fontSize: "0.72rem", color: "#3d4f6b", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          API: localhost:8000
        </div>
      </aside>

      <main className="main">
        {tab === "ask"    && <AskPanel />}
        {tab === "review" && <ReviewPanel />}
        {tab === "laws"   && <LawsPanel />}
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
