import type { BuildingLifeDates, HistoricalFeature } from '../types'
import type { HeritageBuildingFeature } from './heritageBuildings'
import type { LinkedHeritageBuilding } from './heritageLandmarkLinks'

export interface BuildingPeriod {
  startYear?: number
  demolishedYear?: number
  basis: 'construction' | 'construction-range' | 'earliest-record' | 'unknown'
}

export const timelineMinYear = 1840
export const timelineMaxYear = new Date().getFullYear()

const validYear = (year: number | undefined): year is number =>
  Number.isInteger(year) && year! >= 1000 && year! <= timelineMaxYear

function sourcedYear(date: BuildingLifeDates['built']) {
  return date && validYear(date.year) && /^https?:\/\//.test(date.sourceUrl) ? date.year : undefined
}

/** Do not turn uncertain, conflicting or multi-building prose into exact dates. */
export function parseConstructionDate(value: string | null | undefined): BuildingPeriod {
  const text = value?.trim() ?? ''
  const exact = text.match(/^(\d{4})\s*年?(?:竣工|建成)?$/)
  if (exact && validYear(Number(exact[1]))) return { startYear: Number(exact[1]), basis: 'construction' }
  const range = text.match(/^(\d{4})\s*年?\s*[~～—–－-]\s*(\d{4})\s*年?$/)
  if (range) {
    const start = Number(range[1]), end = Number(range[2])
    if (validYear(start) && validYear(end) && start <= end) {
      // Only include a construction range once its latest year has passed.
      return { startYear: end, basis: 'construction-range' }
    }
  }
  const decade = text.match(/^(\d{3}0)年代$/)
  if (decade && validYear(Number(decade[1]) + 9)) {
    return { startYear: Number(decade[1]) + 9, basis: 'construction-range' }
  }
  return { basis: 'unknown' }
}

function withLifeDates(period: BuildingPeriod, dates?: BuildingLifeDates): BuildingPeriod {
  const built = sourcedYear(dates?.built)
  const demolished = sourcedYear(dates?.demolished)
  const startYear = built ?? period.startYear
  return {
    ...period,
    ...(built !== undefined ? { startYear: built, basis: 'construction' as const } : {}),
    ...(demolished !== undefined && (startYear === undefined || demolished >= startYear)
      ? { demolishedYear: demolished } : {}),
  }
}

export function heritageBuildingPeriod(feature: HeritageBuildingFeature): BuildingPeriod {
  return withLifeDates(parseConstructionDate(feature.properties.constructionDate), feature.properties.buildingLifeDates)
}

/** Same-building layers share their earliest dated evidence when completion is unknown. */
export function linkedHeritageBuildingPeriod(feature: HeritageBuildingFeature, linked?: LinkedHeritageBuilding): BuildingPeriod {
  const period = heritageBuildingPeriod(feature)
  const sameBuilding = linked?.link.relation === 'same-listed-building'
    || linked?.link.relation === 'same-listed-structure'
  if (period.startYear !== undefined || !sameBuilding || !linked
    || linked.heritage.properties.officialId !== feature.properties.officialId) return period
  return withLifeDates(historicalBuildingPeriod(linked.landmark), feature.properties.buildingLifeDates)
}

export function historicalBuildingPeriod(feature: HistoricalFeature, linked?: LinkedHeritageBuilding): BuildingPeriod {
  // A site/complex/context link does not establish the age of the same physical building.
  const sameBuilding = linked?.link.relation === 'same-listed-building'
    || linked?.link.relation === 'same-listed-structure'
  if (sameBuilding && linked) {
    const period = heritageBuildingPeriod(linked.heritage)
    if (period.startYear !== undefined) return withLifeDates(period, feature.properties.buildingLifeDates)
  }
  const starts = (feature.properties.historicalRecords ?? []).map(record => record.startYear).filter(validYear)
  starts.push(...(feature.properties.historicalPhases ?? []).filter(phase => phase.sources.some(source => /^https?:\/\//.test(source.url)))
    .map(phase => phase.startYear).filter(validYear))
  if (!feature.properties.labelYearIsFallback && validYear(feature.properties.labelYear)) {
    starts.push(feature.properties.labelYear)
  }
  const period: BuildingPeriod = starts.length
    ? { startYear: Math.min(...starts), basis: 'earliest-record' } : { basis: 'unknown' }
  // historicalRecords.endYear is deliberately ignored: it can mean a rename or closure.
  return withLifeDates(period, feature.properties.buildingLifeDates)
}

export function visibleAtYear(period: BuildingPeriod, year: number | null, includeUnknown = false) {
  if (year === null) return true
  if (period.demolishedYear !== undefined && year >= period.demolishedYear) return false
  if (period.startYear === undefined) return includeUnknown
  return year >= period.startYear
}
