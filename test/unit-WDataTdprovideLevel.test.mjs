import assert from 'assert'
import fs from 'fs'
import path from 'path'
import WDataTdprovide from '../src/WDataTdprovide.mjs'


//規格對應(R-01, 列舉層數): 資料夾內之 `${key}.json` 皆平放於 fdOhlc、fdParam 下(讀檔路徑為 `${fd}/${key}.json`), 兩處列舉皆只列第1層, 子資料夾內之檔不是序列
//  S1. getKeysParam(src/WDataTdprovide.mjs, fdParam之列舉): 不回傳子資料夾(含更深層)內之檔之主檔名
//  S2. getTimeSeriesFull(getVfpsJson, fdOhlc與fdParam之列舉): 只讀第1層之json, 子資料夾內之json不列入(窮舉時其key於 `${fd}/${key}.json` 找不到而拋 invalid key)
//  wsemi 1.9.80起fsTreeFolder未給levelLimit即窮舉全部層級, 須明寫{ levelLimit: 1 }

//fixtures: 於 ./test/_tmp/WDataTdprovideLevel 內建立測試資料夾, 結束後清除
let fdRoot = path.resolve('./test/_tmp/WDataTdprovideLevel')
let fdOhlc = path.resolve(fdRoot, 'data-ohlc')
let fdParam = path.resolve(fdRoot, 'data-param')

//第1層之序列(各值逐筆相異)
let arrOhlcBtc = [
    { time: '2020-01-01T00:00:00', Open: 7160.11, Close: 7173.32 },
    { time: '2020-01-01T04:00:00', Open: 7173.32, Close: 7195.23 },
    { time: '2020-01-01T08:00:00', Open: 7195.23, Close: 7225.01 },
]
let arrParamBtcMa = [
    { time: '2020-01-01T04:00:00', param: 7198.835 },
    { time: '2020-01-01T08:00:00', param: 7196.021 },
]

//子層之序列(合法陣列, 故若被列入, 失敗原因在於讀檔路徑而非內容)
let arrNestedO = [{ time: '2020-01-01T00:00:00', Open: 1.5, Close: 2.5 }]
let arrDeepO = [{ time: '2020-01-01T00:00:00', Open: 3.5, Close: 4.5 }]
let arrNestedP = [{ time: '2020-01-01T00:00:00', param: 5.5 }]
let arrDeepP = [{ time: '2020-01-01T00:00:00', param: 6.5 }]

let write = (fp, v) => {
    fs.mkdirSync(path.dirname(fp), { recursive: true })
    fs.writeFileSync(fp, JSON.stringify(v), 'utf8')
}

let buildFixtures = () => {
    fs.rmSync(fdRoot, { recursive: true, force: true })

    //第1層
    write(path.resolve(fdOhlc, 'btc.json'), arrOhlcBtc)
    write(path.resolve(fdParam, 'btc_ma.json'), arrParamBtcMa)

    //子層(sub)與更深層(sub/deeper)
    write(path.resolve(fdOhlc, 'sub', 'nestedO.json'), arrNestedO)
    write(path.resolve(fdOhlc, 'sub', 'deeper', 'deepO.json'), arrDeepO)
    write(path.resolve(fdParam, 'sub', 'nestedP.json'), arrNestedP)
    write(path.resolve(fdParam, 'sub', 'deeper', 'deepP.json'), arrDeepP)
}

let clearFixtures = () => {
    fs.rmSync(fdRoot, { recursive: true, force: true })
    try {
        fs.rmdirSync(path.resolve('./test/_tmp')) //僅於已無其他測試之中介資料夾時刪除
    }
    catch (err) {}
}


describe('WDataTdprovide (listing level)', function() {

    before(function() {
        buildFixtures()
    })

    after(function() {
        clearFixtures()
    })

    it('getKeysParam 只列 fdParam 第1層: 回傳第1層之主檔名, 不含子資料夾內之檔', function() {
        let wdt = WDataTdprovide(fdOhlc, fdParam)
        let keys = wdt.getKeysParam()

        //S1
        assert.ok(keys.includes('btc_ma'), 'level 1 file btc_ma must be listed')
        assert.ok(!keys.includes('nestedP'), 'nested file nestedP must not be listed')
        assert.ok(!keys.includes('deepP'), 'deeper nested file deepP must not be listed')
        assert.ok(!keys.includes('deeper'), 'deeper folder must not be listed')
    })

    it('getTimeSeriesFull 只讀兩資料夾第1層之 json: 子資料夾內之 json 不列入, 且不因其而拋錯', async function() {
        let wdt = WDataTdprovide(fdOhlc, fdParam)
        let vs = await wdt.getTimeSeriesFull()

        //S2
        assert.deepStrictEqual(vs, [
            { type: 'ohlc', key: 'btc', arr: arrOhlcBtc },
            { type: 'param', key: 'btc_ma', arr: arrParamBtcMa },
        ])
    })

})
