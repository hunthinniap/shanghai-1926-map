import type { HistoricalFeature, HistoricalFeatureCollection, HistoricalRecord } from '../types'

export interface ParkLabelEntry {
  modernNames: string[]
  historicalName: string
  featureGroupId: string
  legacyGroupIds?: string[]
}

export const currentParkLabels: ParkLabelEntry[] = [
  {
    modernNames: ['襄阳公园'],
    historicalName: 'Parc Ravinel',
    featureGroupId: 'park-parc-ravinel',
  },
  {
    modernNames: ['复兴公园'],
    historicalName: 'Parc français',
    featureGroupId: 'park-french-park',
    legacyGroupIds: ['landmark-french-park'],
  },
  {
    modernNames: ['衡山公园'],
    historicalName: 'Parc Edan',
    featureGroupId: 'park-edan-park',
    legacyGroupIds: [
      'landmark-vs-site-485',
      'landmark-edan-park-petain-park-公園',
      'landmark-edan-petain-park-hengshan-gongyuan',
    ],
  },
  {
    modernNames: ['上海中山公园', '中山公园'],
    historicalName: 'Jessfield Park',
    featureGroupId: 'park-jessfield-park',
    legacyGroupIds: [
      'landmark-jessfield-park-兆豊公園',
      'landmark-jessfield-park-zhongshan-gongyuan',
    ],
  },
  {
    modernNames: ['黃浦公園', '黄浦公园'],
    historicalName: 'Public Gardens',
    featureGroupId: 'park-public-gardens',
    legacyGroupIds: [
      'landmark-public-gardens-外灘公園',
      'landmark-huangpu-gongyuan-huangpu-gongyuan',
    ],
  },
  {
    modernNames: ['鲁迅公园'],
    historicalName: 'Hongkew Park',
    featureGroupId: 'park-hongkew-park',
  },
  {
    modernNames: ['人民公园'],
    historicalName: 'Race Course',
    featureGroupId: 'park-race-course-north',
  },
  {
    modernNames: ['人民广场'],
    historicalName: 'Race Course',
    featureGroupId: 'park-race-course-south',
  },
  {
    modernNames: ['昆山公园'],
    historicalName: 'Kunshan Park',
    featureGroupId: 'park-kunshan-park',
    legacyGroupIds: ['landmark-kunshan-park-崑山公園'],
  },
  {
    modernNames: ['霍山公园'],
    historicalName: 'Studley Park',
    featureGroupId: 'park-studley-park',
    legacyGroupIds: ['landmark-studley-park-huoshan-gongyuan'],
  },
  {
    modernNames: ['闸北公园'],
    historicalName: 'Song Park',
    featureGroupId: 'park-song-park',
  },
  {
    modernNames: ['光启公园'],
    historicalName: "Hsü Kuang-ch'i's Tomb",
    featureGroupId: 'park-xu-guangqi-tomb',
  },
  {
    modernNames: ['上海文化广场'],
    historicalName: 'Le Canidrome',
    featureGroupId: 'park-canidrome',
  },
  {
    modernNames: ['宋庆龄陵园'],
    historicalName: 'International Cemetery',
    featureGroupId: 'park-international-cemetery',
    legacyGroupIds: ['landmark-songqingling-lingyuan-songqingling-lingyuan'],
  },
  {
    modernNames: ['桂林公园'],
    historicalName: 'Huang Family Garden',
    featureGroupId: 'park-huang-family-garden',
  },
  {
    modernNames: ['复兴岛公园'],
    historicalName: 'Whangpoo Conservancy Board Club',
    featureGroupId: 'park-junpu-athletic-club',
  },
  {
    modernNames: ['龙华烈士陵园'],
    historicalName: 'Songhu Garrison Command',
    featureGroupId: 'park-longhua-garrison',
    legacyGroupIds: ['landmark-longhua-lieshi-lingyan-longhua-lieshi-lingyan'],
  },
  {
    modernNames: ['豫园'],
    historicalName: 'Yu Garden',
    featureGroupId: 'park-yu-garden',
  },
  {
    modernNames: ['蓬莱公园'],
    historicalName: 'Tatung School Grounds',
    featureGroupId: 'park-tatung-school-grounds',
  },
  {
    modernNames: ['漕溪公园'],
    historicalName: 'Tsao Family Garden',
    featureGroupId: 'park-tsao-family-garden',
  },
  {
    modernNames: ['康健园'],
    historicalName: 'Kang Chien Garden',
    featureGroupId: 'park-kang-chien-garden',
  },
  {
    modernNames: ['华山花园'],
    historicalName: 'Jardin de la famille Chow',
    featureGroupId: 'park-chow-family-garden',
  },
  {
    modernNames: ['聂耳音乐广场', '聂耳绿地'],
    historicalName: 'Square Paul Brunat',
    featureGroupId: 'park-paul-brunat-square',
    legacyGroupIds: ['landmark-paul-brunat-square-wuzhong-gongyuan'],
  },
]

