import assert from 'assert'
import fs from 'fs'
import path from 'path'
import WDataTdprovide from '../src/WDataTdprovide.mjs'


//規格來源: src/WDataTdprovide.mjs
//  WDataTdprovide(fdOhlc, fdParam) 為資料提供器工廠, 讀取兩資料夾內之 `${key}.json` 時間序列(各為 [{time,...}] 陣列)
//  getKeysParam: 列舉 fdParam 內檔案之主檔名為 keys
//  getTimeSeries(key): 依 key 讀取序列, 先找 fdParam 再找 fdOhlc, 皆無則 throw `invalid key[${key}]`; 讀到非有效陣列則 throw `fp[${fp}] no data`; 首次讀取後快取
//  getTimeSeriesByTimeRange(key, timeStart, timeEnd): 依 time 欄位過濾(含頭含尾)
//  getTimeSeriesFull: 列舉兩資料夾全部 json, 回傳 [{type:'ohlc'|'param', key, arr}], ohlc 在前
//  getTimeSeriesFullByTimeRange(timeStart, timeEnd): timeStart/timeEnd 須為秒時間字串否則 throw;
//    資料可用起始時間 ts 取各 ohlc 序列首筆 time 之最大值(僅 ohlc 能判斷起始), 結束時間 te 取全部序列末筆 time 之最小值;
//    timeStart < ts 或 timeEnd > te 時 throw; 通過則回傳各序列過濾後之 [{key, arr}]
//  buildGetTimeSeriesByTimeRange(timeStart, timeEnd): 回傳 async fun(key), 查無資料時 throw
//  buildGetTimeValueByTimeRange(timeStart, timeEnd): 回傳 async fun(key, time), 查無資料時 throw


//fixtures: 於 ./test/tmp-unit-WDataTdprovide 內建立測試資料夾, 結束後清除
let fdRoot = path.resolve('./test/tmp-unit-WDataTdprovide')
let fdOhlc = path.resolve(fdRoot, 'data-ohlc')
let fdParam = path.resolve(fdRoot, 'data-param')

//ohlc 'btc': 8 根 4hr K 線
let arrOhlcBtc = [
    { time: '2020-01-01T00:00:00', Open: 7160.11, Close: 7173.32 },
    { time: '2020-01-01T04:00:00', Open: 7173.32, Close: 7195.23 },
    { time: '2020-01-01T08:00:00', Open: 7195.23, Close: 7225.01 },
    { time: '2020-01-01T12:00:00', Open: 7225.01, Close: 7209.83 },
    { time: '2020-01-01T16:00:00', Open: 7209.83, Close: 7188.77 },
    { time: '2020-01-01T20:00:00', Open: 7188.77, Close: 7200.85 },
    { time: '2020-01-02T00:00:00', Open: 7200.85, Close: 7156.44 },
    { time: '2020-01-02T04:00:00', Open: 7156.44, Close: 7130.02 },
]

//param 'btc_ma': 起始時間晚於 ohlc(模擬 ma 類延後), 末筆時間與 ohlc 相同
let arrParamBtcMa = [
    { time: '2020-01-01T20:00:00', param: 7198.835 },
    { time: '2020-01-02T00:00:00', param: 7196.021666666667 },
    { time: '2020-01-02T04:00:00', param: 7185.153333333333 },
]

let buildFixtures = () => {
    fs.mkdirSync(fdOhlc, { recursive: true })
    fs.mkdirSync(fdParam, { recursive: true })
    fs.writeFileSync(path.resolve(fdOhlc, 'btc.json'), JSON.stringify(arrOhlcBtc), 'utf8')
    fs.writeFileSync(path.resolve(fdParam, 'btc_ma.json'), JSON.stringify(arrParamBtcMa), 'utf8')
}

let clearFixtures = () => {
    fs.rmSync(fdRoot, { recursive: true, force: true })
}


