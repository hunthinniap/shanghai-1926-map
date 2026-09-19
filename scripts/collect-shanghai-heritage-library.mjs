import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const directory = path.join(root, 'public/data/shanghai-excellent-historical-buildings/geocoding/library')
const pageUrl = 'https://data.library.sh.cn/shnh/wkl/webapi/building/toAllBuilding'
const scriptUrl = 'https://data.library.sh.cn/res/js/building/allBuilding.js'
const apiUrl = 'https://data.library.sh.cn/shnh/gmwx/webapi/architecture/getArchitectures'
const args = new Set(process.argv.slice(2))
if ([...args].some((arg) => !['--offline', '--check'].includes(arg))) {
  throw new Error('Usage: collect-shanghai-heritage-library.mjs [--offline | --check]')
}
const check = args.has('--check')
const offline = check || args.has('--offline')
const stringify = (value) => `${JSON.stringify(value, null, 2)}\n`
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const snapshots = new Map()
const redactUrl = (value) => {
  const url = new URL(value)
  if (url.searchParams.has('key')) url.searchParams.set('key', 'PUBLIC_CLIENT_KEY_REDACTED')
  return url.href
}

async function download(url, id, localPath) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { 'User-Agent': 'ShanghaiHistoricalMapResearch/1.0' },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${redactUrl(url)}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const source = {
    id, url: redactUrl(url), resolvedUrl: redactUrl(response.url), localPath,
    retrievedAt: new Date().toISOString(), contentType: response.headers.get('content-type'),
    byteLength: bytes.length, sha256: sha256(bytes),
  }
  snapshots.set(localPath, bytes)
  return source
}

function parseResponse(source) {
  const result = JSON.parse(snapshots.get(source.localPath).toString('utf8'))
  if (!Array.isArray(result.data) || !Number.isInteger(result.pager?.rowCount)) {
    throw new Error(`Unexpected library response schema: ${source.localPath}`)
  }
  return result
}

