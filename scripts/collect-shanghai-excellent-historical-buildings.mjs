import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { parseHeritagePage } from './lib/shanghai-heritage.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const directory = path.join(root, 'public/data/shanghai-excellent-historical-buildings')
const indexUrl = 'https://fgj.sh.gov.cn/yxlsjz/index.html'
const args = new Set(process.argv.slice(2))
if ([...args].some((arg) => !['--offline', '--check'].includes(arg))) throw new Error('Usage: collect-shanghai-excellent-historical-buildings.mjs [--offline | --check]')
const offline = args.has('--offline') || args.has('--check')
const check = args.has('--check')
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')
const readJson = async (file) => JSON.parse(await fs.readFile(path.join(directory, file), 'utf8'))
const stringify = (value) => `${JSON.stringify(value, null, 2)}\n`
const countBy = (records, key) => records.reduce((counts, record) => {
  counts[record[key]] = (counts[record[key]] ?? 0) + 1
  return counts
}, {})
const numeral = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }

function catalog(html) {
  const dom = new JSDOM(html)
  try {
    const links = [...dom.window.document.querySelectorAll('li > a[href]')].map((element) => ({
      title: element.textContent.trim(), url: new URL(element.getAttribute('href'), indexUrl).href,
      indexDate: element.parentElement.querySelector('.time')?.textContent.trim().replaceAll('.', '-') ?? null,
    })).filter((entry) => entry.url.startsWith('https://fgj.sh.gov.cn/yxlsjz/'))
    const batches = links.filter((entry) => /^第.+批优秀历史建筑$/u.test(entry.title)).map((entry) => {
      const batch = numeral[entry.title.match(/^第(.+)批/u)[1]]
      if (!batch) throw new Error(`Unrecognized batch label: ${entry.title}`)
      return { ...entry, batch }
    }).sort((a, b) => a.batch - b.batch)
    const totalPages = html.match(/totalPage\s*:\s*(\d+)/u)?.[1]
    if (totalPages !== '1') throw new Error(`Review catalogue pagination before collection: ${totalPages ?? 'unknown'}`)
    if (batches.length !== 5 || new Set(batches.map((entry) => entry.batch)).size !== 5) {
      throw new Error('The directory no longer has exactly the five reviewed batches; review the new scope first')
    }
    return { batches, relatedDocuments: links.filter((entry) => !/^第.+批优秀历史建筑$/u.test(entry.title)), totalPages: 1 }
  } finally { dom.window.close() }
}

async function download(url, localPath) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000),
    headers: { 'User-Agent': 'ShanghaiHistoricalMapResearch/1.0', Accept: 'text/html' } })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('text/html')) throw new Error(`Unexpected content type: ${contentType}`)
  return { bytes, source: { url, resolvedUrl: response.url, localPath, retrievedAt: new Date().toISOString(),
    contentType, byteLength: bytes.length, sha256: sha256(bytes) } }
}

let sources
const snapshots = new Map()
if (offline) {
  sources = await readJson('sources.json')
  for (const source of [sources.index, ...sources.batches]) {
    const bytes = await fs.readFile(path.join(directory, source.localPath))
    if (sha256(bytes) !== source.sha256 || bytes.length !== source.byteLength) throw new Error(`Snapshot checksum mismatch: ${source.localPath}`)
    snapshots.set(source.localPath, bytes)
  }
} else {
  const downloadedIndex = await download(indexUrl, 'raw/index.html')
  snapshots.set(downloadedIndex.source.localPath, downloadedIndex.bytes)
  const entries = catalog(downloadedIndex.bytes.toString('utf8'))
  const results = await Promise.allSettled(entries.batches.map(async (entry) => {
    const localPath = `raw/batch-${String(entry.batch).padStart(3, '0')}.html`
    const result = await download(entry.url, localPath)
    const dom = new JSDOM(result.bytes.toString('utf8'))
    try {
      const pageTitle = dom.window.document.querySelector('meta[name="ArticleTitle"]')?.content
      const pageUpdatedAt = dom.window.document.querySelector('meta[name="PubDate"]')?.content
      if (pageTitle !== entry.title || !/^\d{4}-\d{2}-\d{2}$/u.test(pageUpdatedAt ?? '')) throw new Error(`Unexpected page metadata: ${entry.url}`)
      result.source = { ...result.source, ...entry, publisher: '上海市房屋管理局', pageUpdatedAt }
      return result
    } finally { dom.window.close() }
  }))
  const errors = results.filter((result) => result.status === 'rejected')
  if (errors.length) throw new AggregateError(errors.map((result) => result.reason), 'Source collection failed; existing snapshots were not replaced')
  const downloads = results.map((result) => result.value)
  for (const result of downloads) snapshots.set(result.source.localPath, result.bytes)
  sources = { schemaVersion: 1, index: { ...downloadedIndex.source, title: '优秀历史建筑', publisher: '上海市房屋管理局' },
    batches: downloads.map((result) => result.source), relatedDocuments: entries.relatedDocuments,
    relatedDocumentsCollection: '目录仅保存这些政策／技术文件的链接和目录日期；未下载或解读正文。' }
}

