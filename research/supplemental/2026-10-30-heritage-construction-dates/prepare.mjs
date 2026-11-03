import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { JSDOM } from 'jsdom'
import ts from 'typescript'

const directory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(directory, '../../..')
const check = process.argv.includes('--check')
const read = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'))
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const stringify = value => `${JSON.stringify(value, null, 2)}\n`
const key = value => (value ?? '').normalize('NFKC').replace(/[\s\u0000-\u001f\u007f、，,；;()（）]/gu, '')
// Preserve separators between door numbers: “1、2号” must never match “12号”.
const addressKey = value => (value ?? '').normalize('NFKC').replace(/\s/gu, '')
  .replace(/[，、]/gu, ',').replace(/；/gu, ';').replace(/[—–]/gu, '-')
const moduleSource = await fs.readFile(path.join(root, 'src/lib/buildingTimeline.ts'), 'utf8')
const compiled = ts.transpileModule(moduleSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { parseConstructionDate, heritageBuildingPeriod } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const mapPath = 'public/data/shanghai-excellent-historical-buildings/map-buildings.geojson'
const mapBytes = await fs.readFile(path.join(root, mapPath))
const mapped = JSON.parse(mapBytes).features
const bytes = await fs.readFile(path.join(directory, 'raw/fgj-construction-dates.html'))
const manual = JSON.parse(await fs.readFile(path.join(directory, 'manual-reviews.json'), 'utf8'))
for (const source of Object.values(manual.sources)) {
  if (source.localPath) source.sha256 = sha256(await fs.readFile(path.join(directory, source.localPath)))
}
const dom = new JSDOM(bytes.toString('utf8'))
const content = dom.window.document.querySelector('.Article_content')
if (!content) throw new Error('Missing source content')
const trs = [...content.querySelectorAll('tr')]
const header = [...trs[0].querySelectorAll('td,th')].map(cell => key(cell.textContent))
if (header.length !== 6 || header[0] !== '编号' || header[3] !== '地址' || header[4] !== '建造年代') throw new Error('Unreviewed table structure')
let district = ''
const sourceRows = []
for (const [index, tr] of trs.entries()) {
  const cells = [...tr.querySelectorAll(':scope > td,:scope > th')].map(cell => cell.textContent.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, '').replace(/\s+/gu, ' ').trim())
  if (cells.length === 1) { district = cells[0]; continue }
  if (!/^\d[A-Z]\d{3}$/u.test(cells[0] ?? '')) continue
  if (cells.length !== 6) throw new Error(`Unexpected record width at row ${index + 1}`)
  sourceRows.push({ row: index + 1, district, code: cells[0], name: cells[1], listedName: cells[2], address: cells[3], dateText: cells[4] })
}
dom.window.close()
if (sourceRows.length < 500) throw new Error('Incomplete source listing')
const officialSource = { title: '上海市房屋管理局 · 带建造年代的优秀历史建筑清单',
  pageTitleAsPublished: '第五批历保建筑清单',
  scopeNote: '页面标题为第五批，表格实际含此前批次编号；匹配以表内编号、原名称和完整地址为准，不据标题改写保护批次。',
  url: 'https://fgj.sh.gov.cn/yxlsjz1/20200414/b9946bf8508e4b9689671fcd4146bb86.html',
  publishedOn: '2020-04-14', localPath: 'raw/fgj-construction-dates.html', sha256: sha256(bytes), rowCount: sourceRows.length }
const reviews = []
const queue = []
for (const feature of mapped) {
  const p = feature.properties
  if (heritageBuildingPeriod(feature).startYear !== undefined) continue
  const candidates = sourceRows.filter(row => row.code === p.officialCodeRaw && addressKey(row.address) === addressKey(p.address))
  const exact = candidates.filter(row => key(row.name) === key(p.officialName))
  const record = { officialId: p.officialId, code: p.officialCodeRaw, name: p.officialName, articleTitle: p.articleTitle,
    address: p.address, originalConstructionDate: p.constructionDate, baselineReason: p.constructionDate ? 'complex-or-unknown-text' : 'missing-text',
    sourceCandidates: candidates, status: 'not-yet-researched' }
  const simple = exact.filter(row => parseConstructionDate(row.dateText).startYear !== undefined)
  // Only fill absent/explicitly unknown dates. Conflicting/approximate existing dates remain reviewed separately.
  const originalMissing = !p.constructionDate || /^(?:不详|未知|待考|年代不详)$/u.test(p.constructionDate.trim())
  if (candidates.length === 1 && simple.length === 1 && originalMissing) {
    const row = simple[0]
    reviews.push({ officialId: p.officialId, expectedName: p.officialName, expectedAddress: p.address,
      originalConstructionDate: p.constructionDate, dateText: row.dateText, sourceId: 'fgj-dated-list', sourceRow: row.row,
      note: '官方编号、原名称和完整门址对应；直接补录建造年代原文。年代区间按末年参与筛选，不把区间末年说成精确竣工年。' })
    record.status = 'accepted-official-date'
  } else if (candidates.length) record.status = candidates.some(row => /\d{4}/u.test(row.dateText))
    ? 'needs-date-or-identity-review' : 'official-source-also-unknown'
  const reviewed = manual.reviews.find(item => item.officialId === p.officialId)
  if (reviewed) {
    if (reviewed.expectedAddress !== p.address || reviewed.expectedName !== p.officialName || reviewed.originalConstructionDate !== p.constructionDate) {
      throw new Error(`Manual review identity drift: ${p.officialId}`)
    }
    record.manualReview = reviewed
    if (reviewed.status === 'accepted') {
      if (parseConstructionDate(reviewed.dateText).startYear === undefined || !manual.sources[reviewed.sourceId]) throw new Error(`Invalid manual date: ${p.officialId}`)
      if (!reviews.some(item => item.officialId === p.officialId)) reviews.push({ ...reviewed, status: undefined })
      record.status = 'accepted-individual-date'
    } else record.status = 'conflicting-dates-or-building-scope'
  }
  queue.push(record)
}
if (new Set(reviews.map(item => item.officialId)).size !== reviews.length) throw new Error('Duplicate accepted IDs')
const summary = { mapped: mapped.length, baselineParsedConstructionDates: mapped.length - queue.length,
  baselineUnknownConstructionDates: queue.length, baselineMissingText: queue.filter(item => item.baselineReason === 'missing-text').length,
  accepted: reviews.length, acceptedByStatus: Object.fromEntries([...new Set(queue.map(item => item.status))]
    .map(status => [status, queue.filter(item => item.status === status).length])),
  remainingUnknownConstructionDates: queue.length - reviews.length }
