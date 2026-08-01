import fs from 'fs'
import path from 'path'
import WDataTdprovide from './src/WDataTdprovide.mjs'


async function test() {

    //建立示範資料夾, fdOhlc 放 K 線序列, fdParam 放指標參數序列, 各以 `${key}.json` 儲存
    let fdOhlc = './test/tmp/data-ohlc'
    let fdParam = './test/tmp/data-param'
    fs.mkdirSync(fdOhlc, { recursive: true })
    fs.mkdirSync(fdParam, { recursive: true })

    //ohlc 'btc', 8 根 4hr K 線
    let arrOhlc = [
        { time: '2020-01-01T00:00:00', Open: 7160.11, Close: 7173.32 },
        { time: '2020-01-01T04:00:00', Open: 7173.32, Close: 7195.23 },
        { time: '2020-01-01T08:00:00', Open: 7195.23, Close: 7225.01 },
        { time: '2020-01-01T12:00:00', Open: 7225.01, Close: 7209.83 },
        { time: '2020-01-01T16:00:00', Open: 7209.83, Close: 7188.77 },
        { time: '2020-01-01T20:00:00', Open: 7188.77, Close: 7200.85 },
        { time: '2020-01-02T00:00:00', Open: 7200.85, Close: 7156.44 },
        { time: '2020-01-02T04:00:00', Open: 7156.44, Close: 7130.02 },
    ]
    fs.writeFileSync(path.resolve(fdOhlc, 'btc.json'), JSON.stringify(arrOhlc), 'utf8')

    //param 'btc_ma', 1day 均線, 起始時間晚於 ohlc(均線需累積足量 K 線)
    let arrParam = [
        { time: '2020-01-01T20:00:00', param: 7198.835 },
        { time: '2020-01-02T00:00:00', param: 7196.021666666667 },
        { time: '2020-01-02T04:00:00', param: 7185.153333333333 },
    ]
    fs.writeFileSync(path.resolve(fdParam, 'btc_ma.json'), JSON.stringify(arrParam), 'utf8')

    //wdt, 建立資料提供器
    let wdt = WDataTdprovide(fdOhlc, fdParam)

    //getKeysParam, 列舉 fdParam 內全部 keys
    let keysParam = wdt.getKeysParam()
    console.log('getKeysParam:', keysParam)
    // => getKeysParam: [ 'btc_ma' ]

    //getTimeSeries, 依 key 讀取完整序列(先找 fdParam 再找 fdOhlc, 讀取後快取)
    let arrBtc = await wdt.getTimeSeries('btc')
    console.log('getTimeSeries:', arrBtc.length, '筆, 首筆', arrBtc[0])
    // => getTimeSeries: 8 筆, 首筆 { time: '2020-01-01T00:00:00', Open: 7160.11, Close: 7173.32 }

    //getTimeSeriesByTimeRange, 依 time 過濾(含頭含尾)
    let arrBtcRange = await wdt.getTimeSeriesByTimeRange('btc', '2020-01-01T04:00:00', '2020-01-01T12:00:00')
    console.log('getTimeSeriesByTimeRange:', arrBtcRange.map((v) => v.time))
    // => getTimeSeriesByTimeRange: [ '2020-01-01T04:00:00', '2020-01-01T08:00:00', '2020-01-01T12:00:00' ]

    //getTimeSeriesFull, 回傳兩資料夾全部序列
    let vs = await wdt.getTimeSeriesFull()
    console.log('getTimeSeriesFull:', vs.map((v) => `${v.type}:${v.key}(${v.arr.length}筆)`))
    // => getTimeSeriesFull: [ 'ohlc:btc(8筆)', 'param:btc_ma(3筆)' ]

    //getTimeSeriesFullByTimeRange, 依時間範圍過濾全部序列
    //  timeStart 不可早於資料起始時間(由各 ohlc 序列首筆判斷), timeEnd 不可晚於資料結束時間(由全部序列末筆判斷), 否則 throw
    let vst = await wdt.getTimeSeriesFullByTimeRange('2020-01-01T20:00:00', '2020-01-02T04:00:00')
    console.log('getTimeSeriesFullByTimeRange:', vst.map((v) => `${v.key}(${v.arr.length}筆)`))
    // => getTimeSeriesFullByTimeRange: [ 'btc(3筆)', 'btc_ma(3筆)' ]

    //buildGetTimeSeriesByTimeRange, 建立指定時間範圍之序列查詢函數
    let funSeries = await wdt.buildGetTimeSeriesByTimeRange('2020-01-01T20:00:00', '2020-01-02T04:00:00')
    let arrMa = await funSeries('btc_ma')
    console.log('funSeries:', arrMa)
    // => funSeries: [
    //   { time: '2020-01-01T20:00:00', param: 7198.835 },
    //   { time: '2020-01-02T00:00:00', param: 7196.021666666667 },
    //   { time: '2020-01-02T04:00:00', param: 7185.153333333333 }
    // ]

    //buildGetTimeValueByTimeRange, 建立指定時間範圍之單點查詢函數
    let funValue = await wdt.buildGetTimeValueByTimeRange('2020-01-01T20:00:00', '2020-01-02T04:00:00')
    let d = await funValue('btc', '2020-01-02T00:00:00')
    console.log('funValue:', d)
    // => funValue: { time: '2020-01-02T00:00:00', Open: 7200.85, Close: 7156.44 }

}
test()
    .catch((err) => {
        console.log('catch', err)
    })


//node g.mjs
