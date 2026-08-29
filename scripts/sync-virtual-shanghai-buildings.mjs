import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as shapefile from 'shapefile'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDbfPath = path.join(projectRoot, '.cache', 'historical-source', 'buildings', 'Buildings.dbf')
const sourceShpPath = path.join(projectRoot, '.cache', 'historical-source', 'buildings', 'Buildings.shp')
const outputPath = path.join(projectRoot, 'scripts', 'data', 'virtual-shanghai-buildings-live.json')
const coordinateOverridesPath = path.join(
  projectRoot,
  'scripts',
  'data',
  'virtual-shanghai-building-coordinate-overrides.json',
)
const baseUrl = 'https://www.virtualshanghai.net/%E6%95%B8%E6%93%9A/%E5%BB%BA%E7%AF%89'
const expectedSourceCount = 1803
const expectedShapefileCount = 1790
const detailConcurrency = positiveInteger(process.env.VS_CONCURRENCY, 3)
const retries = positiveInteger(process.env.VS_RETRIES, 7)
const detailTimeoutMs = positiveInteger(process.env.VS_DETAIL_TIMEOUT_MS, 45_000)
const directoryTimeoutMs = positiveInteger(process.env.VS_DIRECTORY_TIMEOUT_MS, 120_000)

const requestHeaders = {
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  'user-agent': 'Shanghai-1928-map data synchronizer/1.0 (+https://github.com/hunthinniap/shanghai-1926-map)',
}

function positiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function decodeHtml(value) {
  const named = {
    amp: '&', apos: "'", gt: '>', hellip: '…', laquo: '«', lt: '<', nbsp: ' ',
    ndash: '–', mdash: '—', quot: '"', raquo: '»',
  }
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (entity, key) => {
    if (key[0] === '#') {
      const hexadecimal = key[1]?.toLowerCase() === 'x'
      const codePoint = Number.parseInt(key.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity
    }
    return named[key.toLowerCase()] ?? entity
  })
}

function htmlText(value) {
  return decodeHtml(String(value ?? ''))
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '')
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\n[\t ]+/g, '\n')
    .replace(/[\t ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function nullableText(value) {
  const cleaned = value === null || value === undefined ? '' : String(value).replace(/\u0000/g, '').trim()
  return cleaned || null
}

function nullableNumber(value, { zeroIsNull = false } = {}) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || (zeroIsNull && numeric === 0)) return null
  return numeric
}

function emptyTypes() {
  return Object.fromEntries(Array.from({ length: 11 }, (_, index) => [
    `TYP${String(index + 1).padStart(2, '0')}`,
    null,
  ]))
}

function extractCookie(response) {
  return (response.headers.get('set-cookie') ?? '')
    .split(/,(?=\s*[^;,=]+=[^;,]+)/)
    .map((cookie) => cookie.split(';', 1)[0]?.trim())
    .filter(Boolean)
    .join('; ')
}

async function fetchHtml(url, {
  cookie = '', maxAttempts = retries, timeoutMs = detailTimeoutMs, validate = () => true, label = url,
} = {}) {
  let lastError
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        headers: cookie ? { ...requestHeaders, cookie } : requestHeaders,
        redirect: 'follow',
        signal: controller.signal,
      })
      const html = await response.text()
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      if (!validate(html)) throw new Error(`Unexpected HTML (${html.length} characters)`)
      return { html, response, attempts: attempt }
    } catch (error) {
      lastError = error
      if (attempt === maxAttempts) break
      await sleep(Math.min(30_000, 1_000 * (2 ** (attempt - 1))) + Math.floor(Math.random() * 750))
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error(`${label} failed after ${maxAttempts} attempts: ${errorMessage(lastError)}`)
}

function directoryCount(html) {
  const match = html.match(/\b(\d+)\s+(?:results|documents)\b/i)
  return match ? Number(match[1]) : null
}

function pageCount(html) {
  const slashPages = html.match(/\(\s*\d+\s*\/\s*(\d+)\s+pages?\s*\)/i)
  if (slashPages) return Number(slashPages[1])
  const pageNumbers = [...html.matchAll(/[?&]pn=(\d+)/gi)].map((match) => Number(match[1]))
  return pageNumbers.length ? Math.max(...pageNumbers) : 1
}

