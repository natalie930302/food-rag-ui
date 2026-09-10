# food-rag-ui

`food-rag` RAG 問答系統的前端介面,提供食品法規問答的對話式 UI。

## 結構

- `src/App.jsx` — 主要對話介面
- `src/api.js` — 與 `food-rag` 後端 API 溝通
- `src/components/` — UI 元件

## 技術棧

React + Vite,搭配後端 `food-rag`(LlamaIndex + FAISS + OpenAI)提供的問答 API。

## 開發

```bash
npm install
npm run dev
```
