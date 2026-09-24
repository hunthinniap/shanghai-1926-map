import fs from 'node:fs'
import crypto from 'node:crypto'

const directory = 'research/rechecks/2026-09-20-heritage-card-review'
const inputs = {
  historical: 'public/data/historical-features.geojson',
  liveBuildings: 'scripts/data/virtual-shanghai-buildings-live.json',
  heritage: 'public/data/shanghai-excellent-historical-buildings/buildings-enriched.json',
  heritageMap: 'public/data/shanghai-excellent-historical-buildings/map-buildings.geojson',
  research: 'research/unresolved-landmarks/019-a.json',
  currentUseHolds: 'scripts/data/landmark-current-use-holds.json',
}
const read = (path) => JSON.parse(fs.readFileSync(path, 'utf8'))
const hash = (path) => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex')
const unique = (values) => [...new Set(values.filter(Boolean))]

const historical = read(inputs.historical).features.find((feature) =>
  feature.properties.id === 'landmark-vs-site-1552')
const live = read(inputs.liveBuildings).records.find((record) => record.id === 1552)
const heritage = read(inputs.heritage).records.find((record) => record.id === 'sh-fgj-4D047-01')
const heritageMap = read(inputs.heritageMap).features.find((feature) =>
  feature.properties.officialId === 'sh-fgj-4D047-01')
const research = read(inputs.research).find((record) => record.IDBAT === 1552)
if (!historical || !live || !heritage || !heritageMap || !research) {
  throw new Error('徐家汇观象台补充候选输入不完整')
}
if (historical.properties.sourceRecordIds?.join(',') !== '1552'
  || live.name !== 'Siccawei Observatory'
  || heritage.code !== '4D047'
  || heritageMap.properties.coordinateSystem !== 'WGS84') {
  throw new Error('徐家汇观象台补充候选的来源身份发生变化，需重新复核')
}

function distance(a, b) {
  const rad = Math.PI / 180
  const dlat = (a[1] - b[1]) * rad
  const dlon = (a[0] - b[0]) * rad
  const q = Math.sin(dlat / 2) ** 2
    + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dlon / 2) ** 2
  return Math.round(6371008.8 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q)))
}

