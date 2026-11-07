# 香港數學階梯（HK Math Stairs）

按香港課程編排、由幼稚園 K1 到中六（DSE 必修部分）的數學自學網站：每個年級都有分範疇的學習單位、教學內容、例題、常犯錯誤，以及基礎／進階／挑戰三份附詳解的測驗。

- 15 個年級、5 個學習階段、114 個學習單位、263 道測驗題
- 純靜態網站，無後端、無追蹤；進度只存在瀏覽器 `localStorage`
- 支援手機、深色模式、列印教學內容、全站課題搜尋
- 數學公式以 KaTeX 排版（CDN 載入；載入失敗時會自動降級為純文字）

## 課程依據

- 教育局《數學教育學習領域課程指引（小一至中六）》(2017 修訂)：數與代數、度量、圖形與空間、數據處理四個範疇
- 《幼稚園教育課程指引》(2017)：幼兒數學的數、圖形與空間、度量等學習重點
- 高中為數學必修部分，不包括 M1／M2

單元次序與深度為便於自學而編排，未必與個別學校的教學進度一致；本網站不取代教科書與課堂教學。

## 目錄結構

```
index.html            入口（雜湊路由：#/、#/map、#/grade/p5、#/grade/p5/quiz/basic…）
css/style.css         全站樣式（含深色模式與列印樣式）
js/app.js             路由、年級頁、測驗引擎、進度記錄、搜尋
js/curriculum.js      由 data/*.json 自動合併產生（請勿手改）
data/level-*.json     15 個年級的課程資料（唯一內容來源）
tools/validate.js     檢查資料結構與題目格式
tools/build-data.js   合併資料並輸出 js/curriculum.js
DATA_SPEC.md          資料欄位規格
```

## 本機使用

直接開啟 `index.html` 即可（資料已內嵌於 `js/curriculum.js`，無需伺服器）。
若要用真實網址測試，可執行：

```bash
python3 -m http.server 8080
# 開啟 http://localhost:8080
```

## 修改內容

1. 編輯 `data/level-<id>.json`（格式見 `DATA_SPEC.md`，可參考 `data/level-p1.json`）
2. 驗證：`node tools/validate.js data/level-p5.json`
3. 重新合併：`node tools/build-data.js`
4. 重新載入網頁

新增年級時，除了建立資料檔，還需要在 `tools/build-data.js` 的 `ORDER` 陣列加入 id；前端會自動依 `stageId` 分組。

## 資料格式要點

- 每個單元：`objectives`（3–4 條）、`teaching`（含 `text`／`formula`／`example`／`tip`）、`keywords`
- 每題：4 個選項、`answer` 為 0–3 索引、`explain` 為詳解、`unit` 指向所屬單元
- `tools/build-data.js` 會以固定種子打散選項次序，令正確答案平均分佈於 A–D，並把 `$...$` TeX 轉成 KaTeX 的 `\(...\)` 分隔符（避免與金額 `$` 衝突）

## 授權與聲明

課程框架源自香港教育局公開的課程指引；教學文字、例題與題目為本項目原創編寫，供學習與教學參考。題目不構成任何考試預測。
