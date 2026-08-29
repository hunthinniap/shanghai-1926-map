const generalNamePatterns = [
  /^(?:(?:PRIMARY|JUNIOR HIGH|SENIOR HIGH|MIDDLE|HIGH|GIRL JUNIOR HIGH) SCHOOL)(?: AND (?:KINDERGARTEN|PRIMARY SCHOOL|JUNIOR HIGH SCHOOL))*(?: NO\.? \d+)?$/iu,
  /^(?:SCHOOL|KINDERGARTEN|NURSERY)$/iu,
  /^(?:PUBLIC )?(?:BATH|BATHS|TOILET|TOILETS)$/iu,
  /^(?:RESIDENTIAL COMPLEX|APARTMENTS?|RESIDENCE|HOUSE|GARDEN)$/iu,
  /^(?:HOSPITAL|DISPENSARY|CLINIC|DENTIST)$/iu,
  /^(?:TEMPLE|CHURCH|MOSQUE|MONASTERY|PAGODA)$/iu,
  /^(?:BANK|FACTORY|WAREHOUSE|WORKSHOP|SHOP|STORE|MARKET|RESTAURANT|POST OFFICE|JETTY|WHARF|CEMETERY)$/iu,
  /^(?:REFUGEE CAMP|AMERICAN MILITARY CAMP)$/iu,
  /^(?:(?:BALL GAME|BASKET BALL|FOOTBALL) )?PLAYGROUND$/iu,
  /^(?:SPORTS FIELD|ATHLETIC FIELD)$/iu,
  /^(?:POLICE (?:STATION|SUB-STATION|OFFICE)|FIRE STATION)$/iu,
]

function normalizedName(name) {
  return String(name ?? '')
    .normalize('NFKC')
    .replace(/[‐‑‒–—]/gu, '-')
    .replace(/\s+/gu, ' ')
    .trim()
}

export function isGeneralUnresolvedName(name) {
  const normalized = normalizedName(name)
  return Boolean(normalized) && generalNamePatterns.some((pattern) => pattern.test(normalized))
}

export function unresolvedRecordTier(record) {
  if (!normalizedName(record.NAME)) return 3
  if (isGeneralUnresolvedName(record.NAME)) return 2
  return record.F_ADDRESS && record.FUNCTION ? 0 : 1
}

export function makeUnresolvedRecordComparator(records) {
  const nameFrequency = new Map()
  for (const record of records) {
    const name = normalizedName(record.NAME).toLocaleLowerCase('en')
    if (name) nameFrequency.set(name, (nameFrequency.get(name) ?? 0) + 1)
  }

  return (left, right) => {
    const tierDifference = unresolvedRecordTier(left) - unresolvedRecordTier(right)
    if (tierDifference) return tierDifference

    const leftName = normalizedName(left.NAME)
    const rightName = normalizedName(right.NAME)
    const frequencyDifference =
      (nameFrequency.get(leftName.toLocaleLowerCase('en')) ?? Number.MAX_SAFE_INTEGER) -
      (nameFrequency.get(rightName.toLocaleLowerCase('en')) ?? Number.MAX_SAFE_INTEGER)
    if (frequencyDifference) return frequencyDifference

    const nameDifference = leftName.localeCompare(rightName, 'en', { sensitivity: 'base' })
    if (nameDifference) return nameDifference
    return left.IDBAT - right.IDBAT
  }
}