describe('WDataTdprovide', function() {

    before(function() {
        buildFixtures()
    })

    after(function() {
        clearFixtures()
    })

    describe('getKeysParam', function() {

        it('回傳 fdParam 內各 json 檔之主檔名', function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            let keys = wdt.getKeysParam()
            assert.deepStrictEqual(keys, ['btc_ma'])
        })

    })

    describe('getTimeSeries', function() {

        it('依 key 讀取 ohlc 序列', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            let arr = await wdt.getTimeSeries('btc')
            assert.deepStrictEqual(arr, arrOhlcBtc)
        })

        it('依 key 讀取 param 序列', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            let arr = await wdt.getTimeSeries('btc_ma')
            assert.deepStrictEqual(arr, arrParamBtcMa)
        })

        it('同 key 重複讀取回傳快取(同一參照, 不重讀檔案)', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            let a1 = await wdt.getTimeSeries('btc')
            let a2 = await wdt.getTimeSeries('btc')
            assert.strictEqual(a1, a2)
        })

        it('key 不存在時 throw invalid key', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            await assert.rejects(wdt.getTimeSeries('nope'), { message: `invalid key[nope]` })
        })

        it('檔案存在但非有效陣列時 throw no data', async function() {
            let fpEmpty = path.resolve(fdParam, 'empty.json')
            fs.writeFileSync(fpEmpty, JSON.stringify([]), 'utf8')
            try {
                let wdt = WDataTdprovide(fdOhlc, fdParam)
                await assert.rejects(wdt.getTimeSeries('empty'), { message: `fp[${fpEmpty}] no data` })
            }
            finally {
                fs.rmSync(fpEmpty, { force: true })
            }
        })

    })

    describe('getTimeSeriesByTimeRange', function() {

        it('依 time 過濾且含頭含尾', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            let arr = await wdt.getTimeSeriesByTimeRange('btc', '2020-01-01T04:00:00', '2020-01-01T12:00:00')
            assert.deepStrictEqual(arr, arrOhlcBtc.slice(1, 4))
        })

        it('範圍外回傳空陣列', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            let arr = await wdt.getTimeSeriesByTimeRange('btc', '2021-01-01T00:00:00', '2021-01-02T00:00:00')
            assert.deepStrictEqual(arr, [])
        })

    })

    describe('getTimeSeriesFull', function() {

        it('回傳兩資料夾全部序列, ohlc 在前 param 在後, 各附 type 與 key', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            let vs = await wdt.getTimeSeriesFull()
            assert.deepStrictEqual(vs, [
                { type: 'ohlc', key: 'btc', arr: arrOhlcBtc },
                { type: 'param', key: 'btc_ma', arr: arrParamBtcMa },
            ])
        })

    })

    describe('getTimeSeriesFullByTimeRange', function() {

        it('回傳各序列過濾後之 [{key, arr}]', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            let vst = await wdt.getTimeSeriesFullByTimeRange('2020-01-01T20:00:00', '2020-01-02T04:00:00')
            assert.deepStrictEqual(vst, [
                { key: 'btc', arr: arrOhlcBtc.slice(5) },
                { key: 'btc_ma', arr: arrParamBtcMa },
            ])
        })

        it('timeStart 可早於 param 起始(起始界線僅由 ohlc 判斷)', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            let vst = await wdt.getTimeSeriesFullByTimeRange('2020-01-01T00:00:00', '2020-01-02T04:00:00')
            assert.deepStrictEqual(vst, [
                { key: 'btc', arr: arrOhlcBtc },
                { key: 'btc_ma', arr: arrParamBtcMa },
            ])
        })

        it('timeStart 早於資料起始時間時 throw', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            await assert.rejects(
                wdt.getTimeSeriesFullByTimeRange('2019-12-31T00:00:00', '2020-01-02T04:00:00'),
                { message: `timeStart[2019-12-31T00:00:00] < timeStartData[2020-01-01T00:00:00]` },
            )
        })

        it('timeEnd 晚於資料結束時間時 throw', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            await assert.rejects(
                wdt.getTimeSeriesFullByTimeRange('2020-01-01T00:00:00', '2020-01-03T00:00:00'),
                { message: `timeEnd[2020-01-03T00:00:00] > timeEndData[2020-01-02T04:00:00]` },
            )
        })

        it('timeStart 非秒時間字串時 throw', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            await assert.rejects(
                wdt.getTimeSeriesFullByTimeRange('2020-01-01', '2020-01-02T04:00:00'),
                { message: `invalid timeStart` },
            )
        })

        it('timeEnd 非秒時間字串時 throw', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            await assert.rejects(
                wdt.getTimeSeriesFullByTimeRange('2020-01-01T00:00:00', ''),
                { message: `invalid timeEnd` },
            )
        })

    })

    describe('buildGetTimeSeriesByTimeRange', function() {

        it('回傳之 fun(key) 給出過濾後序列', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            let fun = await wdt.buildGetTimeSeriesByTimeRange('2020-01-01T20:00:00', '2020-01-02T04:00:00')
            let arr = await fun('btc')
            assert.deepStrictEqual(arr, arrOhlcBtc.slice(5))
        })

        it('fun(key) 查無資料時 throw', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            let fun = await wdt.buildGetTimeSeriesByTimeRange('2020-01-01T20:00:00', '2020-01-02T04:00:00')
            await assert.rejects(fun('nope'), { message: `can not get series by key[nope] bewteen timeStart[2020-01-01T20:00:00] and timeEnd[2020-01-02T04:00:00]` })
        })

    })

    describe('buildGetTimeValueByTimeRange', function() {

        it('回傳之 fun(key, time) 給出該時間點資料', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            let fun = await wdt.buildGetTimeValueByTimeRange('2020-01-01T20:00:00', '2020-01-02T04:00:00')
            let d = await fun('btc_ma', '2020-01-02T00:00:00')
            assert.deepStrictEqual(d, arrParamBtcMa[1])
        })

        it('fun(key, time) 查無資料時 throw', async function() {
            let wdt = WDataTdprovide(fdOhlc, fdParam)
            let fun = await wdt.buildGetTimeValueByTimeRange('2020-01-01T20:00:00', '2020-01-02T04:00:00')
            await assert.rejects(fun('btc_ma', '2020-01-01T00:00:00'), { message: `can not get value by key[btc_ma] and time[2020-01-01T00:00:00] bewteen timeStart[2020-01-01T20:00:00] and timeEnd[2020-01-02T04:00:00]` })
        })

    })

})
