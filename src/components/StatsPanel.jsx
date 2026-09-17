import { useState, useEffect } from "react";
import { getHealth } from "../api";

function BarChart({ data, title }) {
  if (!data || !Object.keys(data).length) return null;
  const max = Math.max(...Object.values(data));
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 15);
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="bar-list">
        {sorted.map(([label, count]) => (
          <div key={label} className="bar-row">
            <div className="bar-label" title={label}>{label}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <div className="bar-count">{count.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CHECK_LABEL = { index: "法規索引", cases_index: "案例索引", embed_model: "Embedding 模型", reranker: "Reranker", openai_key: "OpenAI 金鑰" };

export default function StatsPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getHealth()
      .then(h => setStats({ ...h.index, health: h }))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-msg">載入統計資料中…</div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!stats) return null;

  return (
    <div>
      <div className="page-title">資料庫狀態</div>
      <div className="page-sub">索引內容、模型與裝置的目前狀態</div>

      <div className="card">
        <div className="card-title">系統狀態</div>
        <div className="meta-row">
          <span className={stats.health.status === "ok" ? "verdict verdict-pass" : "verdict verdict-warn"}>
            {stats.health.status === "ok" ? "運作中" : "部分資源未就緒"}
          </span>
          {Object.entries(stats.health.checks).map(([k, v]) => (
            <span key={k} className={v ? "" : "danger"}>{CHECK_LABEL[k] ?? k}:{v ? "就緒" : "未就緒"}</span>
          ))}
        </div>
        <div className="meta-row">
          <span>Embedding 裝置 {stats.health.embed_device}</span>
          <span>Reranker 裝置 {stats.health.reranker_device}{stats.health.reranker_fp16 ? "(fp16)" : ""}</span>
          <span>生成模型 {stats.health.model}</span>
          <span>已運行 {Math.round(stats.health.uptime_s / 60)} 分鐘</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-num">{stats.total_chunks.toLocaleString()}</div>
          <div className="stat-label">法規段落</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.total_violations.toLocaleString()}</div>
          <div className="stat-label">裁罰案例</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.ocr_chunks.toLocaleString()}</div>
          <div className="stat-label">OCR 段落</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.chunks_with_tables.toLocaleString()}</div>
          <div className="stat-label">含表格段落</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "#ef4444" }}>{stats.failed_files_count}</div>
          <div className="stat-label">解析失敗檔案</div>
        </div>
      </div>

      <BarChart data={stats.by_primary_law} title="法條分佈（Top 15）" />
      <BarChart data={stats.by_kind} title="文件類型分佈" />
      <BarChart data={stats.by_category} title="分類分佈" />
    </div>
  );
}
