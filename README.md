# GHS Label Quick Search

化學品危險標籤快速查詢系統 - 輸入 CAS 號碼即可查詢化學品的 GHS 危害標示和安全資訊。

## 功能特色

### 🔍 單一查詢
- 輸入單個 CAS 號碼（如 `64-17-5`）
- 即時顯示化學品名稱和 GHS 危害標示

### 📋 批次查詢
- 支援從 Excel 複製貼上多個 CAS 號碼
- 支援逗號、換行、Tab 分隔
- 一次查詢多筆資料並以表格顯示

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

### 🌐 中文化學品名稱字典
- 內建 **1,707 個** CAS 號碼對應的中文名稱
- 內建 **1,707 個** CAS 號碼對應的英文名稱
- 內建 **1,816 個** 英文名稱對應的中文翻譯
- 支援 PubChem 資料庫無法查詢的化學品名稱顯示

## 技術架構

- **前端**: React + Tailwind CSS
- **後端**: FastAPI (Python)
- **資料來源**: 
  - PubChem API (美國國家衛生研究院) - GHS 危害標示資料
  - 本地化學品字典 - 中英文名稱對照
- **資料庫**: MongoDB (用於其他功能擴展)

## 化學品名稱查詢邏輯

系統使用多層查詢策略，確保最高的名稱準確度：

```
查詢優先順序：
1. CAS 字典直接查詢 → 最準確（使用本地 CAS_TO_ZH / CAS_TO_EN 字典）
2. PubChem API 查詢 → 取得 GHS 危害資料及名稱
3. 英文名稱字典查詢 → 備用翻譯方式
```

### 字典檔案結構

字典資料位於 `/backend/chemical_dict.py`，包含：

| 字典名稱 | 用途 | 數量 |
|---------|------|------|
| `CAS_TO_ZH` | CAS 號碼 → 中文名稱 | 1,707 筆 |
| `CAS_TO_EN` | CAS 號碼 → 英文名稱 | 1,707 筆 |
| `CHEMICAL_NAMES_ZH_EXPANDED` | 英文名稱 → 中文名稱 | 1,816 筆 |

### 更新字典

如需擴充或修正字典，請準備 CSV 檔案，格式如下：

```csv
CAS No.,英文名稱,中文名稱
64-17-5,Ethanol,乙醇
67-56-1,Methanol,甲醇
```

然後使用以下 Python 腳本重新生成字典：

```python
import csv

cas_to_zh = {}
cas_to_en = {}
en_to_zh = {}

with open('字典.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        cas = row['CAS No.'].strip()
        en_name = row['英文名稱'].strip()
        zh_name = row['中文名稱'].strip()
        
        if cas and zh_name and cas not in cas_to_zh:
            cas_to_zh[cas] = zh_name
        if cas and en_name and cas not in cas_to_en:
            cas_to_en[cas] = en_name
        if en_name and zh_name:
            en_lower = en_name.lower()
            if en_lower not in en_to_zh:
                en_to_zh[en_lower] = zh_name

# 輸出到 chemical_dict.py
```

## GHS 危害圖示說明

| 圖示代碼 | 中文名稱 | 說明 |
|---------|---------|------|
| GHS01 | 爆炸物 | 爆炸性物質 |
| GHS02 | 易燃物 | 易燃液體、氣體、固體 |
| GHS03 | 氧化劑 | 可能導致或加劇燃燒 |
| GHS04 | 壓縮氣體 | 高壓氣體容器 |
| GHS05 | 腐蝕性 | 對皮膚或金屬有腐蝕性 |
| GHS06 | 劇毒 | 急性毒性（致命） |
| GHS07 | 刺激性/有害 | 刺激性或有害物質 |
| GHS08 | 健康危害 | 致癌、致突變等長期健康危害 |
| GHS09 | 環境危害 | 對水生生物有毒 |

## 使用範例

### 常見化學品 CAS 號碼
- `64-17-5` - 乙醇 (Ethanol)
- `67-56-1` - 甲醇 (Methanol)
- `7732-18-5` - 水 (Water)
- `7647-01-0` - 鹽酸 (Hydrochloric acid)
- `7664-93-9` - 硫酸 (Sulfuric acid)
- `100-42-5` - 苯乙烯 (Styrene)
- `10025-87-3` - 三氯氧磷 (Phosphorus oxychloride)

## API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/search/{cas_number}` | GET | 單一 CAS 號碼查詢 |
| `/api/search` | POST | 批次查詢（JSON body: `{"cas_numbers": [...]}`) |
| `/api/export/xlsx` | POST | 匯出 Excel |
| `/api/export/csv` | POST | 匯出 CSV |
| `/api/ghs-pictograms` | GET | 取得所有 GHS 圖示資訊 |

### API 回應範例

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

## 版本更新紀錄

### v1.1.0 (2025-01)
- ✨ 整合用戶提供的化學品字典（1,707 個 CAS 號碼）
- ✨ 新增 CAS → 英文名稱直接查詢功能
- 🐛 修正含括號的化學品名稱被截斷的問題
- 🐛 修正 PubChem 無資料時英文名稱顯示「名稱載入中...」的問題
- 📈 中文名稱覆蓋率從約 150 個提升至 1,707 個

### v1.0.0 (初始版本)
- 🎉 GHS 危害標示查詢功能
- 🎉 單一/批次查詢
- 🎉 Excel/CSV 匯出
- 🎉 搜尋紀錄功能

## 注意事項

⚠️ **免責聲明**: 本系統資料來自 PubChem (NIH) 及本地字典，僅供參考用途。實際使用化學品時，請以官方安全資料表 (SDS) 為準。

## 未來規劃

- [ ] 自訂標籤背景色或框線樣式
- [ ] 內嵌標籤預覽功能（不另開新視窗）
- [ ] 增加其他資料來源（如 ChemSpider）作為備援
- [ ] 支援更多化學品資料庫

## 授權

MIT License
