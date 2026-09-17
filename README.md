# food-rag-ui

[food-rag](https://github.com/natalie930302/food-rag) 的前端。**單一輸入框**:問法規、找裁罰案例、或直接貼廣告文案,
都送到後端唯一的 `POST /query`,由後端 router(規則層 → LLM 層)判定意圖並分派到路徑;前端只依回傳的 `route`
決定呈現方式(審稿顯示風險燈號與關鍵字,其餘顯示信心狀態與回答),並可展開每一步執行軌跡(trace)。

## 分頁

- **問答 / 審稿**:單一入口,不需要選模式;後端判定意圖(問規定 / 查案例 / 審稿 / 多步)後自己選路徑(固定 / 審稿 / agent),畫面顯示「意圖(哪一層判的)→ 路徑」
- **索引統計 / 失敗檔案**:`GET /health`

## 結構

- `src/App.jsx` — 側欄與分頁
- `src/api.js` — 與後端溝通(`query()`、`getHealth()`、`getLawRelated()`)
- `src/components/QueryPanel.jsx` — 單一入口與結果呈現
- `src/components/KeyGate.jsx` — 使用者自帶 OpenAI key;**只存在瀏覽器 localStorage,不經過任何伺服器**

## 開發

```bash
npm install
npm run dev      # vite dev server,/api 代理到 http://localhost:8000
npm run build
```