const sourceUrls = unique([
  live.sourceUrl,
  heritage.official.source.url,
  ...research.sources.map((source) => source.url),
  heritageMap.properties.sourceUrl,
])
const candidate = {
  candidateId: 'landmark-vs-site-1552__sh-fgj-4D047-01',
  classification: 'reviewed-alias-with-coordinate-conflict',
  landmark: {
    featureId: historical.properties.id,
    featureGroupId: historical.properties.featureGroupId,
    featureIds: [historical.properties.id],
    sourceRecordIds: [1552],
    sourceParkRecordIds: [],
    displayName: historical.properties.historicalName,
    displayChinese: historical.properties.modernNameZh,
    names: [
      { value: 'Siccawei Observatory', normalized: 'siccaweiobservatory', role: 'historical-name-or-alias', source: 'runtime-landmark' },
      { value: '气象台', normalized: '气象台', role: 'historical-name-or-alias', source: 'runtime-landmark' },
      { value: '徐家汇观象台', normalized: '徐家汇观象台', role: 'reviewed-historical-alias', source: '上海天文台史料' },
      { value: '徐家汇天文台', normalized: '徐家汇天文台', role: 'reviewed-historical-alias', source: '上海天文台史料' },
    ],
    historicalAddresses: [{
      address: live.address,
      sourceRecordId: live.id,
      sourceUrl: live.sourceUrl,
      oldStreetNumber: null,
      historicalStreet: 'CAOXI BEILU XUJIAHUI',
      modernRoadNameHints: ['漕溪北路'],
      warning: '原记录未载门牌；道路名对照不证明原点就是现存楼位置。',
    }],
    currentAddresses: [research.currentAddress],
    currentNames: [research.currentNameZh],
    currentUseRelationships: [],
    currentUseMatches: [],
    currentUseNotes: [research.notes],
    persistentHolds: [],
    sourceReferences: sourceUrls,
    labelYears: [1872],
    coordinate: historical.geometry.coordinates,
    method: 'source-point',
  },
  heritage: {
    officialId: heritage.id,
    batch: heritage.batch,
    code: heritage.code,
    originalName: heritage.official.originalNameOrUse,
    listedName: heritage.official.listedNameOrUse,
    address: heritage.official.addressAsListed,
    wikipediaAddress: heritage.wikipedia?.addressAsListed,
    components: heritage.wikipedia?.components ?? [],
    names: [
      { value: heritage.official.originalNameOrUse, normalized: '徐家汇观象天文台', role: 'official-original-name', source: 'shanghai-fgj', url: heritage.official.source.url },
      { value: heritage.wikipedia.originalNameOrUse, normalized: '徐家汇天文台', role: 'wikipedia-original-name', source: 'wikipedia-list', url: heritage.wikipedia.source.url },
      { value: heritageMap.properties.articleTitle, normalized: '徐家汇观象台', role: 'building-article-title', source: heritageMap.properties.origin, url: heritageMap.properties.sourceUrl },
    ],
    addresses: unique([heritage.official.addressAsListed, heritage.wikipedia?.addressAsListed]),
    coordinate: heritageMap.geometry.coordinates,
    coordinateScope: heritageMap.properties.coordinateScope,
    locationSource: {
      origin: heritageMap.properties.origin,
      sourceUrl: heritageMap.properties.sourceUrl,
      articleTitle: heritageMap.properties.articleTitle,
    },
    addressClass: 'single-door',
    flags: [],
    sourceReferences: unique([
      heritage.official.source.url,
      ...heritage.articleReferences.map((reference) => reference.url),
      heritageMap.properties.sourceUrl,
    ]),
    constructionDate: heritage.wikipedia?.constructionDateText ?? null,
  },
  distanceMetres: distance(historical.geometry.coordinates, heritageMap.geometry.coordinates),
  evidence: {
    nameMatches: [{
      landmark: 'Siccawei Observatory',
      heritage: '徐家汇观象台',
      match: 'reviewed-historical-translation',
      sources: [
        'https://www.shao.ac.cn/2020Ver/gkjj/lsyg/',
        heritageMap.properties.sourceUrl,
      ],
    }],
    addressMatches: [],
    sharedSourceUrls: [],
  },
  hazards: [
    'coordinate-separation-over-250m',
    '1872-institution-record-precedes-1901-listed-building',
    'source-point-conflicts-with-documented-100m-relocation',
  ],
  reason: '补充候选不依赖距离：权威史料将Siccawei Observatory与徐家汇观象台直接对应，但原始点与现存楼相距超过文献所载100米迁移，必须保留坐标异常说明。',
}

const historicalFeatures = read(inputs.historical).features
const liveRecords = read(inputs.liveBuildings).records
const heritageRecords = read(inputs.heritage).records
const heritageFeatures = read(inputs.heritageMap).features
const currentUseHolds = read(inputs.currentUseHolds)
const normalized = (value) => value?.normalize('NFKC').toLocaleLowerCase('zh-CN')
  .replace(/[\s\p{P}\p{S}]/gu, '') ?? ''

