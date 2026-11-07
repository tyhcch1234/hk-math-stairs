# 課程資料規格（DATA SPEC）

所有年級資料為**純 JSON**，存放於 `data/level-<id>.json`，檔名必須與 `id` 一致。
請以 `data/level-p1.json` 作為唯一格式範本，結構必須完全一致。

## 頂層欄位

| 欄位 | 類型 | 說明 |
|---|---|---|
| `id` | string | `k1` `k2` `k3` `p1`…`p6` `s1`…`s6` |
| `name` | string | 顯示名稱，例如 `小一`、`中四` |
| `stage` | string | `幼稚園` / `初小` / `高小` / `初中` / `高中` |
| `stageId` | string | `kg` / `ks1` / `ks2` / `ks3` / `ks4` |
| `age` | string | 例如 `6–7 歲` |
| `weeklyLessons` | number | 每週課節（幼稚園填 0） |
| `intro` | string | 40–80 字，說明該年級學習重點與銜接 |
| `strands` | string[] | 該年級涵蓋的範疇 |
| `units` | object[] | 5–8 個學習單位 |
| `quiz` | object | `basic` / `advanced` / `challenge` 三個陣列 |

## unit 物件

```json
{
  "id": "p1-u1",
  "title": "20 以內的數",
  "en": "Numbers to 20",
  "strand": "數與代數",
  "objectives": ["…", "…", "…"],
  "teaching": [ {"type": "text", "html": "…"} ],
  "keywords": ["基數", "序數"]
}
```

- `objectives`：3–4 條，用「能……」句式，可觀察、可評估。
- `teaching`：4–7 個區塊，`type` 只可用：
  - `text`：概念講解，1–3 句，要具體（講原理、講步驟，不要空話）。
  - `formula`：核心公式／定義／規則，可用 `$...$` 寫 TeX。
  - `example`：必須有 `title`（例如 `例題：13 與 17 比大小`）＋ `html` 解題步驟，答案要寫出來。
  - `tip`：常犯錯誤或解題提示，語氣直接（「常犯錯誤：……」）。
- 每個 unit 至少要有 1 個 `formula`、1 個 `example`、1 個 `tip`。
- `keywords`：2–4 個關鍵詞。

## quiz 題目物件

```json
{
  "q": "16 是由 1 個十和多少個一組成？",
  "options": ["6", "5", "16", "60"],
  "answer": 0,
  "explain": "16 = 10 + 6，所以是 1 個十和 6 個一。",
  "unit": "p1-u1"
}
```

- 每題**必須剛好 4 個選項**，`answer` 為 0–3 的索引，且必須正確。
- `explain` 要說明「為甚麼」，不是只重複答案；2–4 句，可含步驟。
- `unit` 必須是該年級 `units` 內存在的 id。
- 題量：`basic` 8 題、`advanced` 6 題、`challenge` 4 題（幼稚園可 6/5/3）。
- 難度定義：
  - `basic` 基礎：單一概念、直接運算，全卷覆蓋大部分 unit。
  - `advanced` 進階：兩步以上、應用題、需要選擇策略。
  - `challenge` 挑戰：非常規題、多步推理、常見公開試／奧數式陷阱。
- 選項要似是而非（放入常見錯誤結果），不要出現「以上皆是」。

## 文字與編碼規則

- 語言：**繁體中文（香港）**，數學術語可加英文，例如「百分數 (percentage)」。
- HTML 只可用：`<b> <i> <sup> <sub> <br> <span class="frac"> <span class="num"> <span class="den"> <ul> <li> <table> <tr> <td> <th>`。
- 比較符號必須寫 `&lt;` `&gt;`；`&` 寫 `&amp;`。
- 字串內不可有真正的換行；需要換行用 `<br>`。
- 分數用：`<span class="frac"><span class="num">3</span><span class="den">4</span></span>`。
- 乘號用 `×`、除號用 `÷`、負號用 `−`（U+2212）、圓周率用 `π`。
- 不要使用 emoji。
- 內容必須符合香港課程（教育局《數學教育學習領域課程指引（小一至中六）》2017 修訂）該年級的範圍，**不可超前**（例如小一不可出現小數四則運算）。

## 驗證

寫完後必須執行：

```
node tools/validate.js data/level-<id>.json
```

必須見到 `OK`，否則修正後再跑。不要修改 validator 或前端檔案。
