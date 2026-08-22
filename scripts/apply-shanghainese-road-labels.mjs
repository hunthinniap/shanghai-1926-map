import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const romanizationSourceId = 'rime-wugniu-lopha'

// Old-pronunciation Wugniu spellings, without tone numbers. Multi-reading
// characters are resolved for their place-name context rather than by Mandarin.
export const shanghaineseRoadNames = new Map([
  ['白利南支路', 'Baoq Lij Neu Tzy Lu'],
  ['宝成弄', 'Po Zen Lon'],
  ['北梅园路', 'Poq Me Yeu Lu'],
  ['倍福路', 'Be Foq Lu'],
  ['川公路', 'Tseu Kon Lu'],
  ['大场路', 'Da Dzan Lu'],
  ['大通里', 'Da Thon Lij'],
  ['定興路', 'Din Xin Lu'],
  ['东棋盘街', 'Ton Djij Beu Ka'],
  ['福康路', 'Foq Khaon Lu'],
  ['和平街', 'Wu Bin Ka'],
  ['和平路', 'Wu Bin Lu'],
  ['胡家木桥路', 'Wu Ka Moq Djio Lu'],
  ['黄家沙花园', 'Waon Ka Sau Hau Yeu'],
  ['金隆街', 'Cin Lon Ka'],
  ['老唐家弄', 'Lo Daon Ka Lon'],
  ['龙泉园', 'Lon Dzi Yeu'],
  ['马玉山路', 'Mau Gnioq Sae Lu'],
  ['南林路', 'Neu Lin Lu'],
  ['南梅园路', 'Neu Me Yeu Lu'],
  ['派克衖', 'Pha Kheq Lon'],
  ['平望街', 'Bin Maon Ka'],
  ['浦行新村', 'Phu Raon Sin Tsen'],
  ['虬江支路', 'Djioe Kaon Tzy Lu'],
  ['三泰街', 'Sae Tha Ka'],
  ['昇平街', 'Sen Bin Ka'],
  ['崧厦街', 'Son Rau Ka'],
  ['拓皋路', 'Thoq Ko Lu'],
  ['天保路', 'Thi Po Lu'],
  ['同福里', 'Don Foq Lij'],
  ['西棋盘街', 'Sij Djij Beu Ka'],
  ['西上麟', 'Sij Zaon Lin'],
  ['香粉巷', 'Xian Fen Raon'],
  ['香粉衖', 'Xian Fen Lon'],
  ['小浜弯巷', 'Sio Pan Uae Raon'],
  ['小浜弯衖', 'Sio Pan Uae Lon'],
  ['协和路', 'Yaq Wu Lu'],
  ['锌符路', 'Sin Vu Lu'],
  ['新莱场路', 'Sin Le Dzan Lu'],
  ['新唐家弄', 'Sin Daon Ka Lon'],
  ['新新街', 'Sin Sin Ka'],
  ['徐家宅路', 'Zij Ka Dzaoq Lu'],
  ['源昌里', 'Gnieu Tsaon Lij'],
  ['長耕里', 'Dzan Ken Lij'],
  ['致远街', 'Tzy Yeu Ka'],
])

const damagedSourceNames = new Set(['XX昌路', 'XX浦巷', 'XX浦衖'])
const hasHan = (value) => /[\u3400-\u9fff]/u.test(value)

export function applyShanghaineseRoadLabels(collection) {
  let converted = 0
  let hidden = 0

  collection.features.forEach((feature) => {
    const properties = feature.properties ?? {}
    if (properties.kind !== 'road' || !hasHan(properties.historicalName ?? '')) return

    const originalName = properties.historicalName
    const romanizedName = shanghaineseRoadNames.get(originalName)
    if (!romanizedName) {
      if (!damagedSourceNames.has(originalName)) {
        throw new Error(`No Shanghainese road-name spelling for ${originalName}`)
      }
      properties.labelOnMap = false
      hidden += 1
      return
    }

    properties.historicalName = romanizedName
    properties.historicalChinese ||= originalName
    properties.aliases = [...new Set([...(properties.aliases ?? []), originalName])]
    properties.language = 'wuu'
    properties.sourceIds = [...new Set([...(properties.sourceIds ?? []), romanizationSourceId])]
    converted += 1
  })

  return { converted, hidden }
}

const collection = JSON.parse(await fs.readFile(dataPath, 'utf8'))
const result = applyShanghaineseRoadLabels(collection)
await fs.writeFile(dataPath, `${JSON.stringify(collection)}\n`, 'utf8')
console.log(
  `Applied old-style Shanghainese romanization to ${result.converted} road features; ` +
    `${result.hidden} damaged source-name features remain searchable but are hidden from map labels.`,
)