function buildReviewedCandidate({
  sourceId,
  officialId,
  reviewedNames,
  evidence,
  hazards,
  reason,
  classification = 'reviewed-cross-language-or-complex-identity',
}) {
  const landmark = historicalFeatures.find((feature) => feature.properties.id === `landmark-vs-site-${sourceId}`)
  const building = liveRecords.find((record) => record.id === sourceId)
  const listing = heritageRecords.find((record) => record.id === officialId)
  const listedFeature = heritageFeatures.find((feature) => feature.properties.officialId === officialId)
  if (!landmark || !building || !listing || !listedFeature) {
    throw new Error(`补充候选输入不完整：${sourceId} / ${officialId}`)
  }
  const sourceRecordIds = landmark.properties.sourceRecordIds ?? []
  const buildings = sourceRecordIds.map((id) => liveRecords.find((record) => record.id === id))
  if (!sourceRecordIds.includes(sourceId) || buildings.some((record) => !record)
    || listedFeature.properties.coordinateSystem !== 'WGS84') {
    throw new Error(`补充候选的来源身份发生变化，需重新复核：${sourceId} / ${officialId}`)
  }
  const landmarkSources = unique([
    ...buildings.map((record) => record.sourceUrl),
    ...Object.values(landmark.properties.sourceUrls ?? {}),
    ...(landmark.properties.currentUseSources ?? []).map((source) => source.url),
  ])
  return {
    candidateId: `${landmark.properties.id}__${officialId}`,
    classification,
    landmark: {
      featureId: landmark.properties.id,
      featureGroupId: landmark.properties.featureGroupId,
      featureIds: [landmark.properties.id],
      sourceRecordIds,
      sourceParkRecordIds: [],
      displayName: landmark.properties.historicalName,
      displayChinese: landmark.properties.modernNameZh,
      names: unique([
        landmark.properties.historicalName,
        landmark.properties.modernNameZh,
        landmark.properties.currentNameZh,
        ...reviewedNames,
      ]).map((value) => ({ value, normalized: normalized(value), role: 'reviewed-historical-name-or-alias', source: 'reviewed-supplement' })),
      historicalAddresses: buildings.map((record) => ({
        address: record.address,
        sourceRecordId: record.id,
        sourceUrl: record.sourceUrl,
        oldStreetNumber: /^\d+/.exec(record.address)?.[0] ?? null,
        historicalStreet: record.address.replace(/^\d+\s*/, '') || null,
        modernRoadNameHints: [],
        warning: record.address.includes('??') ? '来源未载确切旧门牌；关联只适用于历史建筑群范围。' : null,
      })),
      currentAddresses: unique([landmark.properties.currentAddress]),
      currentNames: unique([landmark.properties.currentNameZh]),
      currentUseRelationships: unique([landmark.properties.currentUseRelationship]),
      currentUseMatches: unique([landmark.properties.currentUseMatch]),
      currentUseNotes: unique([landmark.properties.currentUseNote]),
      persistentHolds: currentUseHolds.filter((hold) => sourceRecordIds.some((id) => hold.sourceRecordIds?.includes(id))),
      sourceReferences: landmarkSources,
      labelYears: landmark.properties.labelYearIsFallback ? [] : [landmark.properties.labelYear],
      coordinate: landmark.geometry.coordinates,
      method: 'source-point',
    },
    heritage: {
      officialId: listing.id,
      batch: listing.batch,
      code: listing.code,
      originalName: listing.official.originalNameOrUse,
      listedName: listing.official.listedNameOrUse,
      address: listing.official.addressAsListed,
      wikipediaAddress: listing.wikipedia?.addressAsListed,
      components: listing.wikipedia?.components ?? [],
      names: unique([
        listing.official.originalNameOrUse,
        listing.official.listedNameOrUse,
        listing.wikipedia?.originalNameOrUse,
        listing.wikipedia?.listedNameOrUse,
        listedFeature.properties.articleTitle,
      ]).map((value) => ({ value, normalized: normalized(value), role: 'official-or-article-name', source: 'heritage-directory' })),
      addresses: unique([listing.official.addressAsListed, listing.wikipedia?.addressAsListed]),
      coordinate: listedFeature.geometry.coordinates,
      coordinateScope: listedFeature.properties.coordinateScope,
      locationSource: {
        origin: listedFeature.properties.origin,
        sourceUrl: listedFeature.properties.sourceUrl,
        articleTitle: listedFeature.properties.articleTitle,
      },
      addressClass: 'reviewed-listed-address',
      flags: [],
      sourceReferences: unique([
        listing.official.source.url,
        ...(listing.articleReferences ?? []).map((reference) => reference.url),
        listedFeature.properties.sourceUrl,
      ]),
      constructionDate: listing.wikipedia?.constructionDateText ?? listedFeature.properties.constructionDate ?? null,
    },
    distanceMetres: distance(landmark.geometry.coordinates, listedFeature.geometry.coordinates),
    evidence: { nameMatches: evidence, addressMatches: [], sharedSourceUrls: [] },
    hazards,
    reason,
  }
}

