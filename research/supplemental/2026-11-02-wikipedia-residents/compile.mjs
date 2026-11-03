import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { Converter } from 'opencc-js'

const directory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(directory, '../../..')
const check = process.argv.includes('--check')
const read = file => JSON.parse(fs.readFileSync(path.resolve(directory, file), 'utf8'))
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const simplify = Converter({ from: 't', to: 'cn' })
const normalized = text => simplify(text).normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu, '')
const assert = (condition, message) => { if (!condition) throw Error(message) }
const queue = read('queue.json')
const manifest = read('manifest.json')
assert(manifest.queueSha256 === sha256(fs.readFileSync(path.join(directory, 'queue.json'))), 'Queue changed after collection')
assert(manifest.coverage.collected === queue.pages.length && !manifest.coverage.failed && !manifest.coverage.missing, 'Collection is incomplete')
for (const source of manifest.sources.filter(source => source.ok)) {
  assert(sha256(fs.readFileSync(path.join(directory, source.localPath))) === source.sha256, `Changed raw source: ${source.localPath}`)
}
const allPlaces = new Map(queue.pages.flatMap(page => page.places.map(place => [place.officialId, place])))
const mappedIds = new Set(JSON.parse(fs.readFileSync(path.join(root, 'public/data/shanghai-excellent-historical-buildings/map-buildings.geojson'), 'utf8')).features.map(feature => feature.properties.officialId))
const pages = manifest.pages.map(page => ({ ...page, ...read(page.localPath) }))
const supplemental = read('supplemental-sources.json').sources
for (const source of supplemental) assert(sha256(fs.readFileSync(path.join(directory, source.localPath))) === source.sha256, `Changed supplemental source: ${source.localPath}`)
const nameAliases = { '蒋中正': '蒋介石' }
function sourcePage(href) {
  const url = new URL(href)
  if (url.hostname !== 'zh.wikipedia.org') return undefined
  const title = url.searchParams.get('title') || decodeURIComponent(url.pathname.split('/').slice(2).join('/'))
  return pages.find(page => normalized(page.title) === normalized(title) || normalized(page.resolvedTitle) === normalized(title))
}
const output = new Map()
const audits = ['review-a.json', 'review-b.json'].map(read)
for (const audit of audits) assert(!(audit.reviewedPages ?? []).some(page => page.status === 'pending'), 'Manual review still has pending pages')
const reviewedTitles = new Set(audits.flatMap(audit => (audit.reviewedPages ?? audit.findings ?? []).map(page => typeof page === 'string' ? page : page.title)))
for (const page of queue.pages) assert(reviewedTitles.has(page.title), `Missing review outcome: ${page.title}`)
for (const audit of audits) for (const record of audit.records) {
  const identity = allPlaces.get(record.officialId)
  assert(identity && identity.expectedName === record.expectedName && identity.expectedAddress === record.expectedAddress, `Identity mismatch: ${record.officialId}`)
  const entry = output.get(record.officialId) ?? { officialId: record.officialId, expectedName: record.expectedName, expectedAddress: record.expectedAddress, residents: [] }
  for (const resident of record.residents) {
    assert(resident.name?.trim() && resident.sources?.length, `Missing residence evidence: ${record.officialId}`)
    const evidence = resident.sources.map(source => ({ source, page: sourcePage(source.url) }))
    assert(evidence.some(item => item.page?.places.some(place => place.officialId === record.officialId)), `Source has no connection to record: ${record.officialId}/${resident.name}`)
    assert(evidence.some(item => item.page && normalized(item.page.wikitext || item.page.text || '').includes(normalized(resident.name))), `Person absent from captured article: ${record.officialId}/${resident.name}`)
    const sources = evidence.map(({ source, page }) => {
      if (!page) {
        assert(supplemental.some(item => item.url === source.url), `Unarchived residence source: ${source.url}`)
        return source
      }
      const oldid = new URL(source.url).searchParams.get('oldid')
      assert(!oldid || Number(oldid) === page.revisionId, `Revision mismatch: ${source.url}`)
      return { title: source.title || `维基百科 · ${page.resolvedTitle}`, url: page.revisionUrl }
    })
    const simplifiedName = simplify(resident.name)
    const result = { name: nameAliases[simplifiedName] || simplifiedName, ...(resident.period ? { period: resident.period } : {}), ...(resident.address ? { address: resident.address } : {}), ...(resident.note ? { note: resident.note } : {}), sources }
    const key = value => `${value.name}|${value.period ?? ''}|${value.address ?? ''}`
    if (!entry.residents.some(value => key(value) === key(result))) entry.residents.push(result)
  }
  if (entry.residents.length) output.set(record.officialId, entry)
}
const records = [...output.values()].sort((a, b) => a.officialId.localeCompare(b.officialId))
const baseline = read('baseline.json').records
const all = [...baseline, ...records]
const summary = {
  articlePagesCollected: queue.pages.length,
  extraLandmarkPagesReviewed: read('extra-landmark-review.json').findings.length,
  candidatePagesManuallyReviewed: manifest.coverage.pagesWithKeywords,
  relatedDirectoryRecords: allPlaces.size,
  newPlaces: records.length,
  newMappedPlaces: records.filter(record => mappedIds.has(record.officialId)).length,
  newResidenceEntries: records.reduce((sum, record) => sum + record.residents.length, 0),
  totalPlaces: new Set(all.map(record => record.officialId)).size,
  totalResidenceEntries: all.reduce((sum, record) => sum + record.residents.length, 0),
  distinctNames: new Set(all.flatMap(record => record.residents.map(resident => resident.name))).size,
}
const generated = { reviewedOn: '2026-11-02', records }
const accepted = ['# 中文维基居住记录回填', '', `本轮新增 ${summary.newPlaces} 个名录地点、${summary.newResidenceEntries} 条居住记录。合并原有记录后共 ${summary.totalPlaces} 个地点、${summary.totalResidenceEntries} 条居住记录，${summary.distinctNames} 个不同姓名。`, '', '| 编号 | 名录名称 | 姓名 | 居住时间 | 门牌 | 来源版本 |', '| --- | --- | --- | --- | --- | --- |',
  ...records.flatMap(record => record.residents.map(resident => `| ${record.officialId.replace('sh-fgj-', '')} | ${record.expectedName.replaceAll('|', '／')} | ${resident.name} | ${resident.period || '未载'} | ${resident.address || record.expectedAddress} | [条目](${resident.sources[0].url}) |`)), ''].join('\n')
const files = new Map([
  [path.join(root, 'src/data/wikipediaNotableResidents.json'), JSON.stringify(generated, null, 2) + '\n'],
  [path.join(directory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n'],
  [path.join(directory, 'accepted.md'), accepted],
])
for (const [file, content] of files) {
  if (check) assert(fs.readFileSync(file, 'utf8') === content, `Generated file is stale: ${file}`)
  else fs.writeFileSync(file, content)
}
console.log(JSON.stringify({ mode: check ? 'check' : 'write', ...summary }))
