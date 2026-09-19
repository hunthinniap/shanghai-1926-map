import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { parseWikipediaHeritageList } from './lib/wikipedia-heritage-list.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const directory = path.join(root, 'public/data/shanghai-excellent-historical-buildings/wikipedia')
const args = new Set(process.argv.slice(2))
if ([...args].some((arg) => !['--offline', '--check'].includes(arg))) {
  throw new Error('Usage: collect-shanghai-heritage-wikipedia-details.mjs [--offline | --check]')
}
const check = args.has('--check')
const offline = check || args.has('--offline')
const run = promisify(execFile)
const stringify = (value) => `${JSON.stringify(value, null, 2)}\n`
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const readJson = async (name) => JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'))
const chunks = (values, size = 40) => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size))
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

// Use the configured proxy without publishing its address, credentials, or port.
function configuredProxy() {
  for (const key of ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy']) {
    if (process.env[key]) return process.env[key]
  }
  if (process.platform !== 'darwin') return null
  try {
    const settings = execFileSync('scutil', ['--proxy'], { encoding: 'utf8' })
    for (const prefix of ['HTTPS', 'HTTP']) {
      if (!new RegExp(`${prefix}Enable\\s*:\\s*1`).test(settings)) continue
      const host = settings.match(new RegExp(`${prefix}Proxy\\s*:\\s*(\\S+)`))?.[1]
      const port = settings.match(new RegExp(`${prefix}Port\\s*:\\s*(\\d+)`))?.[1]
      if (host && port) return `http://${host}:${port}`
    }
  } catch { /* Direct access remains available outside macOS. */ }
  return null
}

const listSource = await readJson('list-source.json')
const listBytes = await fs.readFile(path.join(directory, listSource.localPath))
if (listBytes.length !== listSource.byteLength || sha256(listBytes) !== listSource.sha256) throw new Error('Wikipedia list snapshot checksum mismatch')
const list = parseWikipediaHeritageList(listBytes.toString('utf8'), listSource)
const titleSet = new Set()
function collectTitles(node) {
  for (const link of node.articleLinks ?? []) {
    if (link.role === 'original-name' && link.title) titleSet.add(link.title)
  }
  for (const component of node.components ?? []) collectTitles(component)
}
for (const record of list.records) collectTitles(record)
const titles = [...titleSet]
if (!titles.length) throw new Error('The Wikipedia list has no original-name article links')

let previous
try { previous = await readJson('detail-sources.json') } catch (error) {
  if (error.code !== 'ENOENT' || offline) throw error
}
const cachedSources = new Map((previous?.sources ?? []).map((source) => [source.id, source]))
const usedSources = new Set()
const proxy = offline ? null : configuredProxy()
let manifestQueue = Promise.resolve()
let nextRequestAt = 0
let requestQueue = Promise.resolve()
async function throttle() {
  requestQueue = requestQueue.then(async () => {
    await delay(Math.max(0, nextRequestAt - Date.now()))
    nextRequestAt = Date.now() + 7500
  })
  await requestQueue
}
function manifest() {
  return {
    schemaVersion: 1,
    listSource,
    requestedTitles: titles,
    requestPolicy: { maximumTitlesPerRequest: 40, maximumConcurrentRequests: 2, maximumAttempts: 3, minimumRequestIntervalMs: 7500 },
    sources: [...cachedSources.values()].sort((a, b) => a.id.localeCompare(b.id)),
  }
}
function saveManifest() {
  if (offline) return Promise.resolve()
  const text = stringify(manifest())
  manifestQueue = manifestQueue.then(async () => {
    const destination = path.join(directory, 'detail-sources.json')
    await fs.writeFile(`${destination}.tmp`, text)
    await fs.rename(`${destination}.tmp`, destination)
  })
  return manifestQueue
}

async function cachedResponse(source) {
  const bytes = await fs.readFile(path.join(directory, source.localPath))
  if (bytes.length !== source.byteLength || sha256(bytes) !== source.sha256) throw new Error(`API snapshot checksum mismatch: ${source.localPath}`)
  let data = null
  try { data = JSON.parse(bytes.toString('utf8')) } catch { /* Report the stored non-JSON response. */ }
  return { source, data }
}

