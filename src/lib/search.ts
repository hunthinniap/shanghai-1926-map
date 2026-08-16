import type { HistoricalFeature, SearchRecord } from '../types'

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
      ...(properties.aliases ?? []),
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

export function searchRecords(records: SearchRecord[], rawQuery: string): SearchRecord[] {
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
