import type { LandmarkSiteLink } from '../lib/landmarkSites'

// Explicit source links and reviewed identities, not proximity-based merging.
export const landmarkSiteLinks: LandmarkSiteLink[] = [
  {
    id: 'yushi-shanzhuang',
    canonicalFeatureId: 'landmark-yushishanzhuang-vanished-74',
    memberFeatureIds: ['landmark-vs-site-1566'],
    expectedBuildingIds: [1566],
    expectedParkIds: [162],
    historicalName: 'Yushi Shanzhuang',
    nameZh: '郁氏山庄（昧园）',
    aliases: ['Yushishanzhuang', 'Yu Family Tomb', '郁氏山莊', '郁氏山壯', '郁氏山壮', '昧园', '郁家花园'],
    category: '私家园林 / 家族墓园',
    historicalUse: 'garden',
    note: '郁氏山庄亦称昧园，兼有园林、宗祠和家族墓地。Yushishanzhuang与Yu Family Tomb是同一历史园墓地点的两类记录。春光坊为后来形成的相关片区，其范围不等同整个山庄；地图沿用来源园地范围，墓地记录另保留于下方史料。',
    sources: [
      { title: '上海长宁：幸福路、郁氏山庄与春光路沿革', url: 'https://m.thepaper.cn/newsDetail_forward_13739603' },
      { title: 'Virtual Shanghai 公园原表：公园162直接关联建筑1566，门牌119 TANWEI LU', url: 'https://www.virtualshanghai.net/Data/Tables?ID=206' },
      { title: 'Virtual Shanghai：Yu Family Tomb／郁氏山壯', url: 'https://www.virtualshanghai.net/数据/建筑?ID=1566' },
    ],
  },
  {
    "id": "park-113-building-1485",
    "canonicalFeatureId": "landmark-bansong-yuan-vanished-8",
    "memberFeatureIds": [
      "landmark-vs-site-1485"
    ],
    "expectedBuildingIds": [
      1485
    ],
    "expectedParkIds": [
      113
    ],
    "currentUseFromFeatureId": "landmark-vs-site-1485",
    "nameZh": "半淞园",
    "aliases": [
      "半淞园"
    ],
    "note": "Bansong Yuan与Bansong Garden均指半淞园。两份资料的建园年份分别记为1917与1918，名称与地点一并展示，年份差异保留于史料。",
    "sources": [
      {
        "title": "Virtual Shanghai：公园原表（公园113关联建筑1485）",
        "url": "https://www.virtualshanghai.net/Data/Tables?ID=206"
      },
      {
        "title": "Virtual Shanghai：Bansong Garden",
        "url": "https://www.virtualshanghai.net/Data/Buildings?ID=1485"
      }
    ]
  },
  {
    "id": "park-62-building-91",
    "canonicalFeatureId": "landmark-pahsienjao-cemetery-huaihai-gongyuan-9",
    "memberFeatureIds": [
      "landmark-vs-site-91"
    ],
    "expectedBuildingIds": [
      91
    ],
    "expectedParkIds": [
      62
    ],
    "nameZh": "八仙桥公墓",
    "aliases": [
      "八仙桥公墓"
    ],
    "category": "历史墓园",
    "historicalUse": "cemetery",
    "note": "Pahsienjao Cemetery与附注Baxianqiao的记录均指八仙桥公墓，历史门牌同为156 ROUTE VOUILLEMONT。两份资料分别记1865与1860年，不能据此把年代差异消除。",
    "sources": [
      {
        "title": "Virtual Shanghai：公园原表（公园62关联建筑91）",
        "url": "https://www.virtualshanghai.net/Data/Tables?ID=206"
      },
      {
        "title": "Virtual Shanghai：Pahsienjao Cemetery (Baxianqiao)",
        "url": "https://www.virtualshanghai.net/Data/Buildings?ID=91"
      }
    ]
  },
  {
    "id": "park-74-building-1404",
    "canonicalFeatureId": "park-jessfield-park",
    "memberFeatureIds": [
      "landmark-vs-site-1404"
    ],
    "expectedBuildingIds": [
      1404
    ],
    "expectedParkIds": [
      74
    ],
    "currentUseFromFeatureId": "landmark-vs-site-1404",
    "aliases": [
      "兆丰公园"
    ],
    "note": "Jessfield Park与兆丰公园为同一公园的中英文名称，两份记录合并展示。",
    "sources": [
      {
        "title": "Virtual Shanghai：公园原表（公园74关联建筑1404）",
        "url": "https://www.virtualshanghai.net/Data/Tables?ID=206"
      },
      {
        "title": "Virtual Shanghai：Jessfield Park",
        "url": "https://www.virtualshanghai.net/Data/Buildings?ID=1404"
      }
    ]
  },
  {
    "id": "park-67-building-1096",
    "canonicalFeatureId": "landmark-bubbling-well-road-cemetery-jing-an-gongyuan-29",
    "memberFeatureIds": [
      "landmark-vs-site-1096"
    ],
    "expectedBuildingIds": [
      1096
    ],
    "expectedParkIds": [
      67
    ],
    "currentUseFromFeatureId": "landmark-vs-site-1096",
    "nameZh": "静安寺路外国公墓",
    "aliases": [
      "静安寺路外国公墓"
    ],
    "category": "历史墓园",
    "historicalUse": "cemetery",
    "note": "Bubbling Well Road Cemetery与静安寺路外国公墓为同一墓园，两份记录的历史门牌均为1649 BUBBLING WELL ROAD。",
    "sources": [
      {
        "title": "Virtual Shanghai：公园原表（公园67关联建筑1096）",
        "url": "https://www.virtualshanghai.net/Data/Tables?ID=206"
      },
      {
        "title": "Virtual Shanghai：Bubbling Well Road Cemetery",
        "url": "https://www.virtualshanghai.net/Data/Buildings?ID=1096"
      }
    ]
  },
  {
    "id": "park-115-building-1092",
    "canonicalFeatureId": "landmark-hardoon-garden-vanished-32",
    "memberFeatureIds": [
      "landmark-vs-site-1092"
    ],
    "expectedBuildingIds": [
      1092
    ],
    "expectedParkIds": [
      115
    ],
    "currentUseFromFeatureId": "landmark-vs-site-1092",
    "nameZh": "爱俪园",
    "aliases": [
      "爱俪园",
      "哈同花园",
      "爱俪园（哈同花园）"
    ],
    "note": "两份Hardoon Garden记录均指爱俪园（哈同花园），历史门牌同为1273 BUBBLING WELL ROAD。资料分别记1909与1904年，年份差异保留于史料。",
    "sources": [
      {
        "title": "Virtual Shanghai：公园原表（公园115关联建筑1092）",
        "url": "https://www.virtualshanghai.net/Data/Tables?ID=206"
      },
      {
        "title": "Virtual Shanghai：Hardoon Garden",
        "url": "https://www.virtualshanghai.net/Data/Buildings?ID=1092"
      }
    ]
  },
  {
    "id": "park-110-building-1314",
    "canonicalFeatureId": "park-studley-park",
    "memberFeatureIds": [
      "landmark-vs-site-1314"
    ],
    "expectedBuildingIds": [
      1314
    ],
    "expectedParkIds": [
      110
    ],
    "currentUseFromFeatureId": "landmark-vs-site-1314",
    "aliases": [
      "斯塔德利公园"
    ],
    "note": "两份Studley Park记录指同一公园，历史门牌均为102 WAYSIDE ROAD，合并展示并保留原名称记录。",
    "sources": [
      {
        "title": "Virtual Shanghai：公园原表（公园110关联建筑1314）",
        "url": "https://www.virtualshanghai.net/Data/Tables?ID=206"
      },
      {
        "title": "Virtual Shanghai：Studley Park",
        "url": "https://www.virtualshanghai.net/Data/Buildings?ID=1314"
      }
    ]
  },
  {
    "id": "park-116-building-1071",
    "canonicalFeatureId": "landmark-nanyang-gongyuan-vanished-71",
    "memberFeatureIds": [
      "landmark-vs-site-1071"
    ],
    "expectedBuildingIds": [
      1071
    ],
    "expectedParkIds": [
      116
    ],
    "nameZh": "南阳公园",
    "aliases": [
      "南阳公园"
    ],
    "note": "南阳公园与工部局儿童游乐场（Children’s Playground, SMC）在来源中关联同一地点，历史门牌同为南阳路169号；这里统一展示园地，保留公园与游乐场两种记载。",
    "sources": [
      {
        "title": "Virtual Shanghai：公园原表（公园116关联建筑1071）",
        "url": "https://www.virtualshanghai.net/Data/Tables?ID=206"
      },
      {
        "title": "Virtual Shanghai：Children's Playground (SMC)",
        "url": "https://www.virtualshanghai.net/Data/Buildings?ID=1071"
      }
    ]
  },
  {
    "id": "park-103-building-1677",
    "canonicalFeatureId": "landmark-chinese-public-garden-vanished-73",
    "memberFeatureIds": [
      "landmark-vs-site-1677"
    ],
    "expectedBuildingIds": [
      1677
    ],
    "expectedParkIds": [
      103
    ],
    "nameZh": "华人公园 / 河浜公园",
    "aliases": [
      "华人公园 / 河浜公园",
      "华人公园",
      "河浜公园"
    ],
    "note": "Chinese Public Garden与Hebang Park分别对应华人公园、河浜公园。原公园表将这两个中文名并列，均记SOOCHOW ROAD。",
    "sources": [
      {
        "title": "Virtual Shanghai：公园原表（公园103关联建筑1677）",
        "url": "https://www.virtualshanghai.net/Data/Tables?ID=206"
      },
      {
        "title": "Virtual Shanghai：Hebang Park",
        "url": "https://www.virtualshanghai.net/Data/Buildings?ID=1677"
      }
    ]
  },
  {
    "id": "park-140-building-1727",
    "canonicalFeatureId": "landmark-chang-su-hos-garden-vanished-78",
    "memberFeatureIds": [
      "landmark-vs-site-1727"
    ],
    "expectedBuildingIds": [
      1727
    ],
    "expectedParkIds": [
      140
    ],
    "nameZh": "张园",
    "aliases": [
      "张园"
    ],
    "note": "Chang Su Hos Garden与Zhang Garden均指张园。原公园表同时记ZHANG YUAN，位置均在MOULMEIN ROAD与WEIHAIWEI ROAD路口。",
    "sources": [
      {
        "title": "Virtual Shanghai：公园原表（公园140关联建筑1727）",
        "url": "https://www.virtualshanghai.net/Data/Tables?ID=206"
      },
      {
        "title": "Virtual Shanghai：Zhang Garden",
        "url": "https://www.virtualshanghai.net/Data/Buildings?ID=1727"
      }
    ]
  },
  {
    "id": "park-35-building-500",
    "canonicalFeatureId": "park-public-gardens",
    "memberFeatureIds": [
      "landmark-vs-site-500"
    ],
    "expectedBuildingIds": [
      500
    ],
    "expectedParkIds": [
      35
    ],
    "currentUseFromFeatureId": "landmark-vs-site-500",
    "aliases": [
      "外滩公园"
    ],
    "note": "Public Gardens与外滩公园为同一历史公园；公园表中的Huangpu Gongyuan为该地点后来的名称，现合并展示。",
    "sources": [
      {
        "title": "Virtual Shanghai：公园原表（公园35关联建筑500）",
        "url": "https://www.virtualshanghai.net/Data/Tables?ID=206"
      },
      {
        "title": "Virtual Shanghai：Public Gardens",
        "url": "https://www.virtualshanghai.net/Data/Buildings?ID=500"
      }
    ]
  },
  {
    "id": "buildings-359-4135",
    "canonicalFeatureId": "landmark-vs-site-359",
    "memberFeatureIds": [
      "landmark-vs-site-4135"
    ],
    "expectedBuildingIds": [
      359,
      4135
    ],
    "expectedParkIds": [],
    "historicalName": "Kelmscott Garden",
    "note": "Kelmsott Garden与Kelmscott Garden为同一地点的拼写差异，历史门牌均为188 AVENUE DU ROI ALBERT，两个原地图点重合。",
    "sources": [
      {
        "title": "Virtual Shanghai：建筑记录 359",
        "url": "https://www.virtualshanghai.net/Data/Buildings?ID=359"
      },
      {
        "title": "Virtual Shanghai：建筑记录 4135",
        "url": "https://www.virtualshanghai.net/Data/Buildings?ID=4135"
      }
    ]
  },
  {
    "id": "buildings-408-4154",
    "canonicalFeatureId": "landmark-vs-site-408",
    "memberFeatureIds": [
      "landmark-vs-site-4154"
    ],
    "expectedBuildingIds": [
      408,
      4154
    ],
    "expectedParkIds": [],
    "historicalName": "Dahua Hospital",
    "nameZh": "大华医院",
    "note": "Dahua Hospital与Da Wha Hospital为“大華醫院”的不同英文转写，历史门牌均为19 ROUTE POTTIER，两个原地图点重合。",
    "sources": [
      {
        "title": "Virtual Shanghai：建筑记录 408",
        "url": "https://www.virtualshanghai.net/Data/Buildings?ID=408"
      },
      {
        "title": "Virtual Shanghai：建筑记录 4154",
        "url": "https://www.virtualshanghai.net/Data/Buildings?ID=4154"
      }
    ]
  },
]
