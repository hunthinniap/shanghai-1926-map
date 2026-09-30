import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const filename = path.join(root, 'public/data/historical-features.geojson')
const collection = JSON.parse(fs.readFileSync(filename, 'utf8'))
const matches = collection.features.filter((feature) => feature.properties?.id === 'landmark-vs-site-545')
if (matches.length !== 1) throw new Error(`Expected exactly one VS #545 feature, found ${matches.length}`)
const feature = matches[0]
if (feature.properties.historicalAddresses?.[0]?.address !== '34 EDWARD VII ROAD') {
  throw new Error('VS #545 historical address changed; recheck the correction')
}
if (feature.geometry.coordinates[0] < 121.48 || feature.geometry.coordinates[0] > 121.49) {
  throw new Error('VS #545 map point changed; recheck the correction')
}
Object.assign(feature.properties, {
  currentUse: '电信博物馆',
  currentNameZh: '上海电信博物馆',
  currentAddress: '延安东路34号',
  currentUseNote: 'VS #545 为1922年34 EDWARD VII ROAD的大北电报新楼，对应今延安东路34号、优秀历史建筑3A005；不是外滩7号的1907年大北电报旧楼2A004。',
  currentUseRelationship: 'same-building',
  currentUseSourceUri: 'https://english.shanghai.gov.cn/en-CultureHeritage/20251028/ed891dffdfb14193ad6368aad5aaf5ad.html',
  currentUseSourceId: 'verified-landmark-current-uses',
  currentUseMatch: 'historical-road-address-and-official-heritage-record',
})
const output = `${JSON.stringify(collection)}\n`
if (process.argv.includes('--check')) {
  if (fs.readFileSync(filename, 'utf8') !== output) throw new Error('VS #545 correction is stale')
} else {
  fs.writeFileSync(filename, output)
}
console.log(`${process.argv.includes('--check') ? 'Checked' : 'Corrected'} VS #545 to 3A005 / 延安东路34号`)
