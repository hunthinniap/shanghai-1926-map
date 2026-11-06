import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import * as OpenCC from 'opencc-js'
import { providedRoadHistory, roadRangeStart } from './lib/road-history-import.mjs'

const root = 'research/road-histories/2026-11-05-results'
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const simplify = OpenCC.Converter({ from: 'tw', to: 'cn' })
const sourceText = text => simplify(text)
  .replace(/<ref\b[^>]*?\/>/gs, '')
  .replace(/<ref\b[^>]*>.*?<\/ref>/gs, '')
  .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1')
const write = process.argv.includes('--write')
assert(write !== process.argv.includes('--check'), 'Use either --write or --check')

for (const input of read(`${root}/input-manifest.json`).files) {
  assert.equal(hash(`${root}/${input.file}`), input.sha256, `Changed input: ${input.file}`)
}
const combined = read(`${root}/input/all-road-histories-results.json`)
const decisions = read(`${root}/review-decisions.json`).reviews
const policy = read(`${root}/adoption-policy.json`)
assert.equal(policy.rangeDisplay, 'earliest-year')
const roads = read('public/data/historical-features.geojson').features.filter(f => f.properties.kind === 'road')
const groups = new Map()
const properties = new Map()
for (const { properties: p } of roads) {
  const identity = { modernNameZh: p.modernNameZh, historicalName: p.historicalName }
  if (groups.has(p.featureGroupId)) assert.deepEqual(groups.get(p.featureGroupId), identity)
  groups.set(p.featureGroupId, identity)
  properties.set(p.featureGroupId, p)
}
const rows = new Map(), index = {}, reviewed = [], auditRows = [], outputs = new Map()
const statuses = { verified: 0, conflicting: 0, unresolved: 0 }
const url = value => {
  const parsed = new URL(value)
  assert(['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password, `Unsafe source URL: ${value}`)
  return value
}
const encode = value => JSON.stringify(value, null, 2) + '\n'

for (const batch of combined.batches) {
  assert.match(batch.batchId, /^\d{2}$/)
  assert.deepEqual(read(`${root}/input/${batch.batchId}.result.json`), batch, `Batch ${batch.batchId} differs from combined input`)
  const entries = []
  for (const row of batch.results) {
    assert(!rows.has(row.featureGroupId), `Duplicate road: ${row.featureGroupId}`)
    assert.deepEqual(groups.get(row.featureGroupId), { modernNameZh: row.modernNameZh, historicalName: row.historicalName }, `Road identity changed: ${row.featureGroupId}`)
    assert(Object.hasOwn(statuses, row.status))
    statuses[row.status]++
    rows.set(row.featureGroupId, row)
    for (const event of row.events) {
      assert(event.year === null || (Number.isInteger(event.year) && event.year >= 1000 && event.year <= 2100))
      assert(event.period && event.kind && event.name && Array.isArray(event.sources))
    }
    const reasons = []
    if (row.status === 'conflicting') reasons.push('原资料记录的差异及处理说明见下方。')
    if (row.status === 'unresolved') reasons.push('提供资料尚未查明道路身份。')
    if (/TO DO|UNNAMED|VANISHED|XX/.test(row.modernNameZh)) reasons.push('今日名称为占位符，不能作为正式路名。')
    if (row.events.some(e => /Virtual Shanghai (?:史料|数据库)|共关联.*历史建筑|门牌记录/.test(e.segment + e.sources.join(' ')))) reasons.push('建筑门牌或地图收录仅能提供道路线索，不能证明筑路、命名年份。')
    if (row.events.some(e => /公寓|住宅|少年宫|少年之家|教堂|电影院|宾馆|厂房|高尔夫|会堂|学校/.test(e.name))) reasons.push('事件中含沿街建筑或机构信息，需与道路自身沿革区分。')
    const decision = decisions.find(d => d.featureGroupId === row.featureGroupId)
    const projection = providedRoadHistory(row, properties.get(row.featureGroupId), policy.identityHolds[row.featureGroupId])
    const adopted = Boolean(decision || projection.events.length)
    if (decision) reasons.push('主时间线按核读原文整理，区间按最早年显示；下列保留原记录。')
    else if (adopted) {
      reviewed.push({ featureGroupId: row.featureGroupId, modernName: row.modernNameZh, historicalNames: [row.historicalName],
        provenance: 'provided', events: projection.events,
        ...(projection.events.some(e => !e.url) ? { sources: row.sources.map(s => ({ title: s.title.replace(/\s+%[\dA-F]{2}.*$/i, '').slice(0, 200), url: url(s.url) })) } : {}),
      })
      reasons.push('已采用提供资料中的道路名称事件，区间按最早年显示；原始区间及范围保留于此。')
    } else reasons.push(projection.holdReason || '记录未给出可用的道路名称事件，暂保留原资料。')
    index[row.featureGroupId] = { batchId: batch.batchId, modernNameZh: row.modernNameZh, historicalName: row.historicalName }
    entries.push({ ...row, searchLog: undefined, reasons,
      // The original, including full titles/evidence, remains byte-for-byte in research/input.
      sources: row.sources.map(s => ({ title: s.title.replace(/\s+%[\dA-F]{2}.*$/i, '').slice(0, 200), url: url(s.url), locator: s.locator })),
    })
    auditRows.push({ featureGroupId: row.featureGroupId, batchId: batch.batchId, providedStatus: row.status,
      primaryTimeline: adopted, basis: decision ? 'source-reviewed' : adopted ? 'provided' : 'pending',
      reasons, providedEvents: row.events.length, excludedEvents: decision ? [] : projection.excluded })
  }
  outputs.set(`public/data/road-history-supplements/${batch.batchId}.json`, encode(entries))
}
assert.equal(rows.size, combined.totalRoads)
assert.equal(combined.batches.length, combined.totalBatches)
assert.deepEqual(statuses, combined.statusSummary)
assert.equal(new Set(decisions.map(d => d.featureGroupId)).size, decisions.length)
for (const decision of decisions) {
  const original = rows.get(decision.featureGroupId)
  assert(original, `Review has no input: ${decision.featureGroupId}`)
  assert.equal(original.modernNameZh, decision.modernName)
  assert.deepEqual(decision.historicalNames, [original.historicalName])
  assert.equal(hash(decision.source.file), decision.source.sha256)
  const page = read(decision.source.file).query.pages.find(p => p.title === decision.source.title && p.revisions?.[0].revid === decision.source.revid)
  assert(page && !page.missing, `Missing reviewed revision: ${decision.modernName}`)
  assert(sourceText(page.revisions[0].slots.main.content).includes(decision.source.evidence), `Reviewed evidence differs: ${decision.modernName}`)
  const citation = `https://zh.wikipedia.org/w/index.php?oldid=${decision.source.revid}`
  assert(decision.events.length)
  for (const event of decision.events) {
    assert(event.name && event.kind)
    assert(event.year !== undefined || event.period, `Missing event date: ${decision.modernName}`)
    if (event.year !== undefined) {
      assert(Number.isInteger(event.year))
      assert(decision.source.evidence.includes(event.dateEvidence || String(event.year)), `Event year absent from read evidence: ${decision.modernName} ${event.year}`)
    }
  }
  const origins = decision.origins?.map(origin => {
    assert(decision.source.evidence.includes(origin.evidence), `Origin evidence absent: ${decision.modernName} ${origin.name}`)
    return { name: origin.name, description: origin.description, url: citation, sourceTitle: `维基百科 · ${decision.source.title}（固定版本）` }
  })
  reviewed.push({ featureGroupId: decision.featureGroupId, modernName: decision.modernName, historicalNames: decision.historicalNames,
    provenance: 'source-reviewed',
    events: decision.events.map(({ dateEvidence: _dateEvidence, ...e }) => ({ ...e,
      ...(roadRangeStart(e.period) !== undefined ? { displayYear: roadRangeStart(e.period) } : {}),
      url: citation, sourceTitle: `维基百科 · ${decision.source.title}（固定版本）` })),
    ...(origins?.length ? { origins } : {}),
    ...(decision.note ? { note: decision.note } : {}),
  })
}
const summary = { batches: combined.batches.length, importedGroups: rows.size, providedStatus: statuses,
  sourceReviewedTimelines: decisions.length, providedTimelines: reviewed.length - decisions.length,
  newPrimaryTimelines: reviewed.length, newPrimaryEvents: reviewed.reduce((n, r) => n + r.events.length, 0),
  newPrimaryOrigins: reviewed.reduce((n, r) => n + (r.origins?.length || 0), 0),
  pendingGroups: rows.size - reviewed.length }
outputs.set('src/data/importedRoadHistories.json', encode(reviewed))
outputs.set('src/data/roadHistorySupplementIndex.json', encode(index))
outputs.set(`${root}/integration-audit.json`, encode({ summary, rows: auditRows }))
for (const [file, content] of outputs) {
  if (write) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content) }
  else assert.equal(fs.readFileSync(file, 'utf8'), content, `Outdated output: ${file}`)
}
console.log(JSON.stringify(summary))
