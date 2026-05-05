# GHS Label Quick Search

化學品危險標籤快速查詢系統 - 輸入 CAS 號碼即可查詢化學品的 GHS 危害標示和安全資訊。

## 目錄

- [功能特色](#功能特色)
- [技術架構](#技術架構)
- [專案結構](#專案結構)
- [安裝與執行](#安裝與執行)
- [化學品名稱查詢邏輯](#化學品名稱查詢邏輯)
- [字典維護指南](#字典維護指南)
- [GHS 危害圖示說明](#ghs-危害圖示說明)
- [API 文件](#api-文件)
- [產品化設計文件](#產品化設計文件)
- [版本更新紀錄](#版本更新紀錄)

---

## 功能特色

> 目前 runtime 版本：`1.10.0`。前端已由 CRA/CRACO 遷移至 Vite，並新增列印用途模式、stock presets、QR 補充標籤、live preview、recent print reload、lab profile、pilot admin，以及預設 local-only、可選 admin-gated workspace sync 的 v1.10 功能。後續產品化與視覺改版方向見 [DESIGN.md](./DESIGN.md)、[BRANDED_UTILITY_STRATEGY.md](./BRANDED_UTILITY_STRATEGY.md)、[REDESIGN_ROADMAP.md](./REDESIGN_ROADMAP.md)。

### 🔍 單一查詢

- 輸入單個 CAS 號碼（如 `64-17-5`）
- 支援中文／英文化學品名稱（如 `乙醇`、`Ethanol`、`acetone`）
- 實時自動完成下拉（後端 `/search-by-name`，debounce 300ms，自動取消舊請求）
- 俗名／別名（例：`酒精` → 64-17-5）以綠色標籤區分
- 即時顯示化學品名稱和 GHS 危害標示

### 📋 批次查詢

- 支援從 Excel 複製貼上多個 CAS 號碼
- 支援逗號、換行、Tab 分隔
- 一次查詢多筆資料並以表格顯示（上限 100 筆）

### 📊 匯出功能

- 匯出為 Excel (.xlsx) 格式
- 匯出為 CSV 格式
- 包含完整的 GHS 標示和中文危害說明

### 📱 跨平台支援

- 響應式設計，支援電腦和手機
- 無需安裝，開啟瀏覽器即可使用

### 💾 搜尋紀錄

- 自動保存最近 50 筆搜尋紀錄
- 儲存在瀏覽器本地，保護隱私
- 點擊紀錄可快速重新查詢

### ⭐ 收藏功能

- 將常用化學品加入收藏
- 一鍵快速查看收藏的化學品資訊

### 🏷️ 標籤列印

- 多種標籤版型（圖示版、標準版、完整版、QR Code 版）
- 用途優先：主要容器完整標籤預設使用大型紙材與完整版；QR 補充與快速識別會明確標示為非完整主標籤
- 支援真實使用情境的 label stock presets、內容密度、直向／橫向、校正偏移與 live preview
- 支援批次列印、recent print reload、列印模板保存與 lab profile

### 🔧 自訂 GHS 分類

- 當化學品有多種 GHS 分類時，可選擇適用的分類
- 自訂設定儲存於瀏覽器，不會遺失

### 🌐 雙語介面

- 繁體中文 / English 一鍵切換
- 210 個翻譯 key，完整涵蓋所有介面文字
- 瀏覽器自動偵測語言，手動切換後記憶偏好

### 🔗 SDS 安全資料連結

- PubChem Safety 頁面直連
- ECHA 化學品搜尋連結
- 在結果表格與詳細資訊中皆可快速存取

### 📊 表格排序與篩選

- 支援 CAS 號碼、化學品名稱、警示語、GHS 圖示數排序
- 關鍵字即時篩選
- 警示語（危險/警告）下拉篩選

### ⌨️ 鍵盤快捷鍵

- `/` 快速聚焦搜尋框（與 GitHub / YouTube 一致，`Ctrl+K` 仍保留為備援）
- 方向鍵導航自動完成建議
- `Enter` 直接觸發搜尋
- `Escape` 關閉側欄或 Modal
- Tab 鍵被 focus trap 限制在當前對話框內

### 📚 中文化學品名稱字典

- 內建 **1,707 個** CAS 號碼對應的中文名稱
- 內建 **1,707 個** CAS 號碼對應的英文名稱
- 內建 **1,861 個** 英文名稱對應的中文翻譯
- 支援模糊比對（去除特殊字元後匹配）

---

## 技術架構

| 層級             | 技術                                   | 說明                                                                                          |
| ---------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| 前端             | React 19 + Tailwind CSS 3.4 + Radix UI | 響應式使用者介面                                                                              |
| UI 元件          | 20+ 自訂元件 + 46 個 shadcn/ui 原件    | lucide-react 圖示                                                                             |
| React 自訂 Hooks | 15+ 個                                 | localStorage-first 狀態、可選 workspace sync、排序、列印模板、focus trap、pilot observability |
| 建置工具         | Vite 6 + `@vitejs/plugin-react`        | `@` alias、Jest、ESLint                                                                       |
| 國際化           | react-i18next 14.x + i18next 23.x      | 210 keys × 2 語言                                                                             |
| 後端             | FastAPI (Python 3.11)                  | RESTful API 服務                                                                              |
| 資料來源         | PubChem API                            | GHS 危害標示資料；含重試 / 退避 / 出站 semaphore                                              |
| 本地字典         | Python Dict                            | 中英文名稱對照 (1,707 筆) + 別名 (~150 筆)                                                    |
| 快取             | cachetools (TTLCache)                  | 24 小時記憶體快取 (最多 5,000 筆)                                                             |
| Rate limiting    | slowapi (in-memory)                    | 每 IP 每端點分別限流                                                                          |
| 部署             | Zeabur (Docker + Static)               | Git push 自動部署                                                                             |

---

## 專案結構

```
GHS-label-quick-search/
├── backend/
│   ├── server.py              # FastAPI 主程式（API、快取、PubChem 整合、rate limit）
│   ├── chemical_dict.py       # 化學品字典（CAS/英/中對照 + ALIASES_ZH/EN）
│   ├── test_name_search.py    # 99 個後端測試
│   ├── requirements.txt       # Python 依賴套件
│   ├── requirements-dev.txt   # 開發工具 (black, flake8, pytest 等)
│   ├── Dockerfile             # Docker 容器設定 (非 root 執行)
│   ├── pytest.ini             # asyncio_mode = auto
│   └── .env.example           # 環境變數範本
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # React 主元件（state hub；新行為優先拆 hook/util）
│   │   ├── main.jsx           # 進入點 (ErrorBoundary + i18n)
│   │   ├── components/        # 20+ 個自訂元件
│   │   │   ├── Header.jsx                       # 頂部列（收藏／紀錄／語言切換）
│   │   │   ├── SearchSection.jsx                # 搜尋區塊（單一／批次 tab，batch>100 alert）
│   │   │   ├── SearchAutocomplete.jsx           # 自動完成下拉（含 abort race guard）
│   │   │   ├── ResultsTable.jsx                 # 結果表格（排序／篩選／匯出／SDS／比較按鈕）
│   │   │   ├── DetailModal.jsx                  # 詳細資訊 Modal
│   │   │   ├── ClassificationComparisonTable.jsx # 多分類對照表（same-chem / cross-chem 共用）
│   │   │   ├── ComparisonModal.jsx              # 跨化學品比較 Modal
│   │   │   ├── LabelPrintModal.jsx              # 標籤列印設定（含儲存 preset）
│   │   │   ├── FavoritesSidebar.jsx             # 收藏側邊欄
│   │   │   ├── HistorySidebar.jsx               # 搜尋紀錄側邊欄
│   │   │   ├── EmptyState.jsx                   # 首頁快速開始
│   │   │   ├── Footer.jsx                       # 頁尾（版本／聲明）
│   │   │   ├── ErrorBoundary.jsx                # 錯誤邊界
│   │   │   ├── SkeletonTable.jsx                # 載入骨架屏
│   │   │   └── GHSImage.jsx                     # GHS 圖示顯示
│   │   ├── hooks/             # 8 個自訂 Hooks
│   │   │   ├── useSearchHistory.js   # 搜尋紀錄 (localStorage, 上限 50)
│   │   │   ├── useFavorites.js       # 收藏功能
│   │   │   ├── useCustomGHS.js       # 自訂 GHS 分類
│   │   │   ├── useLabelSelection.js  # 標籤勾選狀態
│   │   │   ├── useResultSort.js      # 表格排序
│   │   │   ├── usePrintTemplates.js  # 列印設定 preset（localStorage，上限 10 組）
│   │   │   ├── useFocusTrap.js       # Modal/Sidebar focus trap + 焦點還原
│   │   │   └── use-toast.js          # Toast 通知（sonner）
│   │   ├── utils/             # 4 個工具函式
│   │   │   ├── exportData.js         # Excel/CSV 匯出（呼叫後端）
│   │   │   ├── printLabels.js        # 標籤列印引擎（4 版型 + HTML escape + afterprint 清理）
│   │   │   ├── sdsLinks.js           # SDS 安全資料連結產生器
│   │   │   └── formatDate.js         # 日期格式化
│   │   ├── i18n/              # 國際化
│   │   │   ├── index.js              # i18next 初始化
│   │   │   └── locales/
│   │   │       ├── zh-TW.json        # 繁體中文 (210 keys)
│   │   │       └── en.json           # English (210 keys)
│   │   ├── constants/
│   │   │   └── ghs.js               # BACKEND_URL, API, GHS_IMAGES, BATCH_SEARCH_LIMIT
│   │   └── components/ui/    # 46 個 shadcn/ui 元件
│   ├── vite.config.js         # Vite 設定 (@ alias, dev health routes)
│   ├── tailwind.config.js     # Tailwind CSS 設定
│   ├── package.json           # Node.js 依賴套件
│   └── .env.example           # 前端環境變數範本
├── .github/workflows/ci.yml   # GitHub Actions（frontend + backend 測試）
├── CLAUDE.md                  # Claude Code 專案上下文
├── zeabur.yaml                # Zeabur 部署設定 (前後端 2 服務)
└── README.md                  # 專案說明文件
```

---

## 安裝與執行

### 環境需求

- Python 3.9+
- Node.js 18+（CI 使用 Node 22；Zeabur Dockerfile 使用 Node 22，Vite 6 仍支援 Node 18 線）

### 後端安裝

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 建立環境變數 (可選)
cp .env.example .env
```

### 前端安裝

```bash
cd frontend
npm ci

# 建立環境變數
cp .env.example .env
```

### 啟動服務

```bash
# 後端 (預設 port 8001)
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# 前端 (Vite 預設 port 5173)
cd frontend
npm run dev
```

本機瀏覽器驗證需讓 backend CORS 允許 Vite 來源；`backend/.env.example`
已預設為 `http://localhost:5173,http://127.0.0.1:5173`。若改用其他
前端 port，請同步更新 `CORS_ORIGINS`。

---

## 化學品名稱查詢邏輯

系統使用多層查詢策略，確保最高的名稱準確度：

```
┌─────────────────────────────────────────────────────────┐
│                    查詢優先順序                          │
├─────────────────────────────────────────────────────────┤
│ 1. CAS 字典直接查詢 (最準確)                             │
│    └─ 使用本地 CAS_TO_ZH / CAS_TO_EN 字典               │
│                                                         │
│ 2. PubChem API 查詢 (並行 3 種方法)                      │
│    └─ 取得 GHS 危害資料及名稱                            │
│                                                         │
│ 3. 英文名稱字典查詢 (備用)                               │
│    ├─ 精確匹配 CHEMICAL_NAMES_ZH_EXPANDED               │
│    └─ 模糊匹配 (去除特殊字元後比對)                       │
└─────────────────────────────────────────────────────────┘
```

### 字典檔案說明

字典資料位於 `backend/chemical_dict.py`：

| 字典名稱                     | 用途        | 數量     | 範例                   |
| ---------------------------- | ----------- | -------- | ---------------------- |
| `CAS_TO_ZH`                  | CAS → 中文  | 1,707 筆 | `"64-17-5": "乙醇"`    |
| `CAS_TO_EN`                  | CAS → 英文  | 1,707 筆 | `"64-17-5": "Ethanol"` |
| `CHEMICAL_NAMES_ZH_EXPANDED` | 英文 → 中文 | 1,861 筆 | `"ethanol": "乙醇"`    |

---

## 字典維護指南

字典的真實來源是 `backend/chemical_dict.py`（直接編輯 Python literal）。
該檔包含 6 個資料結構：

| 結構                         | 用途                                                               |
| ---------------------------- | ------------------------------------------------------------------ |
| `CAS_TO_ZH` / `CAS_TO_EN`    | CAS → 正式中 / 英文名（主字典，1,707 筆）                          |
| `CHEMICAL_NAMES_ZH_EXPANDED` | 英文名（小寫）→ 中文，補 PubChem 同義詞查不到時使用                |
| `ALIASES_ZH` / `ALIASES_EN`  | 俗名／別名 → CAS（例：`酒精 → 64-17-5`）                           |
| 自動建立的反向索引           | `EN_TO_CAS` / `ZH_TO_CAS` 在模組 import 時由上面幾個 dict 合併產生 |

### 新增化學品（少量手動）

1. 在 `CAS_TO_ZH` 和 `CAS_TO_EN` 兩個 dict 中各加一筆：
   ```python
   "123-45-6": "化學品中文名",
   "123-45-6": "Chemical English Name",
   ```
2. 若希望以英文名稱模糊搜尋找到，在 `CHEMICAL_NAMES_ZH_EXPANDED` 加入該名稱（小寫為 key）。
3. 若有俗名／別名，在 `ALIASES_ZH` 或 `ALIASES_EN` 加入，值指向 CAS。
4. 執行 `python -m pytest backend/test_name_search.py -v` 驗證。
5. 重啟後端（本機 `uvicorn server:app --reload`；Zeabur `git push`）。

### 批次匯入

若要大量匯入（數百筆以上），建議：

- 以自己的來源資料（Excel / CSV / 其他 SDS 資料庫）為主，
- 寫一次性腳本輸出成 Python dict literal，再 diff 貼到 `chemical_dict.py`。
- 不要覆寫檔案：`ALIASES_ZH` / `ALIASES_EN` 和任何手動調整都會丟失。

---

## GHS 危害圖示說明

| 圖示 | 代碼  | 中文名稱    | 說明                       |
| :--: | ----- | ----------- | -------------------------- |
|  💥  | GHS01 | 爆炸物      | 爆炸性物質                 |
|  🔥  | GHS02 | 易燃物      | 易燃液體、氣體、固體       |
|  ⭕  | GHS03 | 氧化劑      | 可能導致或加劇燃燒         |
|  🫧  | GHS04 | 壓縮氣體    | 高壓氣體容器               |
|  🧪  | GHS05 | 腐蝕性      | 對皮膚或金屬有腐蝕性       |
|  💀  | GHS06 | 劇毒        | 急性毒性（致命）           |
|  ⚠️  | GHS07 | 刺激性/有害 | 刺激性或有害物質           |
|  🫁  | GHS08 | 健康危害    | 致癌、致突變等長期健康危害 |
|  🐟  | GHS09 | 環境危害    | 對水生生物有毒             |

---

## API 文件

### 端點一覽

| 端點                          | 方法 | 限流      | 說明                                      |
| ----------------------------- | ---- | --------- | ----------------------------------------- |
| `/api/health`                 | GET  | –         | 健康檢查（部署健檢不限流）                |
| `/api/search/{query}`         | GET  | 30/min/IP | 單一查詢；自動偵測 CAS 或中／英文名稱     |
| `/api/search-by-name/{query}` | GET  | 60/min/IP | 名稱自動完成（回傳至多 20 筆）            |
| `/api/search`                 | POST | 10/min/IP | 批次 CAS 查詢（上限 100 筆，超過回 422）  |
| `/api/export/xlsx`            | POST | 10/min/IP | 匯出 Excel（上限 500 筆，含公式注入中和） |
| `/api/export/csv`             | POST | 10/min/IP | 匯出 CSV（上限 500 筆，含公式注入中和）   |
| `/api/ghs-pictograms`         | GET  | –         | 取得所有 GHS 圖示資訊                     |

回應格式中的 `upstream_error: true` 代表 PubChem 暫時無法回應，前端會顯示「請稍後再試」而非「查無資料」。

### 單一查詢範例

```bash
curl https://ghs-backend.zeabur.app/api/search/64-17-5
```

### 批次查詢範例

```bash
curl -X POST https://ghs-backend.zeabur.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"cas_numbers": ["64-17-5", "67-56-1", "100-42-5"]}'
```

### 健康檢查

```bash
curl https://ghs-backend.zeabur.app/api/health
# {"status": "healthy", "timestamp": "...", "version": "1.10.0"}
```

---

## 產品化設計文件

目前產品化方向已拆成三份文件：

- [DESIGN.md](./DESIGN.md)：定義 `GHS Quick Safety Workspace` 的 light-first 視覺系統、元件方向與安全邊界。
- [BRANDED_UTILITY_STRATEGY.md](./BRANDED_UTILITY_STRATEGY.md)：定義免費工具如何導流、哪些地方可放 CTA、哪些 GHS/安全內容不得放廣告。
- [REDESIGN_ROADMAP.md](./REDESIGN_ROADMAP.md)：把後續改版拆成文件同步、light-first app shell、results workspace、detail safety summary、print workflow polish、soft brand surfaces 與驗證階段。

### 回應格式

```json
{
  "cas_number": "64-17-5",
  "cid": 702,
  "name_en": "Ethanol",
  "name_zh": "乙醇",
  "ghs_pictograms": [
    {
      "code": "GHS02",
      "name": "Flammable",
      "name_zh": "易燃物",
      "icon": "🔥",
      "image": "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS02.svg"
    }
  ],
  "hazard_statements": [
    {
      "code": "H225",
      "text_en": "H225: Highly Flammable liquid and vapor",
      "text_zh": "高度易燃液體和蒸氣"
    }
  ],
  "signal_word": "Danger",
  "signal_word_zh": "危險",
  "found": true,
  "error": null
}
```

### 常見化學品 CAS 號碼

| CAS No.    | 英文名稱               | 中文名稱 |
| ---------- | ---------------------- | -------- |
| 64-17-5    | Ethanol                | 乙醇     |
| 67-56-1    | Methanol               | 甲醇     |
| 7732-18-5  | Water                  | 水       |
| 7647-01-0  | Hydrochloric acid      | 鹽酸     |
| 7664-93-9  | Sulfuric acid          | 硫酸     |
| 100-42-5   | Styrene                | 苯乙烯   |
| 10025-87-3 | Phosphorus oxychloride | 三氯氧磷 |

---

## 版本更新紀錄

### v1.10.0 (2026-04)

v1.10 將專案從「可用的查詢/列印工具」推進到更接近日常 lab workspace 的狀態。

**Build / deploy**

- 前端由 `react-scripts + CRACO` 遷移到 Vite，scripts 改為 `npm test` / `npm run build` / `npm run dev`。
- CI 使用 Node 22 + `npm ci`，並在 unit tests 前執行 `npm run test:i18n`；Zeabur frontend 透過 Dockerfile/`zeabur.yaml` 使用 npm build。
- runtime 版本已同步到 `frontend/package.json`、`frontend/src/constants/version.js`、`backend/server.py` 與 Footer test。

**Print workflow**

- 新增用途優先的主要容器 / QR 補充 / 快速識別列印模式、label stock presets、live sheet preview、real print HTML label-fragment preview。
- 新增 recent print reload、lab profile、template save/load、校正/偏移控制。
- 重整 `full` 主要標籤與 compact `standard` / `qrcode` 補充標籤資訊階層，讓 signal word、pictograms、H/P statements、QR scan 目標更清楚。

**Pilot / workspace**

- 新增 gated pilot admin dashboard。
- backend 新增 SQLite-backed dictionary/pilot persistence；workspace documents 現在預設不由 public frontend 同步，只有 `VITE_ENABLE_WORKSPACE_SYNC=true` 且提供 admin key 時才會同步 prepared recents/presets、print templates、lab profile、print recents、自訂 label fields。manual entries、aliases、reference links 仍屬 admin-gated pilot surfaces；no-result dictionary miss capture 也預設關閉，需 `CAPTURE_DICTIONARY_MISSES=true` 才會收集。

**Verification baseline**

- 最近前端驗證：`npm run test:i18n` → success；`npm test -- --runInBand --watchAll=false` → 42 suites / 664 passed；`npm run build` → success，並透過 Vite `manualChunks` 拆分 vendor bundles。
- backend 最近基準：`python -m pytest -v` → 126 passed；若修改 backend 行為需重跑。

### v1.9.0 (2026-04)

完整「prepared-solution workflow」— 稀釋液 / 工作液的 secondary-container
標籤流程，完全守在 v1.8 的 trust boundary 內：parent-verbatim GHS、不做
mixture classification、不做 multi-solute、不加 backend persistence。

**M3 Tier 1 — 稀釋液標籤列印流程**

- 🧪 DetailModal 新增「Prepare solution / 配製稀釋液」入口（僅對有 GHS 的化學品）
- 🧪 `PrepareSolutionModal`：read-only 母化學品摘要 + concentration / solvent 輸入 + trust-boundary 註記
- 🧪 `buildPreparedSolutionItem()` 以 parent spread 保留所有母化學品欄位；prepared item 進 `selectedForLabel`
- 🧪 `LabelPrintModal` 為 prepared item 顯示藍色列 + `Prepared` 徽章 + concentration / solvent meta
- 🧪 四種列印模板都支援 prepared-solution 渲染（`label-prepared` CSS class + badge + meta + 標籤印出的 trust note）
- 🧪 Lifecycle 硬規則：submit 時 `selectedForLabel` 換成 `[preparedItem]`、`labelQuantities = {}`、`preparedFlowActive` session flag；LabelPrintModal 關閉時一律清空選擇與數量（不倚賴當下 selection 狀態），Escape 在 PrepareSolutionModal 只關這一層，DetailModal 會被標為 `inert` / `aria-hidden`

**M3 Tier 2 — 日常可重用的配製工作流**

- ⏱️ **Operational metadata**：`preparedBy` / `preparedDate` / `expiryDate`（都是選填、使用者自填、系統不推導）
- ⏱️ **Recent prepared** (`usePreparedRecents`)：localStorage-only、schemaVersion:1、最多 10 筆、以 `(parentCas, concentration, solvent, preparedBy, preparedDate, expiryDate)` 去重；PrepareSolutionModal 內顯示 parent-scoped recent 清單，點選僅 prefill 不 auto-submit
- 📚 **Saved presets** (`usePreparedPresets`)：localStorage-only、recipe-only（只存 parent identity + concentration + solvent；operational fields 刻意不存）、以 `(parentCas, concentration, solvent)` 去重；點選僅帶回配方，清空 operational 欄位
- 🏷️ **Derived preview name**（`formatPreparedDisplayName`）：在 app 內顯示 `10% Ethanol in Water`（不印到標籤，留待 pilot 回饋）
- 🗂️ Stores 隔離：prepared recents / presets 完全不流進 favorites / history / comparison / search；hook 層級有 isolation 測試釘住

**Dogfood-driven UX cleanup**

- ✉️ Save-as-preset 有 `toast.success` 確認（解決「按下去像沒事發生」）
- 📅 `preparedDate` mount 預設今天（local TZ `todayDateString()` helper，不走 UTC `toISOString().slice(0,10)` 避免 off-by-one-day）
- 📅 點 Recent 不再靜默帶回舊日期：`preparedDate` 重設成今天、`expiryDate` 清空；`preparedBy` 與配方欄位仍沿用
- 📅 點 Preset 一致化：`preparedBy` 清空、`preparedDate` 今天、`expiryDate` 清空

**Residual debt cleared**

- 🧹 Dead `selectionHasPreparedItem` helper 移除 + dead-export guard
- 🧹 Stacked `aria-modal` 修正：DetailModal `suppressed` prop 處理 `inert` / `aria-hidden` / `aria-modal` drop / Escape + backdrop gate

**Tests**

- Backend: **123** tests（不變，v1.9 沒有新 backend 程式碼）
- Frontend: 448 → **597** tests across 29 → **34** suites
- React `act(...)` warnings: **0**

### v1.8.0 (2026-04)

**M0 — 預防措施說明（P-codes）**

- 🔸 後端解析 PubChem 的 Precautionary Statement Codes（單碼 + 組合碼 P301+P310 / P303+P361+P353 等）
- 🔸 142 筆 P-code 繁體中文對照表（`backend/p_code_translations.py`）
- 🔸 `ChemicalResult.precautionary_statements` 欄位（`text_en` / `text_zh` 與 `hazard_statements` 一致 contract）
- 🔸 DetailModal + ClassificationComparisonTable 顯示 P-code 列
- 🔸 列印「完整版」模板含 P-code 全文；「標準版」顯示 code-only 精簡 pill + 溢出提示；「圖示版」/「QR 版」維持精簡
- 🔸 匯出 XLSX / CSV 新增第 7 欄「預防措施」，沿用 `spreadsheet_safe()` 中和公式注入

**M1 — 資料來源與可信度訊號**

- 🔸 Backend 回傳 `primary_source` / `primary_report_count` / `retrieved_at` / `cache_hit`
- 🔸 DetailModal 新增「資料來源」區塊；ResultsTable 加 ECHA / 報告數 / 快取 chips
- 🔸 Cache 結果保留原始抓取時間，不在每次 hit 時刷新；24 小時後才重抓
- 🔸 Upstream-error banner（`role="alert"`）與 SDS-authoritative note 一起登場於結果頁 / DetailModal / 列印 footer
- 🔸 `formatRelativeTime()` helper 支援 zh-TW / en 的「5 分鐘前」相對時間

**M2 — 信任邊界收斂與工作流微改善**

- 🔸 `hasGhsData()` + `hasRenderableGhsVisual()` helpers；ResultsTable GHS 欄位改成三段式邏輯（未歸類 / 無 pictogram 但有 H-codes / 可渲染 pictogram）
- 🔸「PubChem 無 GHS 分類資料」明確警語取代舊有「No hazard label」的誤導文案
- 🔸 Cache badge tooltip 有 / 無 `retrieved_at` 兩個 i18n key，with-age 版顯示實際陳舊時間
- 🔸 新快捷按鈕「Print all with GHS data / 列印所有有 GHS 分類的化學品」，作用在整次搜尋結果（**不跟畫面 filter 綁**）；直接 setState 不走既有 `handleOpenLabelModal` auto-select-all-found 路徑

**Tests**

- Backend: 103 → **123** tests
- Frontend: 294 → **448** tests across **29** suites
- React `act(...)` warnings: **0**
- 直接 dependency CVE: 維持清零

### v1.7.0 (2026-04)

**使用者功能**

- 🔎 **化學品名稱搜尋**：後端反向字典 + `/api/search-by-name/{query}`，支援中文／英文實時自動完成（300ms debounce，自動取消舊請求）
- 🧭 **搜尋框快捷鍵**：「`/`」鍵（瀏覽器不會攔截，與 GitHub/YouTube 相同）
- 🏷️ **俗名／別名**：ALIASES_ZH (~90 個) + ALIASES_EN (~60 個)，例 `酒精 → 64-17-5`；autocomplete 顯示綠色標籤
- 🏷️ **列印強化**：
  - 4 種標籤版型 + 3 尺寸 + 橫／直印
  - 雙語顯示：both / 純英文 / 純中文
  - 每個化學品 1–20 份獨立份數
  - 完整版依危害數量自動縮字
  - 實驗室名稱 / 日期 / 批號自訂欄位
  - 儲存列印設定（最多 10 組 preset）
  - B&W / Color 列印切換
- ⚖️ **分類比較表**：DetailModal 內同一化學品多分類並排比較 + ResultsTable 跨化學品比較 Modal
- 🖼️ **彈跳視窗攔截修復**：popup blocker 不再擋列印；改用隱藏 iframe + `afterprint` 清理

**可靠性 / 安全性（Phase 1）**

- 🔒 **PubChem 錯誤分類**：加入 `pubchem_get_json()` 重試 helper（指數退避 + jitter + Retry-After），區分 transient (429/5xx/timeout) 與 definitive (404)；回傳 `upstream_error: true` 而不是偽裝成「無危害」
- 🔒 **GHS 分類去重**：用完整簽章 `(pictograms, signal_word, H-codes, source)` 取代 pictogram-only，不再丟失同圖示但 H-code 不同的報告
- 🔒 **匯出安全**：CSV/XLSX 公式注入中和（`'=HYPERLINK(...)` 前置 apostrophe），500 筆上限
- 🔒 **列印 HTML escaping**：localStorage / 使用者輸入 / PubChem 文字在寫入 iframe 前全部 escape
- 🔒 **CORS 收嚴**：預設不再是 `*`；`allow_credentials=False`
- 🔒 **Rate limiting**：slowapi 每 IP 每端點限流 + PubChem 出站 `asyncio.Semaphore(8)`

**穩定性 / 無障礙（Phase 2）**

- 🏁 **Autocomplete 競態修復**：input 改變立即 abort 飛行中請求，`latestQueryRef` 二層保險過濾 stale response
- 🧹 **iframe 清理改用 afterprint**：原本固定 1 秒，現以 `afterprint` 事件觸發 + 60 秒 fallback
- 🚦 **前端攔截 batch > 100**：顯示本地化警示，雙層守門
- ♿ **自訂側欄 focus trap**：新 `useFocusTrap` hook 處理初始 focus、Tab 循環、Escape 關閉、焦點還原

**品質**

- 🧪 **測試覆蓋**：Backend 99（原 30）、Frontend 354（原 180）；補齊 LabelPrintModal、ErrorBoundary、FavoritesSidebar、HistorySidebar、useFocusTrap
- 📈 i18n key 數量：210（原 187）
- 🗑️ 清理死檔：`backend_test.py`、`tests/`、`字典.csv`、`test_result.md`

### v1.6.0 (2026-02)

- 🌐 **i18n 雙語系統**：繁體中文 / English 一鍵切換，187 個翻譯 key
- 📊 **表格排序**：支援 CAS 號碼、名稱、警示語、GHS 圖示數（升序/降序切換）
- 🔍 **表格篩選**：關鍵字即時篩選 + 警示語下拉篩選
- 🔗 **SDS 安全資料連結**：PubChem Safety 頁面直連 + ECHA 化學品搜尋
- 🐛 修復搜尋按鈕首次點擊無反應（rAF 延遲 mousedown handler）
- 🐛 修復收藏詳細資訊點擊崩潰（補齊 favorite 物件遺漏欄位 + null fallback）
- ⬇️ 降版 i18n 套件（23.x / 14.x / 7.x）解決 Zeabur npm peer dep 衝突

### v1.5.0 (2026-02)

- ⚡ 效能與使用者體驗優化
- 🎨 互動動畫和載入狀態改善

### v1.4.0 (2026-02)

- 🏗️ **架構重構**：單體 App.js 拆分為 15 個模組
- 📦 13 個 React 元件 + 6 個自訂 Hooks + 4 個工具函式
- 📐 CRACO 整合，支援 `@` 路徑別名
- 🎨 shadcn/ui 元件庫整合（46 個 UI 基礎元件）

### v1.3.0 (2026-02)

- 🎨 UI 現代化：深色主題全面翻新
- 🏷️ 移除 Emergent 品牌標識
- 🖨️ 修正標籤列印版面配置

### v1.2.0 (2026-02)

- 🔒 安全性強化：CORS 限制、Dockerfile 非 root 使用者、批次查詢上限 100 筆
- ⚡ 效能優化：PubChem 回應快取（24hr TTL）、並行 CID 查詢、共享 HTTP 連線池
- 🏗️ 架構重構：提取 React 自訂 Hooks（useSearchHistory / useFavorites / useCustomGHS）
- 🛡️ 新增 React ErrorBoundary 防止白畫面
- 🩺 新增 `/api/health` 健康檢查端點
- 📦 精簡依賴：requirements.txt 從 73 個套件減至 12 個
- 🧹 程式碼清理：移除未使用的 MongoDB 連線、重複字典檔、廢棄函式
- ⚙️ FastAPI lifespan 取代已棄用的 `on_event`
- 📖 英文→中文字典擴充至 1,861 筆（合併 45 個常見化學品）

### v1.1.0 (2025-01)

- ✨ 整合用戶提供的化學品字典（1,707 個 CAS 號碼）
- ✨ 新增 `CAS_TO_EN` 字典，支援 CAS → 英文名稱直接查詢
- 🐛 修正含括號的化學品名稱被截斷的問題
- 🐛 修正 PubChem 無資料時英文名稱顯示「名稱載入中...」的問題
- 📈 中文名稱覆蓋率從約 150 個提升至 1,707 個

### v1.0.0 (初始版本)

- 🎉 GHS 危害標示查詢功能
- 🎉 單一/批次查詢
- 🎉 Excel/CSV 匯出
- 🎉 搜尋紀錄功能
- 🎉 內建約 150 個常見化學品中文名稱

---

## 注意事項

⚠️ **免責聲明**: 本系統資料來自 PubChem (NIH) 及本地字典，僅供參考用途。實際使用化學品時，請以官方安全資料表 (SDS) 為準。

---

## 授權

MIT License

---

## 聯絡方式

如有問題或建議，歡迎透過 Issue 回報。
