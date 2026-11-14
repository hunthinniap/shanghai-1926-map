import type { HistoricalFeatureCollection } from '../types'

// WGS84 representative POIs from OpenFreeMap, checked 2026-11-14.
// These are modern parks, without invented concession-era names.
export const modernParkEntries = [
  { id: 'yanzhong', name: '延中绿地', aliases: ['延中公园', '延中广场公园', '广场公园', '延安中路大型公共绿地'],
    year: 2001, coordinates: [121.4608097, 31.2252201], address: '延安中路、成都路周边',
    sourceTitle: '静安区政府：延中绿地／广场公园2001年开放',
    sourceUrl: 'https://www.jingan.gov.cn/govxxgk/JA0/2023-02-27/62b6ca10-2036-41be-9323-8e0150eb3d48.html' },
  { id: 'taipingqiao', name: '太平桥公园', aliases: ['太平桥绿地'],
    year: 2001, coordinates: [121.4748913, 31.2220640], address: '太仓路、湖滨路、黄陂南路一带',
    sourceTitle: '上海市统计局：2001年太平桥等大型公共绿地建成',
    sourceUrl: 'https://tjj.sh.gov.cn/tjxw/20020103/0014-95756.html' },
  { id: 'xujiahui', name: '徐家汇公园', aliases: ['徐家汇绿地'],
    year: 2001, coordinates: [121.4383489, 31.2004133], address: '衡山路、宛平路、天平路、肇嘉浜路之间',
    sourceTitle: '上海市统计局：2001年徐家汇公园等公共绿地建成',
    sourceUrl: 'https://tjj.sh.gov.cn/tjxw/20020103/0014-95756.html' },
  { id: 'jiuzi', name: '九子公园', aliases: [],
    year: 2006, coordinates: [121.4595330, 31.2425494], address: '成都北路1018号',
    sourceTitle: '新闻晨报·周到：九子公园2006年1月22日开园',
    sourceUrl: 'https://static.zhoudaosh.com/files/cnews/2018/20180831/A19214532607B15C785404370E1376EB8DC0BE8ACF0D7B74695B1003398780CB/2.html' },
  { id: 'gucheng', name: '古城公园', aliases: [],
    year: 2002, coordinates: [121.4893806, 31.2303715], address: '人民路333号',
    sourceTitle: '上海市文旅推广网：古城公园2002年建成',
    sourceUrl: 'https://www.meet-in-shanghai.net/cn/country-park/ancient-city-park-439025/' },
]

export const modernParks: HistoricalFeatureCollection = {
  type: 'FeatureCollection', features: modernParkEntries.map(park => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: park.coordinates },
    properties: {
      id: `park-modern-${park.id}`, featureGroupId: `park-modern-${park.id}`, kind: 'landmark',
      historicalName: park.name, historicalChinese: park.name, modernNameZh: park.name,
      aliases: park.aliases, jurisdiction: 'chinese-administered', language: 'zh',
      labelYear: park.year, sourceIds: ['modern-public-parks'], category: '现代公园绿地',
      priority: 1, historicalUse: 'park', labelFromFeature: true,
      currentNameZh: park.name, currentUse: '公园 / 公共开放空间', currentAddress: park.address,
      currentUseMatch: 'documented-current-place', currentUseSources: [{ title: park.sourceTitle, url: park.sourceUrl }],
      sourceUrls: { '建园资料': park.sourceUrl, '地图点位': 'https://tiles.openfreemap.org/planet' },
      historicalRecords: [{ name: park.name, startYear: park.year, endYear: park.year, sourceUrls: [park.sourceUrl] }],
    },
  })),
}