const index = catalog(snapshots.get(sources.index.localPath).toString('utf8'))
if (JSON.stringify(index.batches.map(({ batch, url }) => ({ batch, url }))) !==
  JSON.stringify(sources.batches.map(({ batch, url }) => ({ batch, url })))) throw new Error('Source manifest and saved index disagree')
const batches = sources.batches.map((source) => parseHeritagePage(snapshots.get(source.localPath).toString('utf8'), source))
const records = batches.flatMap((batch) => batch.records)
if (new Set(records.map((record) => record.id)).size !== records.length) throw new Error('Generated record identifiers are not unique')
const expectedCounts = [61, 175, 162, 234, 426]
for (const [offset, batch] of batches.entries()) {
  if (batch.recordCount !== expectedCounts[offset]) throw new Error(`Batch ${batch.batch} count changed from ${expectedCounts[offset]} to ${batch.recordCount}; inspect source changes before accepting`)
  for (const table of batch.tableStats) {
    if (table.physicalRows !== table.recordRows + table.districtRows + table.headerRows + table.continuationRows + table.emptyRows + table.noteRows) {
      throw new Error(`Unaccounted table rows in batch ${batch.batch}`)
    }
  }
}
const anomalies = batches.flatMap((batch) => batch.anomalies.map((anomaly) => ({ batch: batch.batch, ...anomaly })))
const summary = { totalRecords: records.length, byBatch: countBy(records, 'batch'),
  byDistrictAsListed: countBy(records, 'districtAsListed'),
  recordsWithQualityFlags: records.filter((record) => record.qualityFlags.length).length,
  nonstandardCodes: records.filter((record) => !record.code).map((record) => record.codeRaw),
  duplicateCodes: anomalies.filter((anomaly) => anomaly.type === 'duplicate-code').map((anomaly) => anomaly.code),
  recordsWithSourceNotes: records.filter((record) => record.sourceNotes.length).length,
  componentRows: records.reduce((sum, record) => sum + record.components.length, 0) }
const artifacts = new Map([
  ['sources.json', sources],
  ['buildings.json', { schemaVersion: 1, publisher: '上海市房屋管理局', sourceIndexUrl: indexUrl,
    collectedAt: sources.index.retrievedAt, recordCount: records.length,
    recordUnit: '一个来源编号主行；同编号不同来源行分别保留；合并单元格下的部件作为components。',
    listedUseMeaning: 'listedNameOrUse是来源页面记载，未独立核定今日使用情况。pageUpdatedAt是页面更新时间，不是批次批准日。',
    records }],
  ['anomalies.json', { schemaVersion: 1, policy: '保留来源异常；未推测修正编号、填补空值或按同号／同址去重。', anomalies }],
  ['index.json', { schemaVersion: 1, title: '上海市优秀历史建筑名单（第一至第五批）', publisher: '上海市房屋管理局',
    sourceIndexUrl: indexUrl, collectedAt: sources.index.retrievedAt, summary,
    files: { buildings: 'buildings.json', sources: 'sources.json', anomalies: 'anomalies.json', validation: 'validation.json' },
    batches: batches.map((batch) => ({ batch: batch.batch, title: batch.title, recordCount: batch.recordCount,
      pageUpdatedAt: batch.source.pageUpdatedAt, file: `batches/${String(batch.batch).padStart(3, '0')}.json`,
      sourceUrl: batch.source.url, rawFile: batch.source.localPath,
      byDistrictAsListed: countBy(batch.records, 'districtAsListed') })) }],
  ['validation.json', { schemaVersion: 1, passed: true, sourceRetrievedAt: sources.index.retrievedAt,
    method: '从6个原始HTML快照重新解析；核验SHA-256、5批目录链接、所有表格行分类、逐批人工核对条目数及生成ID唯一性。--check还逐文件核对所有JSON。',
    sourceSnapshots: [sources.index, ...sources.batches].map(({ localPath, sha256, byteLength }) => ({ localPath, sha256, byteLength })),
    expectedRecordCounts: expectedCounts, actualRecordCounts: batches.map((batch) => batch.recordCount),
    uniqueRecordIds: records.length, sourceCodesRequiredUnique: false,
    tables: batches.map((batch) => ({ batch: batch.batch, tables: batch.tableStats })), summary }],
])
for (const batch of batches) artifacts.set(`batches/${String(batch.batch).padStart(3, '0')}.json`, { schemaVersion: 1, ...batch })
if (check) {
  for (const [filename, value] of artifacts) {
    if (await fs.readFile(path.join(directory, filename), 'utf8') !== stringify(value)) throw new Error(`Generated output drift: ${filename}`)
  }
  console.log(`Verified ${records.length} records in five batches against all six saved HTML snapshots; no output drift.`)
} else {
  await fs.mkdir(path.join(directory, 'raw'), { recursive: true })
  await fs.mkdir(path.join(directory, 'batches'), { recursive: true })
  for (const [filename, bytes] of snapshots) await fs.writeFile(path.join(directory, filename), bytes)
  for (const [filename, value] of artifacts) await fs.writeFile(path.join(directory, filename), stringify(value))
  console.log(`Collected ${records.length} official listing entries into ${path.relative(root, directory)}.`)
  console.log(JSON.stringify(summary, null, 2))
}
