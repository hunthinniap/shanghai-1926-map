/**
 * Conservatively groups Virtual Shanghai building records into physical sites.
 *
 * This module deliberately has no filesystem or network dependencies. It accepts
 * either GeoJSON Features (the live shapefile shape) or plain record objects and
 * returns serialisable data while retaining every source record.
 */

const GENERIC_NAMES = new Set([
  'academy',
  'bank',
  'building',
  'cemetery',
  'chapel',
  'church',
  'club',
  'college',
  'consulate',
  'factory',
  'garden',
  'godown',
  'hall',
  'hospital',
  'hotel',
  'house',
  'market',
  'mosque',
  'office',
  'orphanage',
  'park',
  'residence',
  'school',
  'shop',
  'station',
  'temple',
  'theatre',
  'university',
  'villa',
  'warehouse',
  'wharf',
  '寺廟',
  '寺庙',
  '學校',
  '学校',
  '銀行',
  '银行',
  '醫院',
  '医院',
])

const ADDRESS_TOKEN_EXPANSIONS = new Map([
  ['AV', 'AVENUE'],
  ['AVE', 'AVENUE'],
  ['BD', 'BOULEVARD'],
  ['BLVD', 'BOULEVARD'],
  ['RD', 'ROAD'],
  ['RTE', 'ROUTE'],
  ['ST', 'STREET'],
])

function text(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\u0000/g, '').trim()
}

