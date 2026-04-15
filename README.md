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
- [版本更新紀錄](#版本更新紀錄)

---

## 功能特色

### 🔍 單一查詢
- 輸入單個 CAS 號碼（如 `64-17-5`）
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
- 可調整標籤尺寸（小、中、大）
- 支援批次列印

### 🔧 自訂 GHS 分類
- 當化學品有多種 GHS 分類時，可選擇適用的分類
- 自訂設定儲存於瀏覽器，不會遺失

### 🌐 雙語介面
- 繁體中文 / English 一鍵切換
- 187 個翻譯 key，完整涵蓋所有介面文字
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
- `Ctrl+K` 快速聚焦搜尋框
- 方向鍵導航自動完成建議
- `Enter` 直接觸發搜尋

### 📚 中文化學品名稱字典
- 內建 **1,707 個** CAS 號碼對應的中文名稱
- 內建 **1,707 個** CAS 號碼對應的英文名稱
- 內建 **1,861 個** 英文名稱對應的中文翻譯
- 支援模糊比對（去除特殊字元後匹配）

---

## 技術架構

| 層級 | 技術 | 說明 |
|------|------|------|
| 前端 | React 19 + Tailwind CSS 3.4 + Radix UI | 響應式使用者介面 |
| UI 元件 | 13 自訂元件 + 46 個 shadcn/ui 原件 | lucide-react 圖示 |
| 建置工具 | CRACO 7.1.0 (wrapping CRA) | `@` alias, ESLint |
| 國際化 | react-i18next 14.x + i18next 23.x | 187 keys × 2 語言 |
| 後端 | FastAPI (Python 3.11) | RESTful API 服務 |
| 資料來源 | PubChem API | GHS 危害標示資料 |
| 本地字典 | Python Dict | 中英文名稱對照 (1,707+ 筆) |
| 快取 | cachetools (TTLCache) | 24 小時記憶體快取 (最多 5,000 筆) |
| 部署 | Zeabur (Docker + Static) | Git push 自動部署 |

---

## 專案結構

```
GHS-label-quick-search/
├── backend/
│   ├── server.py              # FastAPI 主程式 (834 行, API、快取、PubChem 整合)
│   ├── chemical_dict.py       # 化學品字典 (CAS/英文/中文對照, 5295 行)
│   ├── requirements.txt       # Python 依賴套件 (11 個)
│   ├── requirements-dev.txt   # 開發工具 (black, flake8, pytest 等)
│   ├── Dockerfile             # Docker 容器設定 (非 root 執行)
│   └── .env.example           # 環境變數範本
├── frontend/
│   ├── src/
│   │   ├── App.js             # React 主元件 (366 行, 所有狀態)
│   │   ├── index.js           # 進入點 (ErrorBoundary + i18n)
│   │   ├── components/        # 13 個自訂元件
│   │   │   ├── Header.jsx            # 頂部列 (收藏/紀錄/語言切換)
│   │   │   ├── SearchSection.jsx     # 搜尋區塊 (單一/批次標籤)
│   │   │   ├── SearchAutocomplete.jsx # 自動完成下拉選單
│   │   │   ├── ResultsTable.jsx      # 結果表格 (排序/篩選/匯出/SDS)
│   │   │   ├── DetailModal.jsx       # 詳細資訊 Modal
│   │   │   ├── LabelPrintModal.jsx   # 標籤列印設定
│   │   │   ├── FavoritesSidebar.jsx  # 收藏側邊欄
│   │   │   ├── HistorySidebar.jsx    # 搜尋紀錄側邊欄
│   │   │   ├── EmptyState.jsx        # 首頁快速開始
│   │   │   ├── Footer.jsx            # 頁尾 (版本/聲明)
│   │   │   ├── ErrorBoundary.jsx     # 錯誤邊界
│   │   │   ├── SkeletonTable.jsx     # 載入骨架屏
│   │   │   └── GHSImage.jsx          # GHS 圖示顯示
│   │   ├── hooks/             # 6 個自訂 Hooks
│   │   │   ├── useSearchHistory.js   # 搜尋紀錄 (localStorage, 上限 50)
│   │   │   ├── useFavorites.js       # 收藏功能
│   │   │   ├── useCustomGHS.js       # 自訂 GHS 分類
│   │   │   ├── useLabelSelection.js  # 標籤勾選狀態
│   │   │   ├── useResultSort.js      # 表格排序
│   │   │   └── use-toast.js          # Toast 通知
│   │   ├── utils/             # 4 個工具函式
│   │   │   ├── exportData.js         # Excel/CSV 匯出
│   │   │   ├── printLabels.js        # 標籤列印引擎 (4 版型)
│   │   │   ├── sdsLinks.js           # SDS 安全資料連結產生器
│   │   │   └── formatDate.js         # 日期格式化
│   │   ├── i18n/              # 國際化
│   │   │   ├── index.js              # i18next 初始化
│   │   │   └── locales/
│   │   │       ├── zh-TW.json        # 繁體中文 (187 keys)
│   │   │       └── en.json           # English (187 keys)
│   │   ├── constants/
│   │   │   └── ghs.js               # BACKEND_URL, API, GHS_IMAGES
│   │   └── components/ui/    # 46 個 shadcn/ui 元件
│   ├── craco.config.js        # CRACO 設定 (@ alias, ESLint)
│   ├── tailwind.config.js     # Tailwind CSS 設定
│   ├── package.json           # Node.js 依賴套件
│   ├── .npmrc                 # npm legacy-peer-deps
│   └── .env.example           # 前端環境變數範本
├── CLAUDE.md                  # Claude Code 專案上下文
├── zeabur.yaml                # Zeabur 部署設定 (前後端 2 服務)
└── README.md                  # 專案說明文件
```

---

## 安裝與執行

### 環境需求
- Python 3.9+
- Node.js 18+

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
yarn install

# 建立環境變數
cp .env.example .env
```

### 啟動服務

```bash
# 後端 (預設 port 8001)
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# 前端 (預設 port 3000)
cd frontend
yarn start
```

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

| 字典名稱 | 用途 | 數量 | 範例 |
|---------|------|------|------|
| `CAS_TO_ZH` | CAS → 中文 | 1,707 筆 | `"64-17-5": "乙醇"` |
| `CAS_TO_EN` | CAS → 英文 | 1,707 筆 | `"64-17-5": "Ethanol"` |
| `CHEMICAL_NAMES_ZH_EXPANDED` | 英文 → 中文 | 1,861 筆 | `"ethanol": "乙醇"` |

---

## 字典維護指南

字典的真實來源是 `backend/chemical_dict.py`（直接編輯 Python literal）。
該檔包含 6 個資料結構：

| 結構 | 用途 |
|------|------|
| `CAS_TO_ZH` / `CAS_TO_EN` | CAS → 正式中 / 英文名（主字典，1,707 筆） |
| `CHEMICAL_NAMES_ZH_EXPANDED` | 英文名（小寫）→ 中文，補 PubChem 同義詞查不到時使用 |
| `ALIASES_ZH` / `ALIASES_EN` | 俗名／別名 → CAS（例：`酒精 → 64-17-5`） |
| 自動建立的反向索引 | `EN_TO_CAS` / `ZH_TO_CAS` 在模組 import 時由上面幾個 dict 合併產生 |

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

| 圖示 | 代碼 | 中文名稱 | 說明 |
|:---:|------|---------|------|
| 💥 | GHS01 | 爆炸物 | 爆炸性物質 |
| 🔥 | GHS02 | 易燃物 | 易燃液體、氣體、固體 |
| ⭕ | GHS03 | 氧化劑 | 可能導致或加劇燃燒 |
| 🫧 | GHS04 | 壓縮氣體 | 高壓氣體容器 |
| 🧪 | GHS05 | 腐蝕性 | 對皮膚或金屬有腐蝕性 |
| 💀 | GHS06 | 劇毒 | 急性毒性（致命） |
| ⚠️ | GHS07 | 刺激性/有害 | 刺激性或有害物質 |
| 🫁 | GHS08 | 健康危害 | 致癌、致突變等長期健康危害 |
| 🐟 | GHS09 | 環境危害 | 對水生生物有毒 |

---

## API 文件

### 端點一覽

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/health` | GET | 健康檢查 |
| `/api/search/{cas_number}` | GET | 單一 CAS 號碼查詢 |
| `/api/search` | POST | 批次查詢（上限 100 筆） |
| `/api/export/xlsx` | POST | 匯出 Excel |
| `/api/export/csv` | POST | 匯出 CSV |
| `/api/ghs-pictograms` | GET | 取得所有 GHS 圖示資訊 |

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
# {"status": "healthy", "timestamp": "...", "version": "1.2.0"}
```

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

| CAS No. | 英文名稱 | 中文名稱 |
|---------|---------|---------|
| 64-17-5 | Ethanol | 乙醇 |
| 67-56-1 | Methanol | 甲醇 |
| 7732-18-5 | Water | 水 |
| 7647-01-0 | Hydrochloric acid | 鹽酸 |
| 7664-93-9 | Sulfuric acid | 硫酸 |
| 100-42-5 | Styrene | 苯乙烯 |
| 10025-87-3 | Phosphorus oxychloride | 三氯氧磷 |

---

## 版本更新紀錄

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
