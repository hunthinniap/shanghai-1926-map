import type { HistoricalFeature, SearchRecord } from '../types'
import { getHeritageBuildingName, type HeritageBuildingFeature } from './heritageBuildings'
import { reviewedHeritageSiteHistoryFor } from '../data/heritageSiteHistories'
import { reviewedResidentsForHeritage } from '../data/notableResidents'

export interface PlaceSearchRecord extends SearchRecord {
  heritageOfficialId?: string
  subtitle?: string
}

const traditionalToSimplified: Record<string, string> = {
  復: '复',
  興: '兴',
  園: '园',
  醫: '医',
  學: '学',
  國: '国',
  鐵: '铁',
  車: '车',
  站: '站',
  門: '门',
  廣: '广',
  場: '场',
  東: '东',
  西: '西',
  南: '南',
  北: '北',
  橋: '桥',
  碼: '码',
  頭: '头',
  聖: '圣',
  寧: '宁',
  灣: '湾',
  總: '总',
  會: '会',
}

export function normalizeSearchTerm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split('')
    .map((character) => traditionalToSimplified[character] ?? character)
    .join('')
    .toLocaleLowerCase()
    .replace(/[’'`.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function makeSearchRecords(features: HistoricalFeature[]): SearchRecord[] {
  const seen = new Set<string>()

  return features.flatMap((feature) => {
    const properties = feature.properties
    const key = properties.featureGroupId
    if (seen.has(key)) return []
    seen.add(key)

    const terms = [
      properties.historicalName,
      properties.modernNameZh,
      properties.modernNameEn,
      properties.historicalChinese,
      properties.historicalSiteNote,
      properties.currentNameZh,
      properties.currentUse,
      ...(properties.addressUseEvidence ?? []).flatMap(evidence => [evidence.use, evidence.address]),
      ...(properties.historicalRecords ?? []).flatMap((record) => [record.name, record.nameZh, record.displayNameZh]),
      ...(properties.aliases ?? []),
      ...(properties.notableResidents ?? []).map(resident => resident.name),
    ].filter((term): term is string => Boolean(term))

    return [
      {
        featureId: properties.id,
        featureGroupId: key,
        historicalName: properties.historicalName,
        modernNameZh: properties.modernNameZh,
        modernNameEn: properties.modernNameEn,
        normalizedTerms: [...new Set(terms.map(normalizeSearchTerm))],
      },
    ]
  })
}

/** Include the heritage directory even when a building has no historical landmark link. */
export function makePlaceSearchRecords(
  features: HistoricalFeature[],
  heritage: HeritageBuildingFeature[],
  heritageGroupIds: ReadonlyMap<string, string> = new Map(),
): PlaceSearchRecord[] {
  const records: PlaceSearchRecord[] = makeSearchRecords(features)
  const byGroup = new Map(records.map(record => [record.featureGroupId, record]))
  for (const { properties } of heritage) {
    const terms = [properties.officialId, properties.officialCodeRaw, properties.name,
      getHeritageBuildingName(properties), ...(reviewedHeritageSiteHistoryFor(properties)?.aliases ?? []),
      properties.articleTitle, properties.officialName, properties.listedName,
      properties.address, properties.wikipediaAddress, properties.sourceAddress,
      ...[...(properties.notableResidents ?? []), ...reviewedResidentsForHeritage(properties),
        ...(reviewedHeritageSiteHistoryFor(properties)?.residents ?? [])].map(resident => resident.name),
    ].filter((term): term is string => Boolean(term))
    const groupId = heritageGroupIds.get(properties.officialId)
    const existing = groupId ? byGroup.get(groupId) : undefined
    const subtitle = `${properties.officialCodeRaw} · ${properties.address}`
    if (existing) {
      existing.heritageOfficialId ??= properties.officialId
      existing.subtitle = existing.subtitle ? `${existing.subtitle}；${subtitle}` : subtitle
      existing.normalizedTerms = [...new Set([...existing.normalizedTerms, ...terms.map(normalizeSearchTerm)])]
    } else {
      const name = getHeritageBuildingName(properties)
      const record: PlaceSearchRecord = {
        featureId: properties.officialId, featureGroupId: groupId ?? `heritage:${properties.officialId}`,
        heritageOfficialId: properties.officialId, historicalName: name, modernNameZh: name,
        normalizedTerms: [...new Set(terms.map(normalizeSearchTerm))], subtitle,
      }
      records.push(record)
      byGroup.set(record.featureGroupId, record)
    }
  }
  return records
}

export function searchRecords<T extends SearchRecord>(records: T[], rawQuery: string): T[] {
  const query = normalizeSearchTerm(rawQuery)
  if (!query) return []

  return records
    .map((record) => {
      const ranks = record.normalizedTerms.map((term) => {
        if (term === query) return 0
        if (term.startsWith(query)) return 1
        if (term.includes(query)) return 2
        return Number.POSITIVE_INFINITY
      })
      return { record, rank: Math.min(...ranks) }
    })
    .filter(({ rank }) => Number.isFinite(rank))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.record.historicalName.localeCompare(b.record.historicalName, 'zh-CN'),
    )
    .slice(0, 10)
    .map(({ record }) => record)
}