export function buildParkLabelIndex() {
  const index = new Map<string, ParkLabelEntry>()
  currentParkLabels.forEach((entry) => {
    entry.modernNames.forEach((name) => index.set(name, entry))
  })
  return index
}

export function mergeCuratedParkFeatures(
  historical: HistoricalFeatureCollection,
  curated: HistoricalFeatureCollection,
): HistoricalFeatureCollection {
  const replacedGroups = new Set(
    currentParkLabels.flatMap((entry) => entry.legacyGroupIds ?? []),
  )
  const entryByCuratedGroup = new Map(
    currentParkLabels.map((entry) => [entry.featureGroupId, entry]),
  )

  const mergeRecords = (records: HistoricalRecord[]) => [...new Map(
    records.map((record) => [
      `${record.name}|${record.startYear ?? ''}|${record.endYear ?? ''}|${record.sourceRecordIds?.join(',') ?? ''}`,
      record,
    ]),
  ).values()]

  const mergeLegacyProperties = (feature: HistoricalFeature): HistoricalFeature => {
    const entry = entryByCuratedGroup.get(feature.properties.featureGroupId)
    if (!entry?.legacyGroupIds?.length) return feature
    const legacyFeatures = historical.features.filter((candidate) =>
      entry.legacyGroupIds?.includes(candidate.properties.featureGroupId))
    if (!legacyFeatures.length) return feature

    const sourceRecordIds = [...new Set([
      ...(feature.properties.sourceRecordIds ?? []),
      ...legacyFeatures.flatMap((legacy) => legacy.properties.sourceRecordIds ?? []),
    ])]
    const historicalRecords = mergeRecords([
      ...(feature.properties.historicalRecords ?? []),
      ...legacyFeatures.flatMap((legacy) => legacy.properties.historicalRecords ?? []),
    ])
    const aliases = [...new Set([
      ...(feature.properties.aliases ?? []),
      ...legacyFeatures.flatMap((legacy) => [
        legacy.properties.historicalName,
        legacy.properties.modernNameZh,
        ...(legacy.properties.aliases ?? []),
      ]),
    ].filter(Boolean))]
    const sourceUrls = Object.assign(
      {},
      ...legacyFeatures.map((legacy) => legacy.properties.sourceUrls ?? {}),
      feature.properties.sourceUrls ?? {},
    )

    return {
      ...feature,
      properties: {
        ...feature.properties,
        sourceIds: [...new Set([
          ...feature.properties.sourceIds,
          ...legacyFeatures.flatMap((legacy) => legacy.properties.sourceIds),
        ])],
        sourceRecordIds: sourceRecordIds.length ? sourceRecordIds : undefined,
        historicalRecords: historicalRecords.length ? historicalRecords : undefined,
        aliases: aliases.length ? aliases : undefined,
        sourceUrls: Object.keys(sourceUrls).length ? sourceUrls : undefined,
        legacyFeatureGroupIds: [...new Set([
          ...(feature.properties.legacyFeatureGroupIds ?? []),
          ...entry.legacyGroupIds,
          ...legacyFeatures.flatMap((legacy) => legacy.properties.legacyFeatureGroupIds ?? []),
        ])],
      },
    }
  }

  return {
    ...historical,
    features: [
      ...historical.features.filter(
        (feature) => !replacedGroups.has(feature.properties.featureGroupId),
      ),
      ...curated.features.map(mergeLegacyProperties),
    ],
  }
}