// Store every attempted response, including API errors and non-JSON HTTP errors.
async function request(url, kind) {
  const existing = [...cachedSources.values()].filter((source) => source.requestedUrl === url)
    .sort((a, b) => Number(a.id.split('-').at(-1)) - Number(b.id.split('-').at(-1)))
  const successful = existing.findLast((source) => source.ok)
  if (successful || offline) {
    const chosen = successful ?? existing.at(-1)
    if (!chosen) throw new Error(`Missing cached API request: ${kind}; rerun online`)
    usedSources.add(chosen.id)
    return cachedResponse(chosen)
  }
  const requestKey = sha256(Buffer.from(url)).slice(0, 16)
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await throttle()
    const ordinal = existing.length + attempt
    const id = `${kind}-${requestKey}-${ordinal}`
    const marker = '\n__SHANGHAI_HERITAGE_HTTP__'
    const curlArgs = ['--silent', '--show-error', '--location', '--proto', '=https', '--proto-redir', '=https',
      '--connect-timeout', '20', '--max-time', '50', '--header', 'Accept: application/json',
      '--user-agent', 'ShanghaiHistoricalMapResearch/1.0 (local archival research)',
      '--write-out', `${marker}%{http_code}\t%{url_effective}\t%{content_type}`]
    if (proxy) curlArgs.push('--proxy', proxy)
    curlArgs.push(url)
    let stdout = Buffer.alloc(0)
    let transportError = null
    try {
      const response = await run('curl', curlArgs, { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 })
      stdout = response.stdout
    } catch (error) {
      stdout = Buffer.isBuffer(error.stdout) ? error.stdout : Buffer.from(error.stdout ?? '')
      transportError = { code: error.code ?? null, signal: error.signal ?? null }
    }
    const markerOffset = stdout.lastIndexOf(Buffer.from(marker))
    const bytes = markerOffset < 0 ? stdout : stdout.subarray(0, markerOffset)
    const [statusText, resolvedUrl, contentType] = markerOffset < 0 ? [] : stdout.subarray(markerOffset + Buffer.byteLength(marker)).toString('utf8').split('\t')
    const httpStatus = Number(statusText) || null
    let data = null
    try { data = JSON.parse(bytes.toString('utf8')) } catch { /* Kept as an explicit failed response. */ }
    const apiError = data?.error ?? (data?.errors ? { errors: data.errors } : null)
    const ok = !transportError && httpStatus >= 200 && httpStatus < 300 && data !== null && !apiError
    const source = { id, kind, requestedUrl: url, resolvedUrl: resolvedUrl || null,
      retrievedAt: new Date().toISOString(), localPath: `raw/details/${id}.${data === null ? 'txt' : 'json'}`,
      byteLength: bytes.length, sha256: sha256(bytes), httpStatus, contentType: contentType || null,
      ok, apiError, transportError, warnings: data?.warnings ?? null }
    await fs.mkdir(path.join(directory, 'raw/details'), { recursive: true })
    await fs.writeFile(path.join(directory, source.localPath), bytes)
    cachedSources.set(id, source)
    await saveManifest()
    if (ok || attempt === 3) {
      usedSources.add(id)
      if (!ok) console.error(`${kind} failed after ${attempt} attempts; HTTP ${httpStatus ?? 'unavailable'}, API ${apiError?.code ?? 'unavailable'}`)
      return { source, data }
    }
    await delay(httpStatus === 429 ? attempt * 30000 : attempt * 1500)
  }
}

async function parallelMap(values, fn) {
  const output = new Array(values.length)
  let cursor = 0
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++
      output[index] = await fn(values[index], index)
    }
  }
  await Promise.all([worker(), worker()])
  return output
}
function apiUrl(host, parameters) {
  const url = new URL(`https://${host}/w/api.php`)
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value)
  return url.href
}