const additionalCandidates = [
  buildReviewedCandidate({
    sourceId: 1710,
    officialId: 'sh-fgj-4G010-01',
    reviewedNames: ['Deng\'ai Hospital', '澄哀醫院', '澄衷医院', '澄衷肺病疗养院'],
    evidence: [{
      landmark: 'Deng\'ai Hospital／澄哀醫院；1932年；?? ZHENGMIN LU',
      heritage: '叶家花园（小白楼）／澄衷医院；政民路507号',
      match: 'probable-same-hospital-site-with-source-name-and-date-conflicts',
      sources: [
        'https://www.virtualshanghai.net/data/buildings?ID=1710',
        'https://www.shsfkyy.com/upload/files/2023/11/720127be61e34a8c.pdf',
        'https://yptimes.shyp.gov.cn/html/2017-12/14/content_4_3.htm',
      ],
    }],
    hazards: ['source-chinese-and-english-names-conflict-with-verified-hospital-name', 'source-1932-precedes-verified-1933-hospital-opening', 'hospital-site-not-identical-to-listed-white-hall-building'],
    reason: 'VS记录为政民路附近的医院，但将中文写作澄哀、英文写作Deng’ai、年份写1932；医院和杨浦史料均确认1933年在叶家花园设澄衷医院。地名、医院类型、近邻点位及近似中文名支持同一院址的展示关联，原始名称和年份仍保留为待核异文，不把该记录直接等同小白楼楼体。',
    classification: 'reviewed-probable-hospital-site-with-source-conflicts',
  }),
  buildReviewedCandidate({
    sourceId: 1174,
    officialId: 'sh-fgj-5B050-01',
    reviewedNames: ['SMC Primary School', '工部局小學', '上海市第一中学', '工部局华人女子中学'],
    evidence: [{
      landmark: 'SMC Primary School／工部局小學；1933年；966 CHANGDE ROAD',
      heritage: '工部局华人女子中学／上海市第一女子中学；余姚路139号',
      match: 'reviewed-same-campus-vicinity-not-school-institution-identity',
      sources: [
        'https://www.virtualshanghai.net/data/buildings?rp=1200',
        'https://fgj.sh.gov.cn/yxlsjz1/20200414/b9946bf8508e4b9689671fcd4146bb86.html',
        'https://xmwb.xinmin.cn/history/xmwb/page/1/2007-04-28/A106/19781177735152562.pdf',
      ],
    }],
    hazards: ['primary-school-versus-girls-middle-school-not-same-institution', 'old-966-versus-later-964-door-number-unresolved', 'listed-1935-building-postdates-1933-record'],
    reason: '旧966 CHANGDE ROAD的1933年工部局小学点距余姚路139号名录参考点约57米；上海市第一中学2007年刊登的学校地址为常德路964号，表明同一学校校区另有常德路门址。仅按相邻门址／学校院落语境建立候选，不把小学等同女中、不认定旧966号与今964号为同一门牌，也不认为1933年记录对应1935年名录主楼。',
  }),
  buildReviewedCandidate({
    sourceId: 1213,
    officialId: 'sh-fgj-3N005-01',
    reviewedNames: ['Flour Mill', '麵粉廠', '阜丰面粉厂', '福新面粉厂'],
    evidence: [{
      landmark: 'Flour Mill／麵粉廠（#1213、#1214；126 MOKANSHAN ROAD；1898、1913年）',
      heritage: '福新面粉厂、阜丰面粉厂／莫干山路120号',
      match: 'reviewed-former-flour-mill-complex-context-not-individual-building',
      sources: [
        'https://fgj.sh.gov.cn/yxlsjz1/20200331/2447d47b3e2947bfba7c64ed04a758a7.html',
        'https://www.shpt.gov.cn/csjd-jiedaozhen/sydb-scjd/20220211/832194.html',
      ],
    }],
    hazards: ['generic-historical-name', 'factory-complex-not-individual-building', 'old-126-versus-listed-120-unresolved'],
    reason: '两条泛名面粉厂记录已在原数据中聚为一处，旧址均记126 MOKANSHAN ROAD、年代分别为1898和1913；坐标落在阜丰、福新厂区段。普陀区资料明确1898年阜丰建厂和1913年福新在其西侧建厂，房管名录将两厂列同一3N005建筑群。按旧厂区语境共卡，不把泛名记录分配给具体厂房，也不推断126号曾重编为120号。',
  }),
  buildReviewedCandidate({
    sourceId: 1437,
    officialId: 'sh-fgj-4M008-01',
    reviewedNames: ['Yiding Apartments', '憶定邨', '忆定村'],
    evidence: [{
      landmark: '憶定邨／495 EDINBURGH ROAD', heritage: '忆定村／江苏路495弄',
      match: 'traditional-simplified-name-and-renamed-road-same-door',
      sources: [
        'https://www.ccphistory.org.cn/shds/shhm/content/d254f2b6-ddcb-43e7-a32e-002d8d4798c8.html',
        'https://www.shcn.gov.cn/col6991/20260224/1305931.html',
      ],
    }],
    hazards: ['estate-reference-point-not-individual-building'],
    reason: 'VS的憶定邨与名录忆定村为繁简名称对应；原495 EDINBURGH ROAD所在忆定盘路即今江苏路，名录地址江苏路495弄，1934年一致。按整处里弄住宅群关联，不指定原点为某一栋。',
  }),
  buildReviewedCandidate({
    sourceId: 1466,
    officialId: 'sh-fgj-2C014-01',
    reviewedNames: ['Jiangnan Arsenal', 'Kiangnan Arsenal', '江南製造總局', '江南制造总局', '江南制造局', '江南机器制造总局', '江南造船厂'],
    evidence: [{
      landmark: 'Jiangnan Arsenal', heritage: '江南制造局', match: 'reviewed-historical-translation',
      sources: ['https://www.wikidata.org/wiki/Q10377974', 'https://zh.wikipedia.org/wiki/江南機器製造總局'],
    }],
    hazards: ['large-industrial-complex', 'listed-entry-protects-selected-components', 'unknown-historical-door-number'],
    reason: 'Jiangnan Arsenal是江南制造总局／江南制造局的通行英文名。名录2C014仅列总办公楼、2号船坞、指挥楼、飞机车间等保留构筑物；关联按旧厂区建筑群，不把VS点认作其中某栋。',
  }),
  buildReviewedCandidate({
    sourceId: 1661,
    officialId: 'sh-fgj-5F002-01',
    reviewedNames: ['Hongkou Police Station', 'Hongkew Police Station', '虹口巡捕房', '上海公共租界虹口捕房', '上海市警察局虹口分局', '公安大楼'],
    evidence: [{
      landmark: 'Hongkou Police Station', heritage: '上海市警察局虹口分局', match: 'reviewed-institutional-site-succession',
      sources: [
        'https://www.shhk.gov.cn/xwzx/002008/002008040/20240321/a9e9a2b2-08e9-464f-a468-808d4ed223a5.html',
        'https://www.shhk.gov.cn/xwzx/002009/002009002/20180410/590e3e68-11be-4e22-b2a6-5a8060287232.html',
      ],
    }],
    hazards: ['same-police-compound-not-same-building', 'original-station-building-demolished', 'listed-building-is-police-apartment'],
    reason: 'Hongkou Police Station即公共租界虹口捕房；1943年院产和警务由上海市警察局虹口分局接管。名录5F002的塘沽路219号公安大楼是同一警务院落的警察公寓，不是已拆除的闵行路260号旧捕房主楼。',
  }),
]

