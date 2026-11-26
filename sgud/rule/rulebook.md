# 規則帳本(rulebook)

> 藍圖:以規則為單位記程式碼須長成什麼樣.現況(做到哪)見 `sgud/state/state.md`.規則狀態:已做／部分／未做.
> 本帳本自 2026-11-26 建立,先收本輪確立之規則;既有行為之規則於後續輪次補入.

## 索引

| 編號 | 規則 | 狀態 |
|---|---|---|
| R-01 | 呼叫 wsemi 列舉函數(`fsTreeFolder` 等)須以設定物件明寫層數意圖,不用舊式數字或省略第 2 參數 | 已做 |

## R-01 wsemi 列舉函數須以設定物件明寫層數意圖

**規則**
1. wsemi 1.9.80 起,`fsTreeFolder`、`fsTreeFolderWithHash`、`fsGetFilesInFolder`、`fsGetFilesWithHashInFolder`、`fsGetFoldersInFolder`(及各 `*Core`)之第 2 參數為設定物件 `opt = {}`:`opt.levelLimit` 為有效正整數才限層,**未給即窮舉全部層級**(舊版第 2 參數為層數、預設 1 層);第 2 參數給了而非物件(舊寫法之數字)拋 `invalid opt: must be an object`,第 3 個引數有給拋 `invalid arguments: must be fd and opt only`.
2. 本套件呼叫這類函數時,第 2 參數一律為物件且**明寫層數意圖**:要第 1 層者寫 `{ levelLimit: 1 }`;本意窮舉者可省略第 2 參數,但須在呼叫處註明為刻意窮舉.不寫舊式數字,不依賴省略即第 1 層.
3. 序列檔皆平放於 `fdOhlc`、`fdParam` 下,讀檔路徑一律為 `${fd}/${key}.json`(`getTimeSeries`),故兩處列舉皆只需第 1 層,不得改為窮舉(子資料夾內之 `.json` 其 key 於該路徑找不到,`getTimeSeriesFull` 會因 `invalid key[...]` 整個 reject;`getKeysParam` 會多出子層之檔名).對外簽章、JSDoc 與預設不變.

**why**:省略第 2 參數之舊寫法於新版**靜默**由第 1 層變窮舉(無從以錯誤攔截),`fdOhlc`、`fdParam` 下若有子資料夾(備份夾、暫存夾),其內之 `.json` 會被當成序列而使 `getTimeSeriesFull` 失敗、`getKeysParam` 回傳不存在之 key.

**站點全集**(盤點指令:`git grep -nE "\b(fsTreeFolder|fsTreeFolderWithHash|fsGetFilesInFolder|fsGetFilesWithHashInFolder|fsGetFoldersInFolder)(Core)?\s*\(" -- . ':!dist' ':!docs'`)
- `src/WDataTdprovide.mjs:114` `getKeysParam` 之 `fsTreeFolder(fdParam, { levelLimit: 1 })`:已套(第 1 層)
- `src/WDataTdprovide.mjs:200` `getTimeSeriesFull` 內 `getVfpsJson` 之 `fsTreeFolder(fd, { levelLimit: 1 })`(`fdOhlc`、`fdParam` 共用此一站):已套(第 1 層)
- 共 2 站;根目錄範例 `g.mjs`、README、JSDoc 無此類呼叫

**判準**:盤點指令之每一處第 2 參數皆為物件;`test/unit-WDataTdprovideLevel.test.mjs` 全綠;**各站點分別**植入「改回舊式數字／省略／`levelLimit: 2`／`null`／`0`／空物件」皆須使對應之案轉紅(變異證據見 `sgud/exp/experience.md`).

**測試對照**:`test/unit-WDataTdprovideLevel.test.mjs`——`fdOhlc`、`fdParam` 下除第 1 層之 `btc.json`、`btc_ma.json` 外,另放 `sub/`、`sub/deeper/` 內之合法 `.json`(`nestedO`、`deepO`、`nestedP`、`deepP`):①`getKeysParam` 含 `btc_ma`、不含 `nestedP`／`deepP`／`deeper`(守 114 站);②`getTimeSeriesFull` 全等於第 1 層之兩序列(守 200 站;窮舉時於 `invalid key[...]` reject).既有 `test/unit-WDataTdprovide.test.mjs` 之夾具皆平放,分不出第 1 層與窮舉.