const failures = []
const wikipediaChunks = chunks(titles)
console.log(`Collecting ${titles.length} unique original-name article titles in ${wikipediaChunks.length} Wikipedia API batches.`)
const wikipediaResults = await parallelMap(wikipediaChunks, async (requested, index) => {
  const responses = []
  let continuation = {}
  do {
    const url = apiUrl('zh.wikipedia.org', { action: 'query', format: 'json', formatversion: '2', redirects: '1',
      prop: 'coordinates|pageprops|info', inprop: 'url', coprop: 'type|name|dim|country|region', colimit: 'max',
      titles: requested.join('|'), ...continuation })
    const response = await request(url, 'wikipedia-query')
    responses.push(response)
    if (!response.source.ok || !response.data?.query?.pages) break
    continuation = response.data.continue
    if (responses.length > 100) throw new Error('Unexpectedly many Wikipedia API continuation requests')
  } while (continuation)
  console.log(`Wikipedia batch ${index + 1}/${wikipediaChunks.length}: ${requested.length} requested titles.`)
  return { requested, responses }
})

const articles = []
for (const { requested, responses } of wikipediaResults) {
  const pages = new Map()
  const mappings = new Map()
  const sourceRefs = responses.map(({ source }) => source.id)
  let failed = false
  for (const { source, data } of responses) {
    if (!source.ok || !Array.isArray(data?.query?.pages)) {
      failed = true
      failures.push({ stage: 'wikipedia', type: source.ok ? 'invalid-response-shape' : 'api-request-failed', requestedTitles: requested, sourceRef: source.id })
      continue
    }
    for (const kind of ['normalized', 'converted', 'redirects']) {
      for (const mapping of data.query[kind] ?? []) mappings.set(mapping.from, { kind, ...mapping })
    }
    for (const page of data.query.pages) {
      const existing = pages.get(page.title)
      pages.set(page.title, existing ? { ...existing, ...page, coordinates: [...(existing.coordinates ?? []), ...(page.coordinates ?? [])] } : page)
    }
  }
  for (const requestedTitle of requested) {
    let resolvedTitle = requestedTitle
    const titleMappings = []
    const visited = new Set()
    while (mappings.has(resolvedTitle) && !visited.has(resolvedTitle)) {
      visited.add(resolvedTitle)
      const mapping = mappings.get(resolvedTitle)
      titleMappings.push(mapping)
      resolvedTitle = mapping.to
    }
    const page = pages.get(resolvedTitle)
    const missing = !page || page.missing === true || page.invalid === true
    if (missing && !failed) failures.push({ stage: 'wikipedia', type: page?.invalid ? 'invalid-title' : 'missing-page', requestedTitle, resolvedTitle, sourceRefs })
    articles.push({ requestedTitle, resolvedTitle: page?.title ?? resolvedTitle, pageId: page?.pageid ?? null,
      revisionId: page?.lastrevid ?? null, url: page?.fullurl ?? null, wikidataId: page?.pageprops?.wikibase_item ?? null,
      titleMappings, missing, incomplete: failed, isDisambiguation: Object.hasOwn(page?.pageprops ?? {}, 'disambiguation'),
      wikipediaCoordinates: page?.coordinates ?? [], entity: null, sourceRefs: [...sourceRefs] })
  }
}

const entityIds = [...new Set(articles.map((article) => article.wikidataId).filter(Boolean))]
const wikidataChunks = chunks(entityIds)
console.log(`Collecting claims for ${entityIds.length} Wikidata entities in ${wikidataChunks.length} API batches.`)
const entityResults = await parallelMap(wikidataChunks, async (ids, index) => {
  const url = apiUrl('www.wikidata.org', { action: 'wbgetentities', format: 'json', ids: ids.join('|'),
    props: 'info|labels|claims', languages: 'zh|zh-hans|en', languagefallback: '1', redirects: 'yes' })
  const response = await request(url, 'wikidata-entities')
  console.log(`Wikidata batch ${index + 1}/${wikidataChunks.length}: ${ids.length} requested entities.`)
  return { ids, ...response }
})

