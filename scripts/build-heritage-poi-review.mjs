import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const read = file => JSON.parse(fs.readFileSync(new URL(file, root), 'utf8'))
const report = read('research/rechecks/2026-11-09-heritage-amap-pois/search-results.json')
const queue = read('research/rechecks/2026-11-09-heritage-amap-pois/review-queue.json')
const official = new Map(read('public/data/shanghai-excellent-historical-buildings/buildings.json').records.map(record => [record.id, record]))
const byId = new Map(report.records.map(record => [record.officialId, record]))
const records = queue.records.map(item => {
  const record = byId.get(item.officialId), source = official.get(item.officialId)
  if (!record || !source || record.selectedPoi && !['needs-review', 'shared-poi-review'].includes(record.status)) throw Error(`Invalid review target ${item.officialId}`)
  return { officialId: item.officialId, code: item.code, name: item.name, address: item.address,
    listedName: record.listedName, district: record.districtAsListed, batch: record.batch,
    reasonCode: item.reasonCode, reason: item.reason, sourceUrl: source.source.url,
    candidates: item.candidates.map(candidate => {
      const poi = candidate.poi
      if (!/^[A-Za-z0-9]+$/.test(poi.id)) throw Error('Invalid POI ID')
      return { id: poi.id, name: poi.name, address: typeof poi.address === 'string' ? poi.address : '',
        district: poi.adname ?? '', category: poi.type ?? '', location: poi.location ?? null,
        distanceMetres: candidate.distanceMetres,
        flags: [candidate.wrongDistrict && '区县不符', candidate.rejectedType && '停车场／道路等类型',
          candidate.tenant && '商铺／单位', candidate.subordinate && '楼内附属单位',
          candidate.componentMismatch && '楼栋号不符', candidate.componentUnproven && '具体楼栋待核',
          candidate.scopeConflict && !candidate.componentMismatch && !candidate.componentUnproven && '保护范围待核',
          !candidate.addressOverlap && '门牌未对应'].filter(Boolean),
        addressMatch: candidate.exactAddress ? '完整门牌一致' : candidate.addressOverlap ? '门牌范围有交集' : null }
    }) }
})
if (records.length !== queue.recordCount || new Set(records.map(item => item.officialId)).size !== records.length) throw Error('Review record count mismatch')
const output = new URL('public/data/heritage-poi-review.json', root)
fs.writeFileSync(output, JSON.stringify({ schemaVersion: 1, updatedAt: report.updatedAt, recordCount: records.length, records }) + '\n')
console.log(JSON.stringify({ output: fileURLToPath(output), records: records.length, candidates: records.reduce((n, r) => n + r.candidates.length, 0) }))