// User-reviewed display policy for otherwise anonymous housing records:
// group only when the old/current road is the same and the listed residential
// point is within 125 m. This is intentionally not an identity assertion.
const residentialContextSpecs = [
  [294, 'sh-fgj-2C009-01', 'ROUTE BOURGEAT／长乐路，约83米；原273号与名录197—247号范围不相接，故仅作同路段住宅语境。'],
  [348, 'sh-fgj-2C010-01', 'AVENUE DU ROI ALBERT／陕西南路，约101米；与已核定的King Albert Apartments记录共卡，但本条不核定为陕南村成员。'],
  [369, 'sh-fgj-2B007-01', 'AVENUE FOCH／延安中路，约42米，历史与今门牌均为877号；无专名记录仍只按住宅语境归并。'],
  [377, 'sh-fgj-5B026-01', 'ROUTE BOURGEAT／长乐路，约93米；旧698号邻近今672弄，未核定为留园建筑群成员。'],
  [378, 'sh-fgj-5B037-01', 'ROUTE RATARD／巨鹿路，约99米；旧741号邻近今735号，未核定为同一栋。'],
  [382, 'sh-fgj-3B017-01', 'ROUTE AMIRAL COURBET／富民路，约58米；旧210号与今210弄同路同号段，未核定具体楼栋。'],
  [390, 'sh-fgj-5D067-01', 'ROUTE DE GROUCHY／延庆路，约55米；旧4—44号与名录4弄2—44号范围高度相近，仍按邻近住宅语境处理。'],
  [1009, 'sh-fgj-2B004-01', 'BUBBLING WELL ROAD／MEDHURST ROAD路口距MEDHURST大楼约71米；无专名记录按路口住宅语境归并。'],
  [1759, 'sh-fgj-5D006-01', 'ROUTE RAYMOND TENANT DE LA TOUR同路段已有Belmont Apartment／襄阳公寓核定锚点；本条旧275号距名录点约111米，仅作邻近语境。'],
  [1761, 'sh-fgj-5D063-01', 'AVENUE DU ROI ALBERT／陕西南路，约124米；旧257号邻近今222弄，不核定为同一栋。'],
  [1767, 'sh-fgj-5D016-01', 'ROUTE CHARLES CULTY／湖南路，约53米；与旧266号记录共同归入湖南路276号住宅卡，但不核定为同一栋。'],
  [1781, 'sh-fgj-5D045-01', 'ROUTE PAUL HENRY／新乐路，约59米；旧7号与名录22—32号仅作同路段住宅语境。'],
]
const residentialContextCandidates = residentialContextSpecs.map(([sourceId, officialId, reason]) =>
  buildReviewedCandidate({
    sourceId,
    officialId,
    reviewedNames: [],
    evidence: [{
      landmark: liveRecords.find((record) => record.id === sourceId)?.address,
      heritage: heritageRecords.find((record) => record.id === officialId)?.official.addressAsListed,
      match: 'reviewed-same-road-nearby-residential-context',
      sources: unique([
        liveRecords.find((record) => record.id === sourceId)?.sourceUrl,
        heritageRecords.find((record) => record.id === officialId)?.official.source.url,
      ]),
    }],
    hazards: ['proximity-grouping-not-identity', 'do-not-infer-same-building-or-current-use'],
    reason,
    classification: 'reviewed-nearby-residential-context',
  }))
