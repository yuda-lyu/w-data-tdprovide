# 狀態(state)

> 現況:當前已開發功能之最新狀態.只記現況,不寫過程(過程見 `sgud/exp/experience.md`).藍圖見 `sgud/rule/rulebook.md`.
> 更新:2026-11-26.本檔自本日建立,僅收本輪涉及之功能;既有功能於後續輪次補入.

## 基本資料
- 入口:`src/WDataTdprovide.mjs`(`WDataTdprovide(fdOhlc, fdParam)`,資料提供器工廠);發布檔 `dist/`、文件 `docs/` 於發布時自動產製,不手改.
- `package.json` 版本 1.0.58(本輪未改);依賴 `wsemi ^1.9.80`(已裝 1.9.80).
- 測試:`npm test`(mocha,`test/*.test.mjs`);`unit-WDataTdprovide`(19)、`unit-WDataTdprovideLevel`(2),共 21 案;最近一次全綠見下〈驗證〉.

## 功能現況
| 功能 | 狀態 | 規則帳本 | 測試 |
|---|---|---|---|
| `getKeysParam`、`getTimeSeriesFull` 之資料夾列舉僅第 1 層:wsemi 1.9.80 起第 2 參數為設定物件,改為 `fsTreeFolder(..., { levelLimit: 1 })`,子資料夾內之檔不列入(2026-11-26) | 已做 | R-01 | `unit-WDataTdprovideLevel`、`unit-WDataTdprovide` |
| 其餘功能(`getTimeSeries`、`getTimeSeriesByTimeRange`、`getTimeSeriesFullByTimeRange`、`buildGetTimeSeriesByTimeRange`、`buildGetTimeValueByTimeRange`) | 既有,運作 | (尚未入帳本) | `unit-WDataTdprovide` |

## 驗證
- 2026-11-26(wsemi 1.9.80):全套 21 passing／0 failing(含 `unit-WDataTdprovideLevel` 2 案,連跑 5 次皆綠);兩站點各植入 6 項變異(舊式數字、省略、`levelLimit: 2`／`null`／`0`、空物件),皆使對應之案轉紅(各僅一案),對照(原碼)綠;eslint 0 problems;private-guard CLEAN.

## 已知缺口
- 規則帳本僅收 R-01,既有行為之規則尚未補入.
- `getKeysParam` 於第 1 層會把 `fdParam` 下之子資料夾名也當成 key 回傳(列舉結果含資料夾項目,未過濾);為既有行為,本輪未動(範圍外).