function claimMetadata(claim) {
  return { statementId: claim.id ?? null, rank: claim.rank ?? null, snakType: claim.mainsnak?.snaktype ?? null,
    references: claim.references ?? [], qualifiers: claim.qualifiers ?? {} }
}
function entityDetails(entity) {
  const claims = entity.claims ?? {}
  const idClaims = (property) => (claims[property] ?? []).map((claim) => ({ ...claimMetadata(claim), id: claim.mainsnak?.datavalue?.value?.id ?? null }))
  const architectClaims = idClaims('P84')
  const styleClaims = idClaims('P149')
  const instanceOfClaims = idClaims('P31')
  return { id: entity.id, lastrevid: entity.lastrevid ?? null, labels: entity.labels ?? {},
    coordinateClaims: (claims.P625 ?? []).map((claim) => {
      const value = claim.mainsnak?.datavalue?.value
      return { ...claimMetadata(claim), lat: value?.latitude ?? null, lon: value?.longitude ?? null,
        precision: value?.precision ?? null, globe: value?.globe ?? null, altitude: value?.altitude ?? null,
        isEarthGlobe: /^https?:\/\/www\.wikidata\.org\/entity\/Q2$/u.test(value?.globe ?? '') }
    }),
    inceptionClaims: (claims.P571 ?? []).map((claim) => ({ ...claimMetadata(claim), ...(claim.mainsnak?.datavalue?.value ?? {}) })),
    architectIds: [...new Set(architectClaims.map((claim) => claim.id).filter(Boolean))], architectClaims,
    styleIds: [...new Set(styleClaims.map((claim) => claim.id).filter(Boolean))], styleClaims,
    instanceOfIds: [...new Set(instanceOfClaims.map((claim) => claim.id).filter(Boolean))], instanceOfClaims }
}
const entities = new Map()
for (const { ids, source, data } of entityResults) {
  if (!source.ok || !data?.entities || data.success !== 1) {
    failures.push({ stage: 'wikidata', type: source.ok ? 'invalid-response-shape' : 'api-request-failed', entityIds: ids, sourceRef: source.id })
    for (const id of ids) entities.set(id, { entity: null, sourceRef: source.id, incomplete: true })
    continue
  }
  for (const id of ids) {
    let entity = data.entities[id]
    if (entity?.redirects?.to) entity = data.entities[entity.redirects.to] ?? entity
    if (!entity || Object.hasOwn(entity, 'missing')) {
      failures.push({ stage: 'wikidata', type: 'missing-entity', entityId: id, sourceRef: source.id })
      entities.set(id, { entity: null, sourceRef: source.id, incomplete: true })
    } else entities.set(id, { entity: entityDetails(entity), sourceRef: source.id, incomplete: false })
  }
}
for (const article of articles) {
  if (!article.wikidataId) continue
  const result = entities.get(article.wikidataId)
  if (!result) throw new Error(`Unaccounted Wikidata entity: ${article.wikidataId}`)
  article.entity = result.entity
  article.sourceRefs = [...new Set([...article.sourceRefs, result.sourceRef])]
  if (result.incomplete) article.incomplete = true
}

const linkedIds = [...new Set(articles.flatMap((article) => article.entity
  ? [...article.entity.architectIds, ...article.entity.styleIds, ...article.entity.instanceOfIds] : []))].sort()
const linkedResults = await parallelMap(chunks(linkedIds), async (ids, index) => {
  const url = apiUrl('www.wikidata.org', { action: 'wbgetentities', format: 'json', ids: ids.join('|'),
    props: 'info|labels', languages: 'zh|zh-hans|en', languagefallback: '1', redirects: 'yes' })
  const response = await request(url, 'wikidata-labels')
  console.log(`Wikidata linked labels batch ${index + 1}/${Math.ceil(linkedIds.length / 40)}: ${ids.length} requested entities.`)
  return { ids, ...response }
})
const linkedRecords = []
const linkedFailures = []
for (const { ids, source, data } of linkedResults) {
  const failed = !source.ok || !data?.entities || data.success !== 1
  if (failed) linkedFailures.push({ stage: 'wikidata-labels', type: source.ok ? 'invalid-response-shape' : 'api-request-failed', entityIds: ids, sourceRef: source.id })
  for (const requestedId of ids) {
    let entity = data?.entities?.[requestedId]
    if (entity?.redirects?.to) entity = data.entities[entity.redirects.to] ?? entity
    const missing = !entity || Object.hasOwn(entity, 'missing')
    if (missing && !failed) linkedFailures.push({ stage: 'wikidata-labels', type: 'missing-entity', entityId: requestedId, sourceRef: source.id })
    linkedRecords.push({ requestedId, id: entity?.id ?? null, lastrevid: entity?.lastrevid ?? null,
      labels: entity?.labels ?? {}, missing, incomplete: failed, sourceRefs: [source.id] })
  }
}
failures.push(...linkedFailures)
const linkedOutput = { schemaVersion: 1, entityCount: linkedRecords.length, records: linkedRecords,
  failures: linkedFailures, properties: { P84: 'architect', P149: 'architectural style', P31: 'instance of' },
  sourceManifest: 'detail-sources.json' }
