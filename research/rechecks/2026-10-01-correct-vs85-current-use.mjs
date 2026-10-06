import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyCurrentUseHold, clearCurrentUse } from '../../scripts/lib/current-use-holds.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const historicalPath = path.join(root, 'public/data/historical-features.geojson')
const auditPath = path.join(root, 'public/data/landmark-current-use-audit.json')
const holdsPath = path.join(root, 'scripts/data/landmark-current-use-holds.json')
const read = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'))
const historical = read(historicalPath)
const audit = read(auditPath)
const hold = read(holdsPath).find((item) => item.featureGroupId === 'landmark-vs-site-85')
const feature = historical.features.find((item) => item.properties.id === 'landmark-vs-site-85')
const record = audit.records.find((item) => item.featureGroupId === 'landmark-vs-site-85')
const laterOffice = historical.features.find((item) => item.properties.id === 'landmark-vs-site-169')

if (!hold || !feature || !record || !laterOffice
  || feature.properties.sourceRecordIds.join(',') !== '85'
  || feature.properties.historicalAddresses?.[0]?.address !== '2 RUE BLUNTSCHLI'
  || laterOffice.properties.currentAddress !== '淮海中路375号') {
  throw new Error('VS85 correction guard failed; review the source records before changing data')
}

if (process.argv.includes('--check')) {
  if (Object.keys(feature.properties).some((key) => key.startsWith('currentUse') || ['currentNameZh', 'currentAddress'].includes(key))
    || record.status !== 'needs-review-research' || record.accepted) {
    throw new Error('VS85 stale current-use attribution remains')
  }
  console.log('VS85 current-use hold checked; VS169 remains unchanged.')
} else {
  feature.properties = clearCurrentUse(feature.properties)
  Object.assign(record, applyCurrentUseHold(record, hold))
  delete record.accepted
  delete record.reviewCandidate
  delete record.nearestSearchResult
  audit.summary.matchedFromWikipedia = audit.records.filter((item) => item.status === 'matched-wikipedia').length
  audit.summary.matchedFromResearch = audit.records.filter((item) => item.status === 'matched-research').length
  audit.summary.needsReviewResearch = audit.records.filter((item) => item.status === 'needs-review-research').length
  fs.writeFileSync(historicalPath, `${JSON.stringify(historical)}\n`)
  fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`)
  console.log('Withdrew VS85 false 中环广场 attribution; retained its historical point and VS169.')
}
