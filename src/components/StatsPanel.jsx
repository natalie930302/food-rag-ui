import { useState, useEffect } from "react";
import { getStats } from "../api";

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

export default function StatsPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-msg">載入統計資料中…</div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!stats) return null;

  return (
    <div>
      <div className="page-title">索引統計</div>
      <div className="page-sub">目前向量索引與資料庫內容概況</div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-num">{stats.total_chunks.toLocaleString()}</div>
          <div className="stat-label">法規 Chunks</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.total_violations.toLocaleString()}</div>
          <div className="stat-label">違規案例</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.ocr_chunks.toLocaleString()}</div>
          <div className="stat-label">OCR Chunks</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.chunks_with_tables.toLocaleString()}</div>
          <div className="stat-label">含表格 Chunks</div>
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
