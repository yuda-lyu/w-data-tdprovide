# 經驗(experience)

> 執行時之累積經驗,留給後續嘗試、執行、判斷.最新在前.

## 2026-11-26 wsemi 1.9.80 列舉函數第 2 參數改為 opt(R-01)

- **既有測試分不出第 1 層與窮舉**:`test/unit-WDataTdprovide.test.mjs` 之夾具皆平放,改成窮舉照綠.另立 `unit-WDataTdprovideLevel`,於 `fdOhlc`、`fdParam` 下放 `sub/`、`sub/deeper/` 內之合法 `.json`(各檔名互異)。
- **兩站點各由一案守住**:`getKeysParam`(114 站)看回傳之 key 清單;`getTimeSeriesFull`(200 站,`getVfpsJson` 為 `fdOhlc`、`fdParam` 共用)於窮舉時,子層 `.json` 之 key 於 `${fd}/${key}.json` 找不到而 `invalid key[...]` reject,故以回傳全等於第 1 層之兩序列斷言。兩站各自變異時只使對應之一案轉紅(passing 1／failing 1),證明站點級鑑別力。
- **修前紅形狀**:升 wsemi 1.9.80 後尚未改 src 時,省略第 2 參數為窮舉:第一案紅於「nested file nestedP must not be listed」,第二案紅於 `Error: invalid key[deepO]`。
- **變異驗證**(鏡像根 `tmp/<案名>/mirror/{src,test}`,只複製檔案,裸名匯入向上解析至 repo 根 `node_modules`;腳本於鏡像注入後以 `quiet-run --lock --cwd <鏡像根>` 跑 mocha):兩站各自:對照(原碼)綠;改回舊式數字、省略、`{ levelLimit: 2 }`、`{ levelLimit: null }`、`{}`、`{ levelLimit: 0 }` 共 6 項皆轉紅。
- **字元級差異核對**:於 `getVfpsJson` 內新增一行註解後,`git diff --word-diff` 會把 `let vfps` 前之縮排列為 `{+ +}`,是新增註解行造成之對齊,非吃掉空白;確認 `let vfps` 之縮排仍為 12 格。
