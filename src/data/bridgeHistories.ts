import type { CurrentUseSource, HistoricalFeatureCollection, HistoricalSitePhase } from '../types'

const source = (title: string, url: string): CurrentUseSource => ({ title, url })
const riverBridges = source('看看新闻：苏州河上那些桥的故事', 'https://www.kankanews.com/detail/6awW5KNr8yX')
const rebuilding = source('央广网：苏州河桥梁更名及重建', 'https://www.cnr.cn/shanghai/tt/20180911/t20180911_524357040_1.shtml')
type NameStage = [year: number, name: string, nameZh?: string, relationship?: HistoricalSitePhase['relationship']]
interface BridgeHistory {
  sourceId: number; expectedName: string; name: string; address: string; aliases: string[]
  stages: NameStage[]; sources: CurrentUseSource[]; note: string
}

// Reviewed names and site stages. Rebuilding dates remain in the history note
// when they do not introduce a different name; raw source records are retained.
export const reviewedBridgeHistories: BridgeHistory[] = [
  { sourceId: 1332, expectedName: 'New Garbage Bridge', name: '西藏路桥',
    address: '跨苏州河，连接西藏中路与西藏北路', aliases: ['新垃圾桥', '自来火房桥', '自来火厂桥', '泥城桥'],
    stages: [[1899, 'New Garbage Bridge', '新垃圾桥'], [1942, '西藏路桥']],
    sources: [riverBridges, rebuilding],
    note: '1899年跨苏州河木桥，1924年改为钢筋混凝土桥，1942年改称西藏路桥，2004年重建桥通车。“新垃圾桥”因邻近垃圾转运码头得名。' },
  { sourceId: 1336, expectedName: 'Old Garbage Bridge', name: '浙江路桥',
    address: '跨苏州河，连接浙江中路与浙江北路', aliases: ['垃圾桥', '老垃圾桥'],
    stages: [[1880, 'Garbage Bridge', '垃圾桥'], [1899, 'Old Garbage Bridge', '老垃圾桥'], [1942, '浙江路桥']],
    sources: [source('上海市文旅推广网：浙江路桥', 'https://www.meet-in-shanghai.net/cn/shanghai-cultural-relics-protection-unit/zhejiang-road-and-bridge-509241/'),
      source('澎湃：浙江路桥1908年建成、1942年更名', 'https://m.thepaper.cn/newsDetail_forward_1386205'),
      source('澎湃：新老垃圾桥名称对应', 'https://www.thepaper.cn/newsDetail_forward_14158856')],
    note: '1880年建木桥；1899年新垃圾桥出现后，原垃圾桥又称老垃圾桥。1908年钢桁架桥通车，1942年改称浙江路桥。2015年整修复位，保留原桥钢结构。' },
  { sourceId: 1365, expectedName: 'Laozha Bridge', name: '福建路桥',
    address: '跨苏州河，连接福建中路与福建北路', aliases: ['老闸桥'],
    stages: [[1885, 'Laozha Bridge', '老闸桥'], [1946, '福建路桥']],
    sources: [source('澎湃：老闸桥1885年木桥及1946年更名', 'https://www.thepaper.cn/newsDetail_forward_27010803'), riverBridges],
    note: '1885年建老闸木桥，1946年重建并改称福建路桥，1968年改建混凝土桥。旧桥2001年拆除，现桥于2004—2007年间重建。' },
  { sourceId: 1366, expectedName: 'Pengtanglong Bridge', name: '山西路桥',
    address: '跨苏州河，连接山西南路与山西北路', aliases: ['盆汤弄桥', '盆湯弄橋'],
    stages: [[1889, 'Pengtanglong Bridge', '盆汤弄桥'], [1956, '盆汤弄桥旧址', undefined, 'vacant-site'], [2007, '山西路桥']],
    sources: [riverBridges],
    note: '1889年建盆汤弄木桥，因附近浴室众多得名。1956年旧桥拆除，2007年复建为山西路人行桥。' },
  { sourceId: 1368, expectedName: 'Railway Bridge', name: '河南路桥',
    address: '跨苏州河，连接河南中路与河南北路', aliases: ['铁马路桥', '铁大桥', '三摆渡桥', '天妃宫桥', '天后宫桥'],
    stages: [[1925, '河南路桥']], sources: [riverBridges, rebuilding],
    note: '原表门址为HONAN -BRIDGE (SUZHOU HE)-，对应河南路桥。1925年木桥改建为钢筋混凝土桥，2009年重建桥通车。历史上有铁马路桥、铁大桥、天妃宫桥等称呼。' },
  { sourceId: 1406, expectedName: 'Caojiadu Bridge', name: '曹杨路桥',
    address: '跨苏州河，连接曹杨路与江苏北路', aliases: ['曹家渡桥', '三官堂桥', '曹家渡东桥'],
    stages: [[1928, 'Caojiadu Bridge', '曹家渡桥'], [1980, '曹杨路桥']],
    sources: [source('Virtual Shanghai：曹家渡桥，CAOYANG门址及1928年原始记录', 'https://www.virtualshanghai.net/Data/Buildings?ID=1406'),
      source('澎湃：曹家渡桥与曹杨路桥沿革', 'https://www.thepaper.cn/newsDetail_forward_10531469'),
      source('上海通志：1980年三官堂木桥改建曹杨路桥', 'https://www.shanghai.gov.cn/shanghai/newshanghai/上海通志.pdf')],
    note: '原表1928年记曹家渡桥；地方史另记1928年筹建、1929年木桥建成。旧桥又称三官堂桥，1980年改建曹杨路桥。与后来位于西侧的曹家渡西桥区分。' },
]

export function applyReviewedBridgeHistories(collection: HistoricalFeatureCollection): HistoricalFeatureCollection {
  return { ...collection, features: collection.features.map(feature => {
    const p = feature.properties
    const reviewed = reviewedBridgeHistories.find(item => p.kind === 'landmark'
      && p.id === `landmark-vs-site-${item.sourceId}` && p.historicalName === item.expectedName
      && p.sourceRecordIds?.length === 1 && p.sourceRecordIds[0] === item.sourceId)
    if (!reviewed) return feature
    const phases: HistoricalSitePhase[] = reviewed.stages.map(([year, name, nameZh, relationship], index) => ({
      id: `bridge-history-${reviewed.sourceId}-${year}`, startYear: year, endYear: reviewed.stages[index + 1]?.[0],
      name, nameZh, relationship: relationship || 'site-use', sources: reviewed.sources,
      address: reviewed.address,
    }))
    return { ...feature, properties: { ...p,
      modernNameZh: reviewed.name, historicalChinese: phases[0].nameZh || phases[0].name,
      currentNameZh: reviewed.name, currentAddress: reviewed.address, currentUse: '桥梁 / 交通设施',
      currentUseMatch: 'verified-online-research' as const, currentUseRelationship: undefined,
      currentUseSources: reviewed.sources, historicalSiteSources: [...(p.historicalSiteSources ?? []), ...reviewed.sources],
      category: '桥梁', historicalPhases: phases, historicalSiteNote: reviewed.note,
      aliases: [...new Set([...(p.aliases ?? []), p.historicalName, p.modernNameZh, ...reviewed.aliases, reviewed.name])],
    } }
  }) }
}