let manifest
if (offline) {
  manifest = JSON.parse(await fs.readFile(path.join(directory, 'sources.json'), 'utf8'))
  for (const source of manifest.sources) {
    const bytes = await fs.readFile(path.join(directory, source.localPath))
    if (sha256(bytes) !== source.sha256 || bytes.length !== source.byteLength) {
      throw new Error(`Snapshot checksum mismatch: ${source.localPath}`)
    }
    snapshots.set(source.localPath, bytes)
  }
} else {
  const results = await Promise.allSettled([
    download(pageUrl, 'library-catalogue-page', 'raw/page.html'),
    download(scriptUrl, 'library-map-client', 'raw/allBuilding.js'),
  ])
  const errors = results.filter((result) => result.status === 'rejected')
  if (errors.length) throw new AggregateError(errors.map((result) => result.reason), 'Library source collection failed')
  const sources = results.map((result) => result.value)
  const script = snapshots.get('raw/allBuilding.js').toString('utf8')
  const publicClientKey = script.match(/key\s*:\s*["']([a-f0-9]{32,})["']/iu)?.[1]
  if (!publicClientKey) throw new Error('The publisher client no longer exposes its public catalogue API key')
  const request = async (pageSize, pageth, id, localPath) => download(`${apiUrl}?${new URLSearchParams({
    freetext: '', isRed: '3', key: publicClientKey, pageth: String(pageth), iflimit: '1', pageSize: String(pageSize),
  })}`, id, localPath)
  const allSource = await request(2000, 1, 'library-architectures-all', 'raw/architectures-all.json')
  sources.push(allSource)
  const all = parseResponse(allSource)
  if (all.pager.rowCount > 2000 || all.pager.pageCount !== 1) {
    throw new Error('The library catalogue exceeds the reviewed single-request size; review pagination before collecting')
  }
  // The service reports one more row than it returns. Independently partition the
  // same query to distinguish that source anomaly from an incomplete last page.
  for (let page = 1; page <= Math.ceil(all.pager.rowCount / 1000); page += 1) {
    sources.push(await request(1000, page, `library-verification-page-${page}`, `raw/verification-page-${page}.json`))
  }
  manifest = {
    schemaVersion: 1, publisher: '上海图书馆', sourcePage: pageUrl,
    collectionMethod: '使用公开目录客户端调用的优秀历史建筑接口；isRed=3、空检索词，pageSize=2000；另以pageSize=1000分段核对实体URI全集。',
    publicClientKeyPolicy: '请求参数中的公开客户端key不写入来源URL；可复现采集时从保存／在线的原始客户端脚本读取。原始脚本完整保留。',
    license: {
      noticeAsPublished: '非特别注明，本站遵循cc2.0协议（署名-非商业性使用-相同方式共享）',
      noticeSourceId: 'library-catalogue-page', noticeSourceUrl: pageUrl,
    },
    sources,
  }
}

const script = snapshots.get('raw/allBuilding.js').toString('utf8')
const lines = script.split(/\r?\n/u)
const mapStart = lines.findIndex((line) => line.includes('var mapExcellentHistory = function'))
const transformLine = lines.findIndex((line, index) => index > mapStart && line.includes('bd_to_gd(long, lat).long'))
const positionLine = lines.findIndex((line, index) => index > transformLine && line.includes('position: [newLong, newLat]'))
const definitionLine = lines.findIndex((line) => line.includes('function bd_to_gd(bd_long, bd_lat)'))
if (mapStart < 0 || transformLine < mapStart || positionLine < transformLine || definitionLine < 0 ||
    !script.includes('bd_long - 0.0065') || !script.includes('bd_lat - 0.006')) {
  throw new Error('Publisher map coordinate conversion changed; re-review source coordinate system')
}
const allSource = manifest.sources.find((source) => source.id === 'library-architectures-all')
if (!allSource) throw new Error('Missing all-buildings response source')
const all = parseResponse(allSource)
const uris = all.data.map((record) => record.uri)
if (uris.some((uri) => typeof uri !== 'string' || !/^http:\/\/data\.library\.sh\.cn\/entity\/architecture\/[a-z0-9]+$/u.test(uri)) ||
    new Set(uris).size !== uris.length) throw new Error('Library response has missing or duplicate architecture identifiers')
const verificationSources = manifest.sources.filter((source) => source.id.startsWith('library-verification-page-'))
const verificationResponses = verificationSources.map(parseResponse)
if (verificationResponses.length !== Math.ceil(all.pager.rowCount / 1000) ||
    verificationResponses.some((response) => response.pager.rowCount !== all.pager.rowCount)) {
  throw new Error('Verification pagination does not cover the same advertised catalogue')
}
const verificationUris = verificationResponses.flatMap((response) => response.data.map((record) => record.uri))
if (JSON.stringify([...uris].sort()) !== JSON.stringify([...verificationUris].sort())) {
  throw new Error('Single request and partitioned catalogue have different entity membership')
}
const coordinateSystem = {
  name: 'BD-09', determination: 'publisher-client-code', sourceId: 'library-map-client', sourceUrl: scriptUrl,
  evidence: [
    { startLine: transformLine, endLine: positionLine + 1, text: '优秀历史建筑图层将API的long/lat先经bd_to_gd转换，再传给AMap.Marker。源注释为“百度经纬度-转-高德经纬度”。' },
    { startLine: definitionLine, endLine: definitionLine + 11, text: 'bd_to_gd函数注释为“百度坐标转高德”，减去经度0.0065和纬度0.006并执行BD-09到GCJ-02公式。' },
  ],
  coordinatesAreConverted: false,
  caveat: '接口本身未声明坐标系；BD-09判定来自发布方实际地图客户端的明确转换流程，不把RDF geo:lat/long单独视为WGS84保证。',
}
const records = all.data.map((record, sourceIndex) => {
  const longitude = Number(record.long)
  const latitude = Number(record.lat)
  const valid = String(record.long ?? '').trim() !== '' && String(record.lat ?? '').trim() !== '' &&
    Number.isFinite(longitude) && Number.isFinite(latitude) && longitude >= 120.7 && longitude <= 122.4 && latitude >= 30.5 && latitude <= 32.0
  return {
    ...record, sourceIndex, sourceId: allSource.id,
    sourceBatch: null,
    sourceBatchNote: '目录API未提供公布批次；不从名单顺序推测。',
    coordinates: {
      coordinateSystem: 'BD-09', longitude: valid ? longitude : null, latitude: valid ? latitude : null,
      status: valid ? 'source-reference-point' : 'invalid-or-outside-shanghai',
      accuracyMetres: null, precisionNote: '接口未提供精度或门址定位类型；保留源经纬度，不宣称建筑轮廓或测量级精度。',
    },
  }
})
const summary = {
  advertisedRowCount: all.pager.rowCount, returnedRecords: records.length, uniqueArchitectureUris: new Set(uris).size,
  validSourceCoordinates: records.filter((record) => record.coordinates.status === 'source-reference-point').length,
  sourceCountDifference: all.pager.rowCount - records.length,
  sourceCountDifferenceNote: all.pager.rowCount === records.length ? null : '发布方pager.rowCount与返回的唯一实体数量不一致；完整单页和独立分段请求的URI集合完全相同。保留计数差异，不补造缺失实体。',
  verificationPageCounts: verificationResponses.map((response) => response.data.length),
}
const artifacts = new Map([
  ['sources.json', manifest],
  ['buildings.json', {
    schemaVersion: 1, publisher: '上海图书馆', sourcePage: pageUrl, retrievedAt: allSource.retrievedAt,
    recordCount: records.length, coordinateSystem, summary,
    recordMeaning: '上海图书馆优秀历史建筑实体目录；名称和地址是来源记载。尚未据此与房管局名单自动等同，也未转换为WGS84。',
    records,
  }],
  ['validation.json', {
    schemaVersion: 1, passed: true, summary, coordinateSystem,
    sourceSnapshots: manifest.sources.map(({ id, localPath, byteLength, sha256 }) => ({ id, localPath, byteLength, sha256 })),
    checks: ['所有原始快照字节数与SHA-256', '接口数组与分页计数结构', '实体URI唯一且来自architecture命名空间',
      '单页全集与分段分页URI逐个一致', '经纬度有效且在上海宽边界内（异常只标记）', '发布方坐标转换代码仍符合BD-09到GCJ-02流程'],
  }],
])
if (check) {
  for (const [filename, value] of artifacts) {
    if (await fs.readFile(path.join(directory, filename), 'utf8') !== stringify(value)) throw new Error(`Generated output drift: ${filename}`)
  }
  console.log(`Verified ${records.length} Shanghai Library entities and ${manifest.sources.length} source snapshots; no output drift.`)
} else {
  await fs.mkdir(path.join(directory, 'raw'), { recursive: true })
  for (const [filename, bytes] of snapshots) await fs.writeFile(path.join(directory, filename), bytes)
  for (const [filename, value] of artifacts) await fs.writeFile(path.join(directory, filename), stringify(value))
  console.log(`Collected ${records.length} Shanghai Library architecture entities (${summary.validSourceCoordinates} BD-09 reference points).`)
  console.log(JSON.stringify(summary, null, 2))
}
