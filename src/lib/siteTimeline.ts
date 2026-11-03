import type { HistoricalFeature, HistoricalRecord, TimelineStage } from '../types'
import { getHeritageBuildingName, type HeritageBuildingFeature } from './heritageBuildings'
import type { LinkedHeritageBuilding } from './heritageLandmarkLinks'
import { visibleAtYear, type BuildingPeriod } from './buildingTimeline'
import { chineseName } from './landmarkLabels'
import { reviewedHeritageSiteHistoryFor } from '../data/heritageSiteHistories'

const unique = (values: (string | undefined)[]) => [...new Set(values.filter((v): v is string => Boolean(v?.trim())))]
const isYear = (value: number | undefined): value is number => Number.isInteger(value) && value! >= 1000

export function siteStageAtYear(feature: HistoricalFeature, year: number): TimelineStage {
  const p = feature.properties
  const originalChinese = chineseName(p.historicalChinese, p.modernNameZh, p.historicalName)
  const phases = (p.historicalPhases ?? []).filter(phase => isYear(phase.startYear)
    && (phase.endYear === undefined || (isYear(phase.endYear) && phase.endYear > phase.startYear))
    && phase.sources.some(source => /^https?:\/\//.test(source.url))
    && phase.startYear <= year && (phase.endYear === undefined || year < phase.endYear))
  // Conflicting reviewed phases do not silently select one building.
  if (phases.length === 1) {
    const phase = phases[0]
    return { year, name: phase.name, nameZh: phase.nameZh, use: phase.use,
      status: 'reviewed-phase', records: [], phase }
  }
  const records: HistoricalRecord[] = p.historicalRecords?.length ? p.historicalRecords : p.labelYearIsFallback ? [] : [{
    name: p.historicalName, nameZh: originalChinese, startYear: p.labelYear, endYear: p.labelYear,
    sourceUrls: Object.values(p.sourceUrls ?? {}), category: p.category,
  }]
  const dated = records.filter(record => isYear(record.startYear)
    && (record.endYear === undefined || (isYear(record.endYear) && record.endYear >= record.startYear!))
    && record.startYear! <= year)
  const active = dated.filter(record => record.endYear !== undefined && year <= record.endYear)
  const lastSeen = (record: HistoricalRecord) => record.endYear ?? record.startYear!
  const latest = Math.max(...dated.map(lastSeen))
  const chosen = active.length ? active : dated.filter(record => lastSeen(record) === latest)
  if (!chosen.length || phases.length > 1) return { year, name: p.historicalName,
    nameZh: originalChinese, status: 'unknown', records: [] }
  const named = chosen.some(record => !record.generic) ? chosen.filter(record => !record.generic) : chosen
  const displayNames = named.map(record => chineseName(record.displayNameZh, record.nameZh, record.name,
    record.name === p.historicalName ? originalChinese : undefined) || record.name)
  return { year, name: unique(named.map(record => record.name)).join(' / '),
    nameZh: displayNames.some(name => chineseName(name)) ? unique(displayNames).join(' / ') : undefined,
    status: active.length ? 'record-span' : 'latest-record', records: named }
}

export function historicalFeatureAtYear(feature: HistoricalFeature, year: number | null): HistoricalFeature {
  if (year === null || feature.properties.kind === 'road') return feature
  const stage = siteStageAtYear(feature, year)
  return { ...feature, properties: { ...feature.properties, timelineStage: stage,
    historicalName: stage.name,
    historicalChinese: stage.nameZh,
    aliases: unique([...(feature.properties.aliases ?? []), feature.properties.historicalName, feature.properties.historicalChinese]),
  } }
}

export function historicalSiteVisibleAtYear(feature: HistoricalFeature, period: BuildingPeriod, year: number | null, includeUnknown = false) {
  if (year !== null) {
    const stage = siteStageAtYear(feature, year)
    // A sourced new building or site use is not constrained by the old building's lifespan.
    if (stage.phase && stage.phase.relationship !== 'same-building') return true
  }
  return visibleAtYear(period, year, includeUnknown)
}

export function heritageFeatureAtYear(feature: HeritageBuildingFeature, year: number | null,
  linked?: LinkedHeritageBuilding): HeritageBuildingFeature {
  if (year === null) return feature
  // Neighbourhood/complex associations are not a single site's chronology.
  const useLinked = linked && ['same-listed-building', 'same-listed-structure', 'same-historical-site'].includes(linked.link.relation ?? '')
  let stage: TimelineStage = useLinked ? siteStageAtYear(linked.landmark, year)
    : { year, name: getHeritageBuildingName({ ...feature.properties, timelineStage: undefined }), status: 'unknown' as const, records: [] }
  const history = !useLinked && reviewedHeritageSiteHistoryFor(feature.properties)
  const observation = history && history.observations.find(item => item.year === year)
  if (observation) stage = { year, name: observation.name, status: 'record-span', records: [{
    name: observation.name, startYear: year, endYear: year, sourceUrls: [observation.source.url],
  }] }
  if (linked?.link.relation === 'same-historical-site') stage.scope = '同址不同历史阶段，不代表同一栋建筑延续。'
  return { ...feature, properties: { ...feature.properties, timelineStage: stage,
    historicalDisplayName: chineseName(stage.nameZh, stage.name) || stage.name,
  } }
}