function parseDirectoryRecords(html) {
  const rowPattern = /<td\b[^>]*>\s*(\d+)\s*<\/td>\s*<td\b[^>]*>\s*<a\b[^>]*href\s*=\s*["']\?ID=(\d+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/td>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<td\b[^>]*>([\s\S]*?)<\/td>/gi
  return [...html.matchAll(rowPattern)].map((match) => {
    const columnId = Number(match[1])
    const linkId = Number(match[2])
    if (columnId !== linkId) throw new Error(`Directory row ID mismatch: ${columnId} versus ${linkId}`)
    return {
      id: columnId,
      name: nullableText(htmlText(match[3])),
      nameZh: nullableText(htmlText(match[4])),
      type01: nullableText(htmlText(match[5])),
      address: nullableText(htmlText(match[6])),
    }
  })
}

async function fetchDirectory() {
  const landing = await fetchHtml(baseUrl, {
    timeoutMs: directoryTimeoutMs,
    validate: (html) => directoryCount(html) !== null,
    label: 'building directory landing page',
  })
  const cookie = extractCookie(landing.response)
  if (directoryCount(landing.html) !== expectedSourceCount) {
    throw new Error(`Virtual Shanghai reports ${directoryCount(landing.html)} buildings; expected ${expectedSourceCount}`)
  }

  const preferred = positiveInteger(process.env.VS_DIRECTORY_PAGE_SIZE, 1200)
  const fallback = positiveInteger(process.env.VS_DIRECTORY_FALLBACK_PAGE_SIZE, 300)
  for (const pageSize of [...new Set([preferred, fallback])]) {
    try {
      const first = await fetchHtml(`${baseUrl}?rp=${pageSize}`, {
        cookie,
        maxAttempts: pageSize >= 1000 ? 2 : retries,
        timeoutMs: directoryTimeoutMs,
        validate: (html) => directoryCount(html) === expectedSourceCount && parseDirectoryRecords(html).length > 0,
        label: `directory page 1 at ${pageSize}/page`,
      })
      const pageCookie = extractCookie(first.response) || cookie
      const totalPages = pageCount(first.html)
      const liveRecords = parseDirectoryRecords(first.html)
      for (let page = 2; page <= totalPages; page += 1) {
        const result = await fetchHtml(`${baseUrl}?pn=${page}`, {
          cookie: pageCookie,
          timeoutMs: directoryTimeoutMs,
          validate: (html) => directoryCount(html) === expectedSourceCount && parseDirectoryRecords(html).length > 0,
          label: `directory page ${page}/${totalPages}`,
        })
        liveRecords.push(...parseDirectoryRecords(result.html))
      }
      const byId = new Map(liveRecords.map((record) => [record.id, record]))
      if (byId.size !== expectedSourceCount || liveRecords.length !== expectedSourceCount) {
        throw new Error(`Directory yielded ${liveRecords.length} rows / ${byId.size} unique IDs; expected ${expectedSourceCount}`)
      }
      return { records: byId, pageSize, pageCount: totalPages }
    } catch (error) {
      if (pageSize === fallback) throw error
      console.warn(`Large directory pages failed; retrying at ${fallback}/page: ${errorMessage(error)}`)
    }
  }
  throw new Error('Unable to load the Virtual Shanghai building directory')
}

async function readShapefileRecords() {
  const reader = await shapefile.open(sourceShpPath, sourceDbfPath, { encoding: 'utf-8' })
  const records = new Map()
  while (true) {
    const next = await reader.read()
    if (next.done) break
    const properties = next.value.properties ?? {}
    const id = nullableNumber(properties.IDBAT)
    if (!Number.isInteger(id)) throw new Error(`Invalid shapefile IDBAT: ${properties.IDBAT}`)
    if (records.has(id)) throw new Error(`Duplicate shapefile IDBAT: ${id}`)
    records.set(id, {
      id,
      name: nullableText(properties.NAME),
      nameZh: nullableText(properties.CHINESE),
      address: nullableText(properties.F_ADDRESS),
      startYear: nullableNumber(properties.START, { zeroIsNull: true }),
      endYear: nullableNumber(properties.END_, { zeroIsNull: true }),
      note: null,
      types: Object.fromEntries(Object.keys(emptyTypes()).map((key) => [key, nullableText(properties[key])])),
      x: nullableNumber(properties.XC),
      y: nullableNumber(properties.YC),
      sourceUrl: `${baseUrl}?ID=${id}`,
      provenance: 'shapefile+live-list',
    })
  }
  if (records.size !== expectedShapefileCount) {
    throw new Error(`Local shapefile contains ${records.size} unique records; expected ${expectedShapefileCount}`)
  }
  return records
}

function detailCells(html) {
  const cells = new Map()
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const columns = [...row[1].matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)]
    if (columns.length < 2) continue
    const label = htmlText(columns[0][2])
    const value = htmlText(columns[1][2])
    const classMatch = columns[1][1].match(/class\s*=\s*["']([^"']+)["']/i)
    const fieldClass = (classMatch?.[1] ?? '').split(/\s+/).find((name) => name !== 'defaultDocTableContent')
    if (fieldClass) cells.set(fieldClass, value)
    if (label) cells.set(`label:${label.toLowerCase()}`, value)
  }
  return cells
}

