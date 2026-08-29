import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import AdmZip from 'adm-zip'
import * as shapefile from 'shapefile'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const curatedParksPath = path.join(projectRoot, 'public', 'data', 'curated-parks.geojson')
const cacheRoot = path.join(projectRoot, '.cache', 'historical-source', 'buildings')
const zipPath = path.join(projectRoot, '.cache', 'historical-source', 'buildings.zip')
const shapePath = path.join(cacheRoot, 'Buildings.shp')
const dbfPath = path.join(cacheRoot, 'Buildings.dbf')
const downloadUrl = 'https://www.virtualshanghai.net/Asset/Source/dbData_ID-204_No-01.zip'
const detailBase = 'https://www.virtualshanghai.net/数据/建筑'

function text(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\u0000/g, '').trim()
}

function field(properties, ...names) {
  const entries = Object.entries(properties ?? {})
  for (const name of names) {
    const found = entries.find(([key]) => key.toLowerCase() === name.toLowerCase())
    if (found) return text(found[1])
  }
  return ''
}

function repairDisplayText(value) {
  let clean = text(value)
    .replace(/Fran[�?]aise/g, 'Française')
    .replace(/Fran[�?]ais/g, 'Français')
    .replace(/Coll[�]ge/g, 'Collège')
    .replace(/Universit[�]/g, 'Université')
    .replace(/H[�]pital/g, 'Hôpital')
    .replace(/Soci[�]t[�]/g, 'Société')
    .replace(/Th[�][�]tre/g, 'Théâtre')

  if (clean.includes('�')) {
    const beforeParenthesis = clean.split('(')[0].trim()
    const parenthetical = [...clean.matchAll(/\(([^)]+)\)/g)]
      .map((match) => match[1].trim())
      .find((part) => part && !/[�?]/.test(part))
    clean = !/[�?]/.test(beforeParenthesis) && beforeParenthesis ? beforeParenthesis : parenthetical ?? ''
  }
  return clean
}

const lowercaseWords = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'of', 'the', 'and'])
const romanNumerals = new Set(['ii', 'iii', 'iv', 'vi', 'vii', 'viii', 'ix', 'xi', 'xii'])

function canonicalName(value) {
  const clean = text(value).replace(/\s+/g, ' ')
  if (!clean) return ''
  if (/[^\u0000-\u024f]/.test(clean)) return clean
  if (/[a-z]/.test(clean) && /[A-Z]/.test(clean)) return clean
  return clean
    .toLocaleLowerCase('en')
    .split(' ')
    .map((word, index) => {
      if (romanNumerals.has(word)) return word.toUpperCase()
      if (index > 0 && lowercaseWords.has(word)) return word
      return word
        .split(/([-’'])/)
        .map((part) => /[-’']/.test(part) || !part
          ? part
          : `${part[0].toLocaleUpperCase()}${part.slice(1)}`)
        .join('')
    })
    .join(' ')
}

function slug(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72)
}

async function ensureSourceFiles() {
  try {
    await Promise.all([fs.access(shapePath), fs.access(dbfPath)])
  } catch {
    await fs.mkdir(cacheRoot, { recursive: true })
    const response = await fetch(downloadUrl)
    if (!response.ok) throw new Error(`Unable to download ${downloadUrl}: ${response.status}`)
    await fs.writeFile(zipPath, Buffer.from(await response.arrayBuffer()))
    new AdmZip(zipPath).extractAllTo(cacheRoot, true)
  }
}

await ensureSourceFiles()
const reader = await shapefile.open(shapePath, dbfPath, { encoding: 'utf-8' })
const linksByFeatureId = new Map()
const linksByGroupId = new Map()
let sourceIndex = 0
while (true) {
  const next = await reader.read()
  if (next.done) break
  const properties = next.value.properties ?? {}
  const historicalName = canonicalName(repairDisplayText(field(properties, 'NAME', 'F_NAME')))
  const modernNameZh = field(properties, 'CHINESE', 'C_NAME')
  const buildingId = field(properties, 'IDBAT')
  if (historicalName && modernNameZh && buildingId) {
    const groupId = `landmark-${slug(`${historicalName}-${modernNameZh}`)}`
    const url = `${detailBase}?ID=${encodeURIComponent(buildingId)}`
    linksByFeatureId.set(`${groupId}-${sourceIndex}`, url)
    if (!linksByGroupId.has(groupId)) linksByGroupId.set(groupId, url)
  }
  sourceIndex += 1
}

const [collection, curatedParks] = await Promise.all([
  fs.readFile(dataPath, 'utf8').then(JSON.parse),
  fs.readFile(curatedParksPath, 'utf8').then(JSON.parse),
])
const curatedLinkOverrides = new Map([
  ['park-kunshan-park', `${detailBase}?ID=1645`],
])
let linked = 0
const missing = []
function applyLinks(feature) {
  const properties = feature.properties ?? {}
  // Yu Garden is documented by the 1928 map but has no matching record in the
  // downloaded Virtual Shanghai building table. Do not cite the table broadly.
  if (properties.id === 'park-yu-garden') {
    const sourceUrls = { ...(properties.sourceUrls ?? {}) }
    delete sourceUrls['vs-buildings']
    const cleanedProperties = {
      ...properties,
      sourceIds: properties.sourceIds.filter((sourceId) => sourceId !== 'vs-buildings'),
    }
    if (Object.keys(sourceUrls).length) cleanedProperties.sourceUrls = sourceUrls
    else delete cleanedProperties.sourceUrls
    return { ...feature, properties: cleanedProperties }
  }
  if (properties.kind !== 'landmark' || !properties.sourceIds?.includes('vs-buildings')) return feature
  const existingUrl = properties.sourceUrls?.['vs-buildings']
  if (/^https:\/\/www\.virtualshanghai\.net\/数据\/建筑\?ID=\d+$/u.test(existingUrl ?? '')) {
    linked += 1
    return feature
  }
  const url = curatedLinkOverrides.get(properties.id) ??
    linksByFeatureId.get(properties.id) ??
    linksByGroupId.get(properties.featureGroupId)
  if (!url) {
    missing.push(properties.id)
    return feature
  }
  linked += 1
  return {
    ...feature,
    properties: {
      ...properties,
      sourceUrls: {
        ...(properties.sourceUrls ?? {}),
        'vs-buildings': url,
      },
    },
  }
}
collection.features = collection.features.map(applyLinks)
curatedParks.features = curatedParks.features.map(applyLinks)

if (missing.length) {
  throw new Error(`No Virtual Shanghai detail link for: ${missing.join(', ')}`)
}
await Promise.all([
  fs.writeFile(dataPath, `${JSON.stringify(collection)}\n`, 'utf8'),
  fs.writeFile(curatedParksPath, `${JSON.stringify(curatedParks, null, 2)}\n`, 'utf8'),
])
console.log(`Added record-specific Virtual Shanghai links to ${linked} building features.`)