const usableEarthCoordinate = (claim) => claim.isEarthGlobe && Number.isFinite(claim.lat) && Number.isFinite(claim.lon)

const output = {
  schemaVersion: 1, articleCount: articles.length,
  availableArticleCount: articles.filter((article) => !article.missing).length,
  wikidataEntityCount: entityIds.length,
  linkedEntityLabelsFile: 'linked-entity-labels.json',
  linkedEntityCount: linkedIds.length,
  coordinateCoverage: {
    wikipediaArticles: articles.filter((article) => article.wikipediaCoordinates.length).length,
    wikidataArticles: articles.filter((article) => article.entity?.coordinateClaims.some(usableEarthCoordinate)).length,
    articlesWithEitherSource: articles.filter((article) => article.wikipediaCoordinates.length || article.entity?.coordinateClaims.some(usableEarthCoordinate)).length,
  },
  listSource, records: articles, failures,
  methodology: {
    selection: '仅采集维基名单中original-name角色链接及其部件链接的去重标题；不从listed-name现使用单位链接补建筑坐标。',
    wikipedia: 'Action API query，40标题以内分批，保留normalized/converted/redirects和页面版本号，coordinates为所链接词条提供的位置。',
    wikidata: '依据维基页面wikibase_item获取P625坐标、P571 inception、P84建筑设计者、P149建筑风格、P31实体类型，保留声明rank、references及qualifiers。',
    locationMeaning: '坐标是所链接词条或Wikidata实体的位置候选；可能代表建筑群、机构、街区或重定向目标，未经独立核定为某一历史楼栋的精确位置。Wikidata坐标保留全部声明，isEarthGlobe仅标记地球Q2，非地球坐标不计入可用覆盖。',
    dateMeaning: 'P571为实体inception，可能指机构成立或其他起始时间；不自动解释为建筑建成年份。',
    rawSources: '所有API响应原字节存于raw/details/，detail-sources.json保存请求URL、获取时间、SHA-256和字节数；网络/API错误单列，不以缺省值伪装成功。',
    cachedSources: '默认复用成功缓存；--offline不联网重建；--check不联网且逐字核验产物。',
    licenses: { wikipedia: 'https://creativecommons.org/licenses/by-sa/4.0/', wikidata: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  },
}

// Verify every retained response, even older failed attempts, before declaring the cache complete.
for (const source of cachedSources.values()) await cachedResponse(source)
if (new Set(articles.map((article) => article.requestedTitle)).size !== titles.length || articles.length !== titles.length) throw new Error('Article title accounting failed')
for (const article of articles) for (const id of article.sourceRefs) if (!cachedSources.has(id)) throw new Error(`Unknown source reference: ${id}`)
if (check) {
  if (await fs.readFile(path.join(directory, 'article-details.json'), 'utf8') !== stringify(output)) throw new Error('Generated output drift: article-details.json')
  if (await fs.readFile(path.join(directory, 'detail-sources.json'), 'utf8') !== stringify(manifest())) throw new Error('Generated output drift: detail-sources.json')
  if (await fs.readFile(path.join(directory, 'linked-entity-labels.json'), 'utf8') !== stringify(linkedOutput)) throw new Error('Generated output drift: linked-entity-labels.json')
} else {
  await fs.writeFile(path.join(directory, 'article-details.json'), stringify(output))
  await fs.writeFile(path.join(directory, 'linked-entity-labels.json'), stringify(linkedOutput))
  if (offline) await fs.writeFile(path.join(directory, 'detail-sources.json'), stringify(manifest()))
  else await saveManifest()
}
console.log(JSON.stringify({ articleCount: output.articleCount, availableArticleCount: output.availableArticleCount,
  wikidataEntityCount: output.wikidataEntityCount, coordinateCoverage: output.coordinateCoverage, failures: failures.length,
  activeApiResponses: usedSources.size, cachedApiResponses: cachedSources.size, checked: check }, null, 2))
if (failures.some((failure) => ['api-request-failed', 'invalid-response-shape'].includes(failure.type))) process.exitCode = 1