function latinFold(value) {
  return text(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizedWords(value) {
  return latinFold(value)
    .toLocaleUpperCase('en')
    .replace(/[’‘`´]/g, "'")
    .replace(/&/g, ' AND ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalises common address punctuation and puts an explicit street number into
 * a stable key. It does not translate historical road names.
 */
export function normalizeBuildingAddress(value) {
  const raw = text(value)
  let words = latinFold(raw)
    .toLocaleUpperCase('en')
    .replace(/[’‘`´]/g, "'")
    .replace(/\b(?:NO|N)\s*[.º°]?\s*(?=\d)/g, '')
    .replace(/[號号]/g, ' ')
    .replace(/[^\p{L}\p{N}-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  words = words
    .split(' ')
    .map((word) => ADDRESS_TOKEN_EXPANSIONS.get(word) ?? word)
    .join(' ')

  // A live record uses street addresses, so the first 1-5 digit token is the
  // house number. Longer numbers are intentionally not treated as street nos.
  const numberMatch = words.match(/(?:^|\s)(\d{1,5}(?:[A-Z]|-\d{1,5})?)(?=\s|$)/)
  const streetNumber = numberMatch?.[1] ?? ''
  const street = streetNumber
    ? words.replace(numberMatch[0], numberMatch[0].startsWith(' ') ? ' ' : '').replace(/\s+/g, ' ').trim()
    : words
  const normalized = streetNumber ? `${street}|${streetNumber}` : street

  return {
    raw,
    normalized,
    street,
    streetNumber: streetNumber || null,
    hasStreetNumber: Boolean(streetNumber),
  }
}

export function normalizeBuildingName(value) {
  return normalizedWords(value)
}

function property(record, keys) {
  const properties = record?.properties ?? {}
  for (const key of keys) {
    if (properties[key] !== null && properties[key] !== undefined && text(properties[key])) {
      return properties[key]
    }
    if (record?.[key] !== null && record?.[key] !== undefined && text(record[key])) {
      return record[key]
    }
  }
  return null
}

function numericProperty(record, keys) {
  const value = property(record, keys)
  if (value === null || value === undefined || text(value) === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function recordCoordinate(record) {
  const propertyX = numericProperty(record, ['XC', 'x', 'longitude', 'lng', 'lon'])
  const propertyY = numericProperty(record, ['YC', 'y', 'latitude', 'lat'])
  if (propertyX !== null && propertyY !== null) return [propertyX, propertyY]

  const coordinate = record?.geometry?.type === 'Point'
    ? record.geometry.coordinates
    : record?.coordinate ?? record?.coordinates
  if (!Array.isArray(coordinate) || coordinate.length < 2) return null
  const x = Number(coordinate[0])
  const y = Number(coordinate[1])
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null
}

function distanceMetres(left, right) {
  if (!left || !right) return null
  const geographic = Math.abs(left[0]) <= 180 && Math.abs(right[0]) <= 180 &&
    Math.abs(left[1]) <= 90 && Math.abs(right[1]) <= 90
  if (!geographic) return Math.hypot(left[0] - right[0], left[1] - right[1])

  const radians = (degrees) => degrees * Math.PI / 180
  const latitudeDelta = radians(right[1] - left[1])
  const longitudeDelta = radians(right[0] - left[0])
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(left[1])) * Math.cos(radians(right[1])) * Math.sin(longitudeDelta / 2) ** 2
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function levenshtein(left, right) {
  if (left === right) return 0
  if (!left.length) return right.length
  if (!right.length) return left.length
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const current = [leftIndex + 1]
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      current.push(Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + (left[leftIndex] === right[rightIndex] ? 0 : 1),
      ))
    }
    previous = current
  }
  return previous[right.length]
}

function compactName(value) {
  return normalizedWords(value).replace(/\s+/g, '')
}

export function buildingNamesAreVariants(left, right) {
  const a = compactName(left)
  const b = compactName(right)
  if (!a || !b) return false
  if (a === b) return true
  const shorter = Math.min(a.length, b.length)
  if (shorter < 6 || Math.abs(a.length - b.length) > 2) return false
  return levenshtein(a, b) <= Math.max(1, Math.floor(shorter * 0.1))
}

function sourceId(record, index) {
  const value = property(record, ['IDBAT', 'recordId', 'id', 'OBJECTID', 'objectId'])
  return value ?? `source-index:${index}`
}

function stableId(value) {
  const valueText = text(value)
  return /^\d+$/.test(valueText) ? valueText.padStart(12, '0') : valueText
}

function recordTypes(record) {
  const directTypes = record?.types ?? record?.properties?.types
  if (Array.isArray(directTypes)) return directTypes.map(text).filter(Boolean)
  const values = []
  for (let index = 1; index <= 11; index += 1) {
    const value = property(record, [`TYP${String(index).padStart(2, '0')}`])
    if (value) values.push(text(value))
  }
  return values
}

function year(record, keys) {
  const value = numericProperty(record, keys)
  return value && value > 0 ? value : null
}

function isGenericName(name) {
  return GENERIC_NAMES.has(normalizedWords(name).toLocaleLowerCase('en'))
}

function specificityScore(prepared) {
  const normalized = normalizedWords(prepared.name)
  const tokens = normalized ? normalized.split(' ').length : 0
  let score = Math.min(normalized.length, 80) + tokens * 8
  if (prepared.nameZh) score += Math.min(Array.from(prepared.nameZh).length, 24)
  if (prepared.types.length) score += Math.min(prepared.types.length, 5)
  if (prepared.startYear) score += 2
  if (prepared.generic) score -= 200
  return score
}

function prepareRecord(record, index) {
  const name = text(property(record, ['NAME', 'historicalName', 'name', 'label']))
  const nameZh = text(property(record, ['CHINESE', 'historicalNameZh', 'nameZh', 'chineseName']))
  const address = normalizeBuildingAddress(property(record, ['F_ADDRESS', 'address', 'historicalAddress']))
  const prepared = {
    index,
    recordId: sourceId(record, index),
    name,
    nameZh,
    address,
    coordinate: recordCoordinate(record),
    startYear: year(record, ['START', 'startYear', 'year']),
    endYear: year(record, ['END_', 'endYear']),
    types: recordTypes(record),
    generic: isGenericName(name || nameZh),
    sourceRecord: record,
  }
  prepared.specificityScore = specificityScore(prepared)
  return prepared
}

function recordsAreSemanticallySame(left, right) {
  if (buildingNamesAreVariants(left.name, right.name)) return true
  if (buildingNamesAreVariants(left.nameZh, right.nameZh)) return true
  return false
}

function candidateReason(left, right, limits) {
  const distance = distanceMetres(left.coordinate, right.coordinate)
  if (distance === null) return null
  const sameAddress = left.address.normalized && left.address.normalized === right.address.normalized

  if (sameAddress && left.address.hasStreetNumber && right.address.hasStreetNumber && distance <= limits.numberedAddressMetres) {
    return {
      code: 'same-numbered-address-within-radius',
      distanceMetres: distance,
      thresholdMetres: limits.numberedAddressMetres,
      normalizedAddress: left.address.normalized,
    }
  }
  if (sameAddress && !left.address.hasStreetNumber && !right.address.hasStreetNumber && distance <= limits.unnumberedAddressMetres) {
    return {
      code: 'same-unnumbered-address-within-radius',
      distanceMetres: distance,
      thresholdMetres: limits.unnumberedAddressMetres,
      normalizedAddress: left.address.normalized,
    }
  }
  if (distance <= limits.semanticMetres && recordsAreSemanticallySame(left, right)) {
    return {
      code: 'nearby-semantic-variant',
      distanceMetres: distance,
      thresholdMetres: limits.semanticMetres,
      normalizedAddress: null,
    }
  }
  return null
}

function canonicalVariant(values, preferred) {
  const unique = [...new Set(values.map(text).filter(Boolean))]
  if (!unique.length) return ''
  if (preferred && unique.includes(preferred)) return preferred
  return unique.sort((left, right) => right.length - left.length || left.localeCompare(right))[0]
}

function buildHistoricalRecords(records, primary) {
  const aliases = []
  const bySpecificity = [...records].sort((left, right) =>
    right.specificityScore - left.specificityScore || stableId(left.recordId).localeCompare(stableId(right.recordId)))

  for (const record of bySpecificity) {
    const matching = aliases.find((alias) =>
      buildingNamesAreVariants(alias.historicalName, record.name) ||
      (!alias.historicalName && !record.name && buildingNamesAreVariants(alias.historicalNameZh, record.nameZh)))
    const period = {
      startYear: record.startYear,
      endYear: record.endYear,
      sourceRecordIds: [record.recordId],
    }
    if (matching) {
      matching.historicalNameVariants.push(record.name)
      matching.historicalNameZhVariants.push(record.nameZh)
      matching.sourceRecordIds.push(record.recordId)
      matching.periods.push(period)
      matching.isGeneric = matching.isGeneric && record.generic
      matching.specificityScore = Math.max(matching.specificityScore, record.specificityScore)
      continue
    }
    aliases.push({
      historicalName: record.name,
      historicalNameZh: record.nameZh,
      historicalNameVariants: [record.name],
      historicalNameZhVariants: [record.nameZh],
      startYear: record.startYear,
      endYear: record.endYear,
      periods: [period],
      sourceRecordIds: [record.recordId],
      isGeneric: record.generic,
      specificityScore: record.specificityScore,
    })
  }

  for (const alias of aliases) {
    alias.historicalName = canonicalVariant(alias.historicalNameVariants, alias.sourceRecordIds.includes(primary.recordId) ? primary.name : '')
    alias.historicalNameZh = canonicalVariant(alias.historicalNameZhVariants, alias.sourceRecordIds.includes(primary.recordId) ? primary.nameZh : '')
    alias.historicalNameVariants = [...new Set(alias.historicalNameVariants.map(text).filter(Boolean))]
    alias.historicalNameZhVariants = [...new Set(alias.historicalNameZhVariants.map(text).filter(Boolean))]
    alias.sourceRecordIds.sort((left, right) => stableId(left).localeCompare(stableId(right)))
    alias.periods.sort((left, right) =>
      (left.startYear ?? Number.MAX_SAFE_INTEGER) - (right.startYear ?? Number.MAX_SAFE_INTEGER))
    const knownStarts = alias.periods.map((period) => period.startYear).filter(Boolean)
    const knownEnds = alias.periods.map((period) => period.endYear).filter(Boolean)
    alias.startYear = knownStarts.length ? Math.min(...knownStarts) : null
    alias.endYear = knownEnds.length ? Math.max(...knownEnds) : null
  }

  return aliases.sort((left, right) => {
    const leftPrimary = left.sourceRecordIds.includes(primary.recordId) ? 1 : 0
    const rightPrimary = right.sourceRecordIds.includes(primary.recordId) ? 1 : 0
    return rightPrimary - leftPrimary || right.specificityScore - left.specificityScore ||
      left.historicalName.localeCompare(right.historicalName)
  })
}

function siteCoordinate(records) {
  const coordinates = records.map((record) => record.coordinate).filter(Boolean)
  if (!coordinates.length) return null
  return [
    coordinates.reduce((sum, coordinate) => sum + coordinate[0], 0) / coordinates.length,
    coordinates.reduce((sum, coordinate) => sum + coordinate[1], 0) / coordinates.length,
  ]
}

/**
 * @param {Array<object>} sourceRecords GeoJSON Features or plain building records.
 * @param {object} [options]
 * @returns {{clusters: Array<object>, sourceRecords: Array<object>, recordToCluster: object, mergeReasons: Array<object>}}
 */
export function clusterBuildingRecords(sourceRecords, options = {}) {
  if (!Array.isArray(sourceRecords)) throw new TypeError('sourceRecords must be an array')
  const limits = {
    numberedAddressMetres: options.numberedAddressMetres ?? 250,
    unnumberedAddressMetres: options.unnumberedAddressMetres ?? 30,
    semanticMetres: options.semanticMetres ?? 8,
  }
  const prepared = sourceRecords.map(prepareRecord)
  const ids = new Set()
  for (const record of prepared) {
    const key = text(record.recordId)
    if (ids.has(key)) throw new Error(`Duplicate building record id: ${key}`)
    ids.add(key)
  }

  const candidates = []
  for (let left = 0; left < prepared.length; left += 1) {
    for (let right = left + 1; right < prepared.length; right += 1) {
      const reason = candidateReason(prepared[left], prepared[right], limits)
      if (reason) candidates.push({ left, right, ...reason })
    }
  }
  const priority = {
    'same-numbered-address-within-radius': 0,
    'same-unnumbered-address-within-radius': 1,
    'nearby-semantic-variant': 2,
  }
  candidates.sort((left, right) =>
    priority[left.code] - priority[right.code] || left.distanceMetres - right.distanceMetres ||
    stableId(prepared[left.left].recordId).localeCompare(stableId(prepared[right.left].recordId)) ||
    stableId(prepared[left.right].recordId).localeCompare(stableId(prepared[right.right].recordId)))

  // Complete-link merging prevents a chain of individually close records from
  // turning into a cluster whose endpoints violate every clustering rule.
  const groups = prepared.map((_, index) => [index])
  const groupFor = prepared.map((_, index) => index)
  const acceptedReasonKeys = new Set()
  const acceptedReasons = []
  for (const candidate of candidates) {
    const leftGroup = groupFor[candidate.left]
    const rightGroup = groupFor[candidate.right]
    if (leftGroup === rightGroup) continue
    const crossReasons = []
    for (const leftIndex of groups[leftGroup]) {
      for (const rightIndex of groups[rightGroup]) {
        const reason = candidateReason(prepared[leftIndex], prepared[rightIndex], limits)
        if (!reason) {
          crossReasons.length = 0
          break
        }
        crossReasons.push({ left: leftIndex, right: rightIndex, ...reason })
      }
      if (!crossReasons.length) break
    }
    if (!crossReasons.length) continue

    groups[leftGroup].push(...groups[rightGroup])
    for (const index of groups[rightGroup]) groupFor[index] = leftGroup
    groups[rightGroup] = []
    for (const reason of crossReasons) {
      const leftId = prepared[reason.left].recordId
      const rightId = prepared[reason.right].recordId
      const key = [stableId(leftId), stableId(rightId)].sort().join('|')
      if (acceptedReasonKeys.has(key)) continue
      acceptedReasonKeys.add(key)
      acceptedReasons.push({
        leftRecordId: leftId,
        rightRecordId: rightId,
        code: reason.code,
        distanceMetres: Number(reason.distanceMetres.toFixed(3)),
        thresholdMetres: reason.thresholdMetres,
        normalizedAddress: reason.normalizedAddress,
      })
    }
  }

  const activeGroups = groups.filter((members) => members.length)
  const clusters = activeGroups.map((members) => {
    const records = members.map((index) => prepared[index])
    records.sort((left, right) => stableId(left.recordId).localeCompare(stableId(right.recordId)))
    const primary = [...records].sort((left, right) =>
      right.specificityScore - left.specificityScore || stableId(left.recordId).localeCompare(stableId(right.recordId)))[0]
    const clusterId = `vs-building-site:${stableId(records[0].recordId).replace(/^0+(?=\d)/, '')}`
    const sourceRecordIds = records.map((record) => record.recordId)
    const sourceIdSet = new Set(sourceRecordIds.map(text))
    const mergeReasons = acceptedReasons.filter((reason) =>
      sourceIdSet.has(text(reason.leftRecordId)) && sourceIdSet.has(text(reason.rightRecordId)))
    return {
      clusterId,
      primaryRecordId: primary.recordId,
      historicalName: primary.name,
      historicalNameZh: primary.nameZh,
      address: primary.address.raw,
      normalizedAddress: primary.address.normalized,
      coordinate: primary.coordinate,
      centroid: siteCoordinate(records),
      sourceRecordIds,
      historicalRecords: buildHistoricalRecords(records, primary),
      mergeReasons,
    }
  }).sort((left, right) => left.clusterId.localeCompare(right.clusterId))

  const recordToCluster = {}
  for (const cluster of clusters) {
    for (const id of cluster.sourceRecordIds) recordToCluster[text(id)] = cluster.clusterId
  }
  for (const reason of acceptedReasons) {
    reason.clusterId = recordToCluster[text(reason.leftRecordId)]
  }

  return {
    clusters,
    sourceRecords: prepared.map((record) => ({
      recordId: record.recordId,
      historicalName: record.name,
      historicalNameZh: record.nameZh,
      address: record.address.raw,
      normalizedAddress: record.address.normalized,
      coordinate: record.coordinate,
      startYear: record.startYear,
      endYear: record.endYear,
      types: record.types,
      sourceRecord: record.sourceRecord,
    })),
    recordToCluster,
    mergeReasons: acceptedReasons,
  }
}

export const clusterBuildings = clusterBuildingRecords