for (const candidate of residentialContextCandidates) {
  if (candidate.distanceMetres > 125
    || !['apartments', 'residential complex'].includes(
      liveRecords.find((record) => record.id === candidate.landmark.sourceRecordIds[0])?.name?.toLowerCase()
    )) throw new Error(`无名住宅候选不符合125米／类型限制：${candidate.candidateId}`)
}

const frozenResidentialContextIds = [219, 1766, 1782]
const excludedResidentialContexts = [
  { sourceId: 67, reason: '125米内没有同一路名的住宅类名录项。' },
  { sourceId: 438, reason: '125米内最近住宅名录项在五原路；原址为ROUTE ALFRED MAGY（乌鲁木齐中路），不同路。' },
  { sourceId: 1193, reason: '最近住宅类名录项超过700米。' },
  { sourceId: 1773, reason: '最近住宅类名录项约149米且不在ROUTE DELAUNAY／德昌路，超过本轮规则。' },
]
const genericResidentialIds = liveRecords.filter((record) =>
  ['apartments', 'residential complex'].includes(record.name?.toLowerCase()) && !record.nameZh)
  .map((record) => record.id).sort((a, b) => a - b)
const reviewedResidentialIds = [...residentialContextSpecs.map(([id]) => id),
  ...frozenResidentialContextIds, ...excludedResidentialContexts.map(({ sourceId }) => sourceId)]
  .sort((a, b) => a - b)
if (genericResidentialIds.join(',') !== reviewedResidentialIds.join(',')) {
  throw new Error(`无名住宅归并清单未覆盖全部记录：${genericResidentialIds.join(',')} / ${reviewedResidentialIds.join(',')}`)
}

const output = {
  schemaVersion: 1,
  generatedAt: '2026-09-22',
  status: 'manually-routed-candidates-missing-from-frozen-automatic-screen',
  methodology: {
    inputs: Object.fromEntries(Object.entries(inputs).map(([name, path]) => [name, { path, sha256: hash(path) }])),
    reason: '冻结498对自动筛查未覆盖跨语言别名、建筑群范围、坐标相距较大的明确实体、邻近校址语境，以及用户授权的无名住宅邻近归并；本文件只补充可复核候选，不自动授权合并。',
  },
  residentialContextPolicy: {
    namesInScope: ['Apartments', 'Residential Complex'],
    rule: '无中文专名，新旧路名对应，住宅类名录参考点不超过125米；只作同路段展示归并，不证明同一栋或同一建筑群。',
    frozenCandidateSourceIds: frozenResidentialContextIds,
    excluded: excludedResidentialContexts,
  },
  candidates: [candidate, ...additionalCandidates, ...residentialContextCandidates],
}
const path = `${directory}/supplemental-candidates.json`
const content = JSON.stringify(output, null, 2) + '\n'
if (process.argv.includes('--check')) {
  if (fs.readFileSync(path, 'utf8') !== content) throw new Error(`Stale output: ${path}`)
} else fs.writeFileSync(path, content)
console.log(`${process.argv.includes('--check') ? 'Verified' : 'Wrote'} ${output.candidates.length} supplemental candidates`)