const registry = { schemaVersion: 1, reviewedOn: manual.reviewedOn, sources: { 'fgj-dated-list': officialSource, ...manual.sources }, records: reviews }
const report = { schemaVersion: 1, reviewedOn: registry.reviewedOn, summary,
  input: { file: mapPath, sha256: sha256(mapBytes) }, sources: registry.sources, records: queue }
const outputs = [
  [path.join(root, 'src/data/heritageConstructionDateReviews.json'), registry],
  [path.join(directory, 'source-rows.json'), { source: officialSource, records: sourceRows }],
  [path.join(directory, 'investigation.json'), report],
]
for (const [file, value] of outputs) {
  if (check) { if (await fs.readFile(file, 'utf8') !== stringify(value)) throw new Error(`Output drift: ${file}`) }
  else await fs.writeFile(file, stringify(value))
}
const cell = value => String(value ?? '未记载').replace(/\|/gu, '\\|').replace(/\r?\n/gu, ' ')
const labels = {
  'not-yet-researched': '尚未逐项补查',
  'official-source-also-unknown': '该官方清单亦未记年代',
  'needs-date-or-identity-review': '年代语义／名称／门址待核',
  'conflicting-dates-or-building-scope': '来源冲突／保护范围待核',
}
const references = Object.entries(registry.sources).map(([id, source]) => `[${id}]: ${source.url} "${source.title}"`).join('\n')
const acceptedTable = '# 已采用的建造年代补查\n\n'
  + `${reviews.length}项建造年代均保留原字段，来源区间不等于精确竣工年。由prepare.mjs生成。\n\n`
  + '| 名录编号 | 名称 | 完整门址 | 原年代字段 | 采用年代 | 依据 |\n| --- | --- | --- | --- | --- | --- |\n'
  + reviews.map(item => `| ${cell(item.officialId)} | ${cell(item.expectedName)} | ${cell(item.expectedAddress)} | ${cell(item.originalConstructionDate)} | ${cell(item.dateText)} | [${item.sourceRow ? `官方表第${item.sourceRow}行` : registry.sources[item.sourceId].title}][${item.sourceId}] |`).join('\n')
  + `\n\n${references}\n`
const remainingTable = '# 尚未采用建造年代的条目\n\n'
  + '这是建造年代待查清单；其中部分建筑的时间轴已有历史记录年份。尚未逐项补查不等于已查无据。由prepare.mjs生成。\n\n'
  + '| 名录编号 | 名称 | 完整门址 | 原年代字段 | 当前状态 | 待核线索 |\n| --- | --- | --- | --- | --- | --- |\n'
  + queue.filter(item => !item.status.startsWith('accepted-')).map(item => `| ${cell(item.officialId)} | ${cell(item.name)} | ${cell(item.address)} | ${cell(item.originalConstructionDate)} | ${labels[item.status]} | ${cell(item.manualReview?.note ?? (item.sourceCandidates.map(row => `官方表第${row.row}行：${row.name}／${row.dateText || '未记年代'}`).join('；') || '本轮官方清单无完整匹配，需另查档案、地方志或修缮资料。'))} |`).join('\n') + '\n'
for (const [name, value] of [['accepted-dates.md', acceptedTable], ['remaining-dates.md', remainingTable]]) {
  const file = path.join(directory, name)
  if (check) { if (await fs.readFile(file, 'utf8') !== value) throw new Error(`Output drift: ${file}`) }
  else await fs.writeFile(file, value)
}
console.log(JSON.stringify({ mode: check ? 'check' : 'write', ...summary }, null, 2))