function firstCell(cells, ...keys) {
  for (const key of keys) if (cells.has(key)) return cells.get(key)
  return ''
}

function parseDetail(html, expectedId) {
  if (!/id=["']sdDocNode["']/i.test(html)) throw new Error('Detail container is missing')
  const cells = detailCells(html)
  const id = nullableNumber(firstCell(cells, 'batID', 'IDBAT', 'label:building id'))
  if (!Number.isInteger(id) || id !== expectedId) {
    throw new Error(`Detail ID ${id ?? 'missing'} does not match requested ID ${expectedId}`)
  }
  return {
    id,
    name: nullableText(firstCell(cells, 'Name', 'NAME', 'label:english name')),
    nameZh: nullableText(firstCell(cells, 'Chinese', 'CHINESE', 'label:chinese name')),
    address: nullableText(firstCell(cells, 'Address', 'F_ADDRESS', 'label:address')),
    startYear: nullableNumber(firstCell(cells, 'START', 'label:date construction'), { zeroIsNull: true }),
    endYear: nullableNumber(firstCell(cells, 'END', 'END_', 'label:date end'), { zeroIsNull: true }),
    note: nullableText(firstCell(cells, 'Note', 'Notes', 'NOTE', 'label:notes')),
    types: Object.fromEntries(Object.keys(emptyTypes()).map((key) => [
      key,
      nullableText(firstCell(cells, key, `label:${key.toLowerCase()}`)),
    ])),
    x: nullableNumber(firstCell(cells, 'X', 'XC', 'label:pos x')),
    y: nullableNumber(firstCell(cells, 'Y', 'YC', 'label:pos y')),
    sourceUrl: `${baseUrl}?ID=${id}`,
    provenance: 'live-detail',
  }
}

async function reusableLiveDetails(validIds) {
  try {
    const parsed = JSON.parse(await fs.readFile(outputPath, 'utf8'))
    return new Map((Array.isArray(parsed.records) ? parsed.records : [])
      .filter((record) => validIds.has(record.id) && record.provenance === 'live-detail')
      .map((record) => [record.id, record]))
  } catch (error) {
    if (error?.code !== 'ENOENT') console.warn(`Ignoring unreadable checkpoint: ${errorMessage(error)}`)
    return new Map()
  }
}

async function loadCoordinateOverrides() {
  const rows = JSON.parse(await fs.readFile(coordinateOverridesPath, 'utf8'))
  if (!Array.isArray(rows)) throw new Error('Building coordinate overrides must be an array')
  const overrides = new Map()
  for (const row of rows) {
    if (!Number.isInteger(row.id) || !Number.isFinite(row.x) || !Number.isFinite(row.y)) {
      throw new Error(`Invalid building coordinate override: ${JSON.stringify(row)}`)
    }
    if (overrides.has(row.id)) throw new Error(`Duplicate building coordinate override: ${row.id}`)
    overrides.set(row.id, row)
  }
  return overrides
}

function applyCoordinateOverrides(records, overrides) {
  for (const [id, record] of records) {
    if (Number.isFinite(record.x) && Number.isFinite(record.y)) continue
    const override = overrides.get(id)
    if (!override) continue
    records.set(id, {
      ...record,
      x: override.x,
      y: override.y,
      coordinateOverride: {
        method: override.method,
        sourceUrl: override.sourceUrl,
        note: override.note,
      },
    })
  }
}

async function writeOutput({ directory, records, errors, complete }) {
  const payload = {
    fetchedAt: new Date().toISOString(),
    sourceCount: expectedSourceCount,
    records: [...records.values()].sort((left, right) => left.id - right.id),
    errors: [...errors.values()].sort((left, right) => left.id - right.id),
    complete,
    sourceUrl: baseUrl,
    sync: {
      directoryPageSize: directory.pageSize,
      directoryPageCount: directory.pageCount,
      shapefileCount: expectedShapefileCount,
      liveDetailCount: [...records.values()].filter((record) => record.provenance === 'live-detail').length,
      coordinateOverrideCount: [...records.values()].filter((record) => record.coordinateOverride).length,
    },
  }
  const temporaryPath = `${outputPath}.tmp`
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  await fs.rename(temporaryPath, outputPath)
}

async function main() {
  const startedAt = Date.now()
  const [directory, shapefileRecords, coordinateOverrides] = await Promise.all([
    fetchDirectory(),
    readShapefileRecords(),
    loadCoordinateOverrides(),
  ])
  const liveIds = new Set(directory.records.keys())
  const cachedDetails = await reusableLiveDetails(liveIds)
  const records = new Map()
  for (const [id, live] of directory.records) {
    const local = shapefileRecords.get(id)
    if (!local) continue
    records.set(id, {
      ...local,
      name: live.name,
      nameZh: live.nameZh,
      address: live.address,
      types: { ...local.types, TYP01: live.type01 },
    })
  }

  const newIds = [...liveIds].filter((id) => !shapefileRecords.has(id)).sort((a, b) => a - b)
  for (const id of newIds) if (cachedDetails.has(id)) records.set(id, cachedDetails.get(id))
  applyCoordinateOverrides(records, coordinateOverrides)
  const pendingIds = newIds.filter((id) => !records.has(id))
  const errors = new Map()
  await writeOutput({ directory, records, errors, complete: false })
  console.log(`Directory: ${liveIds.size}; shapefile overlap: ${records.size}; live-only IDs: ${newIds.length}`)
  console.log(`Checkpoint: ${newIds.length - pendingIds.length}/${newIds.length} live details reusable`)

  let nextIndex = 0
  async function worker() {
    while (true) {
      const index = nextIndex
      nextIndex += 1
      if (index >= pendingIds.length) return
      const id = pendingIds[index]
      try {
        const detail = await fetchHtml(`${baseUrl}?ID=${id}`, {
          validate: (html) => /id=["']sdDocNode["']/i.test(html),
          label: `building ${id}`,
        })
        records.set(id, parseDetail(detail.html, id))
        errors.delete(id)
      } catch (error) {
        errors.set(id, {
          id,
          sourceUrl: `${baseUrl}?ID=${id}`,
          message: errorMessage(error),
          lastAttemptAt: new Date().toISOString(),
        })
      }
      await writeOutput({ directory, records, errors, complete: false })
      console.log(`Live details: ${newIds.length - pendingIds.length + index + 1}/${newIds.length}; errors ${errors.size}`)
      await sleep(250 + Math.floor(Math.random() * 350))
    }
  }
  await Promise.all(Array.from({ length: Math.min(detailConcurrency, pendingIds.length || 1) }, () => worker()))
  applyCoordinateOverrides(records, coordinateOverrides)

  const recordIds = [...records.keys()]
  if (recordIds.length !== new Set(recordIds).size) throw new Error('Duplicate building IDs in final records')
  if (recordIds.some((id) => !liveIds.has(id))) throw new Error('Final records contain IDs absent from the live directory')
  const missingCoordinates = [...records.values()].filter((record) =>
    !Number.isFinite(record.x) || !Number.isFinite(record.y))
  if (missingCoordinates.length) {
    throw new Error(`Missing coordinates for ${missingCoordinates.map((record) => record.id).join(', ')}`)
  }
  if (records.size !== expectedSourceCount || errors.size > 0) {
    await writeOutput({ directory, records, errors, complete: false })
    throw new Error(`Incomplete sync: ${records.size}/${expectedSourceCount} records, ${errors.size} errors; re-run to resume`)
  }
  await writeOutput({ directory, records, errors, complete: true })
  console.log(`Synced ${records.size} unique records in ${Math.round((Date.now() - startedAt) / 1000)}s -> ${path.relative(projectRoot, outputPath)}`)
}

await main()
