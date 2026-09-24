import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { heritageLandmarkLinks } from '../data/heritageLandmarkLinks'
import { landmarkSiteLinks } from '../data/landmarkSiteLinks'
import type { HistoricalFeatureCollection } from '../types'
import type { HeritageBuildingCollection } from './heritageBuildings'
import { linkHeritageLandmarks, withReviewedHeritageAliases } from './heritageLandmarkLinks'
import { makeSearchRecords, searchRecords } from './search'
import { mergeCuratedParkFeatures } from './parkLabels'
import { mergeLandmarkSites } from './landmarkSites'

const historical = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
const heritage = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8')) as HeritageBuildingCollection
const nanjing = heritageLandmarkLinks.filter((link) => link.officialId === 'sh-fgj-4A016-01')

describe('reviewed heritage and historical landmark identities', () => {
  it('uses the heritage point for Nanjing Hotel without changing either source collection', () => {
    const oldSnapshot = JSON.stringify(historical)
    const heritageSnapshot = JSON.stringify(heritage)
    const linked = linkHeritageLandmarks(historical, heritage, nanjing)
    const place = linked.byOfficialId.get('sh-fgj-4A016-01')!
    expect(linked.byGroupId.get('landmark-vs-site-609')).toBe(place)
    const positioned = linked.features.features.find((feature) => feature.properties.id === 'landmark-vs-site-609')!
    expect(positioned.geometry).toEqual(place.heritage.geometry)
    expect(place.landmark.geometry).toEqual({ type: 'Point', coordinates: [121.477603, 31.239438] })
    expect(positioned.properties.sourceRecordIds).toEqual([609])
    expect(place.link.historicalAddresses[0].address).toBe('200 SHANSE ROAD')
    expect(JSON.stringify(historical)).toBe(oldSnapshot)
    expect(JSON.stringify(heritage)).toBe(heritageSnapshot)
    expect(linked.features.features.filter((feature) => feature.properties.id !== 'landmark-vs-site-609'))
      .toEqual(historical.features.filter((feature) => feature.properties.id !== 'landmark-vs-site-609'))
  })

  it('finds the shared building by its historical name, listed name and both addresses', () => {
    const linked = linkHeritageLandmarks(historical, heritage, nanjing)
    const records = makeSearchRecords(linked.features.features)
    for (const name of ['Nanjing Hotel', '南京饭店', '200 SHANSE ROAD', '山西南路182-200号']) {
      expect(searchRecords(records, name).map((record) => record.featureGroupId)).toEqual(['landmark-vs-site-609'])
    }
  })

  it('groups Yejia Garden and the probable mislabelled hospital with White Hall without equating their footprints', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-4G010-01')!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byGroupId.get('landmark-vs-site-1711')!
    expect(place.link.relation).toBe('same-historical-site')
    expect(place.link.scopeNote).toContain('整座叶家花园')
    expect(place.link.scopeNote).toContain('只对应园内小白楼')
    expect(place.link.scopeNote).toContain('1932年标签仍待原始史料核定')
    expect(result.byGroupId.get('landmark-vs-site-1710')).toBe(place)
    expect(place.link.historicalAddresses.map((address) => address.address))
      .toEqual(['597 GUODING', '?? ZHENGMIN LU'])
    expect(place.landmark.properties.sourceRecordIds).toEqual([1711, 1710])
    expect(place.landmark.properties.historicalRecords?.map((record) => record.name))
      .toEqual(['Yejia Garden', "Deng'ai Hospital"])
    expect(place.heritage.properties.address).toBe('政民路507号')
    expect(place.landmark.geometry).not.toEqual(place.heritage.geometry)
    expect(result.features.features.find((feature) => feature.properties.id === 'landmark-vs-site-1711')?.geometry)
      .toEqual(place.heritage.geometry)
    expect(result.features.features.some((feature) => feature.properties.id === 'landmark-vs-site-1710')).toBe(false)
    const records = makeSearchRecords(result.features.features)
    for (const query of ['Yejia Garden', 'Deng\'ai Hospital', '叶家花园', '597 GUODING', '?? ZHENGMIN LU', '政民路507号']) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe('landmark-vs-site-1711')
    }
  })

  it.each([
    { id: 580, officialId: 'sh-fgj-1A025-01', name: 'Trinity Church', chinese: '圣三一基督教堂', oldAddress: '210 HANKOW ROAD', newAddress: '九江路201号', year: 1869 },
    { id: 679, officialId: 'sh-fgj-1A018-01', name: "Moore's Memorial Church", chinese: '沐恩堂', oldAddress: '316 YUYACHING ROAD', newAddress: '西藏中路316号', year: 1892 },
  ])('resolves $name through its reviewed history while retaining the original date and address', (entry) => {
    const links = heritageLandmarkLinks.filter((link) => link.officialId === entry.officialId)
    const linked = linkHeritageLandmarks(historical, heritage, links)
    const place = linked.byGroupId.get(`landmark-vs-site-${entry.id}`)!
    expect(place.heritage.properties.officialId).toBe(entry.officialId)
    expect(place.landmark.properties.labelYear).toBe(entry.year)
    expect(place.link.historicalAddresses.map((address) => address.address)).toContain(entry.oldAddress)
    expect(place.heritage.properties.address).toBe(entry.newAddress)
    const records = makeSearchRecords(linked.features.features)
    for (const query of [entry.name, entry.chinese]) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe(`landmark-vs-site-${entry.id}`)
    }
  })

  it('keeps the historical map usable before heritage data is loaded', () => {
    const result = linkHeritageLandmarks(historical, undefined, nanjing)
    expect(result.features).toBe(historical)
    expect(result.byGroupId.size).toBe(0)
  })

  it('rejects additional group members, missing listed buildings and conflicting associations', () => {
    const changed = structuredClone(historical)
    changed.features.find((feature) => feature.properties.id === 'landmark-vs-site-609')!.properties.sourceRecordIds = [609, 99999]
    expect(linkHeritageLandmarks(changed, heritage, nanjing).byGroupId.size).toBe(0)
    expect(linkHeritageLandmarks(historical, { type: 'FeatureCollection', features: [] }, nanjing).byGroupId.size).toBe(0)
    expect(linkHeritageLandmarks(historical, heritage, [...nanjing, { ...nanjing[0], officialId: 'another-listing' }]).byGroupId.size).toBe(0)
    expect(linkHeritageLandmarks(historical, heritage, [...nanjing, { ...nanjing[0], landmarkFeatureId: 'another-place' }]).byGroupId.size).toBe(0)
  })

  it('applies every reviewed association against actual runtime groups without losing source IDs or bypassing holds', () => {
    const parks = JSON.parse(readFileSync('public/data/curated-parks.geojson', 'utf8')) as HistoricalFeatureCollection
    const runtime = mergeLandmarkSites(mergeCuratedParkFeatures(historical, parks), landmarkSiteLinks)
    const result = linkHeritageLandmarks(runtime, heritage, heritageLandmarkLinks)
    expect(result.byOfficialId.size).toBe(heritageLandmarkLinks.reduce(
      (count, link) => count + 1 + (link.additionalHeritageOfficialIds?.length ?? 0), 0,
    ))
    expect(result.byGroupId.size).toBe(heritageLandmarkLinks.reduce((count, link) => count + 1 + (link.additionalLandmarks?.length ?? 0), 0))
    const heldIds = new Set<number>(JSON.parse(readFileSync('scripts/data/landmark-current-use-holds.json', 'utf8'))
      .flatMap((hold: { sourceRecordIds: number[] }) => hold.sourceRecordIds))
    for (const linked of result.byOfficialId.values()) {
      const allIds = [linked.link, ...(linked.link.additionalLandmarks ?? [])].flatMap((member) => member.expectedSourceRecordIds)
      const hasHeldId = allIds.some((id) => heldIds.has(id))
      expect(linked.link.currentUseHoldRetained ?? false).toBe(hasHeldId)
      expect(linked.link.historicalAddresses.every((address) => allIds.includes(address.sourceRecordId))).toBe(true)
      const positioned = result.features.features.find((feature) => feature.properties.id === linked.link.landmarkFeatureId)!
      expect(positioned.geometry).toEqual(linked.heritage.geometry)
      const currentFields = (feature: typeof positioned) => Object.fromEntries(Object.entries(feature.properties).filter(([key]) => key.startsWith('current')))
      expect(currentFields(positioned)).toEqual(currentFields(linked.landmark))
    }
    const sourceIds = result.features.features.flatMap((feature) => feature.properties.sourceRecordIds ?? [])
    expect(sourceIds).toHaveLength(1803)
    expect(new Set(sourceIds).size).toBe(1803)
  })

  it('shares the HSBC card and heritage point while keeping the 1874 record and 1923 building separate', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-1A003-01')!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byGroupId.get('landmark-vs-site-526')!
    expect(place.link.relation).toBe('same-historical-site')
    expect(place.landmark.properties.labelYear).toBe(1874)
    expect(place.heritage.properties.constructionDate).toBe('1923年')
    expect(place.link.historicalAddresses[0].address).toBe('12 BUND ROAD')
    expect(place.link.modernAddress?.address).toBe('中山东一路12号')
    expect(place.heritage.properties.address).toBe('中山东一路10-12号')
    const records = makeSearchRecords(result.features.features)
    for (const query of ['Hongkong & Shanghai Banking Corporation', '汇丰银行大楼', '12 BUND ROAD', '中山东一路12号']) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe('landmark-vs-site-526')
    }
  })

  it('links the Naigai Wata workers housing to the listed Macau Road estate without claiming a specific house', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-4N002-01')!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byGroupId.get('landmark-vs-site-1229')!
    expect(place).toBe(result.byOfficialId.get('sh-fgj-4N002-01'))
    expect(place.link.relation).toBe('same-listed-complex')
    expect(place.link.historicalAddresses.map((address) => address.address)).toContain('425 ICHANG ROAD')
    expect(place.heritage.properties.address).toContain('澳门路660弄')
    expect(place.link.scopeNote).toContain('不推定原点对应名录中的某一栋')
    expect(place.landmark.properties.sourceRecordIds).toEqual([1229])
    expect(result.features.features.find((feature) => feature.properties.id === 'landmark-vs-site-1229')?.geometry)
      .toEqual(place.heritage.geometry)
    const records = makeSearchRecords(result.features.features)
    for (const query of ['Japanese Living Quarters - Naigai Wata Textile Company', '上海内外綿會社住宅', '澳门小区']) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe('landmark-vs-site-1229')
    }
  })

  it('links Yiding Apartments to 忆定村 while keeping the neighboring 月邨 separate', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-4M008-01')!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byGroupId.get('landmark-vs-site-1437')!
    expect(place).toBe(result.byOfficialId.get('sh-fgj-4M008-01'))
    expect(result.byGroupId.has('landmark-vs-site-1438')).toBe(false)
    expect(place.link.relation).toBe('same-listed-complex')
    expect(place.landmark.properties.labelYear).toBe(1934)
    expect(place.link.historicalAddresses.map((address) => address.address)).toContain('495 EDINBURGH ROAD')
    expect(place.heritage.properties.address).toBe('江苏路495弄')
    expect(place.link.scopeNote).toContain('不把住宅群参考点断言为某一栋')
    const records = makeSearchRecords(result.features.features)
    for (const query of ['Yiding Apartments', '憶定邨', '忆定村', '495 EDINBURGH ROAD', '江苏路495弄']) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe('landmark-vs-site-1437')
    }
  })

  it('links the generically named 1933 Bank record to 国华银行大楼 by Chinese name and address', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-2A019-01')!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byGroupId.get('landmark-vs-site-608')!
    expect(place).toBe(result.byOfficialId.get('sh-fgj-2A019-01'))
    expect(place.link.relation).toBe('same-listed-building')
    expect(place.landmark.properties.historicalName).toBe('Bank')
    expect(place.landmark.properties.modernNameZh).toBe('国華銀行')
    expect(place.landmark.properties.labelYear).toBe(1933)
    expect(place.link.historicalAddresses.map((address) => address.address)).toContain('342 PEKING ROAD')
    expect(place.heritage.properties.address).toBe('北京东路342号')
    expect(result.features.features.find((feature) => feature.properties.id === 'landmark-vs-site-608')?.geometry)
      .toEqual(place.heritage.geometry)
    const records = makeSearchRecords(result.features.features)
    for (const query of ['国華銀行', '国华银行大楼', '342 PEKING ROAD', '北京东路342号']) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe('landmark-vs-site-608')
    }
  })

  it('shares the Fufeng/Fuxin flour-mill complex card while retaining all four VS records', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-3N005-01')!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byOfficialId.get(link.officialId)!
    expect(place.link.relation).toBe('same-listed-complex')
    expect(place.heritage.properties.address).toBe('莫干山路120号')
    expect(place.landmark.properties.sourceRecordIds).toEqual([1370, 1371, 1213, 1214])
    expect(place.landmarks).toHaveLength(3)
    for (const id of [1370, 1371, 1213]) {
      expect(result.byGroupId.get(`landmark-vs-site-${id}`)).toBe(place)
    }
    expect(result.features.features.filter((feature) => feature.properties.heritageOfficialId === link.officialId)).toHaveLength(1)
    expect(link.historicalAddresses.map((item) => [item.sourceRecordId, item.address])).toEqual([
      [1370, '?? WEST SOOCHOW ROAD'],
      [1371, '226 MOKANSHAN ROAD'],
      [1213, '126 MOKANSHAN ROAD'],
      [1214, '126 MOKANSHAN ROAD'],
    ])
    expect(link.scopeNote).toContain('不能分别核定为某栋或某厂')
    const records = makeSearchRecords(result.features.features)
    for (const query of ['Fufeng Flour Mill', 'Fuxin Flour Mill', 'Flour Mill', '阜豐麵粉厰', '福新面粉厂、阜丰面粉厂']) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe('landmark-vs-site-1370')
    }
  })

  it('groups only the Changde Road SMC primary school near the listed girls-school campus', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-5B050-01')!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byOfficialId.get(link.officialId)!
    expect(place).toBe(result.byGroupId.get('landmark-vs-site-1174'))
    expect(result.byGroupId.has('landmark-vs-site-1016')).toBe(false)
    expect(place.link.relation).toBe('nearby-campus-context')
    expect(place.link.historicalAddresses.map((address) => address.address)).toEqual(['966 CHANGDE ROAD'])
    expect(place.heritage.properties.address).toBe('余姚路139号')
    expect(place.landmark.properties.labelYear).toBe(1933)
    expect(place.link.scopeNote).toContain('1935年女中楼')
    expect(place.link.scopeNote).toContain('不是小学与工部局华人女子中学为同一学校的证明')
    expect(result.features.features.find((feature) => feature.properties.id === 'landmark-vs-site-1174')?.geometry)
      .toEqual(place.heritage.geometry)
    expect(result.features.features.find((feature) => feature.properties.id === 'landmark-vs-site-1016')?.geometry)
      .toEqual(historical.features.find((feature) => feature.properties.id === 'landmark-vs-site-1016')?.geometry)
  })

  it('links the Sinza Road China Inland Mission compound, not its distant earlier namesake', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-5B044-01')!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byOfficialId.get(link.officialId)!
    expect(place).toBe(result.byGroupId.get('landmark-vs-site-1062'))
    expect(result.byGroupId.has('landmark-vs-site-1650')).toBe(false)
    expect(place.link.relation).toBe('same-listed-complex')
    expect(place.link.historicalAddresses.map((address) => address.address)).toEqual(['1531 SINZA ROAD'])
    expect(place.heritage.properties.address).toContain('新闸路1515-1533号')
    expect(place.link.scopeNote).toContain('不将原始点核定为名录内5、7、9、10号楼的某一栋')
    expect(place.link.scopeNote).toContain('市六医院已迁离')
    expect(place.landmark.properties.labelYearIsFallback).toBe(true)
    expect(result.features.features.find((feature) => feature.properties.id === 'landmark-vs-site-1062')?.geometry)
      .toEqual(place.heritage.geometry)
  })

  it('links Institut Pasteur and its co-located Nurse School record to the reviewed 207 Ruijin Road site', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-5A072-01')!
    const before = structuredClone(historical)
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byOfficialId.get(link.officialId)!
    expect(place).toBe(result.byGroupId.get('landmark-vs-site-248'))
    expect(place.link.relation).toBe('same-historical-site')
    expect(place.landmark.properties.sourceRecordIds).toEqual([248, 249])
    expect(place.landmark.properties.historicalRecords?.map((record) => record.name))
      .toEqual(['Institut Pasteur', 'Nurse School'])
    expect(link.historicalAddresses.map((address) => [address.sourceRecordId, address.address]))
      .toEqual([[248, '207 ROUTE PERE ROBERT'], [249, '207 ROUTE PERE ROBERT']])
    expect(place.heritage.properties.address).toBe('瑞金二路207号')
    expect(link.scopeNote).toContain('不认定护士学校就是化验所建筑')
    expect(result.features.features.find((feature) => feature.properties.id === 'landmark-vs-site-248')?.geometry)
      .toEqual(place.heritage.geometry)
    const records = makeSearchRecords(result.features.features)
    for (const query of ['Institut Pasteur', '巴斯德生物研究所旧址', '公董局公共卫生救济处医学化验所', '207 ROUTE PERE ROBERT', '瑞金二路207号']) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe('landmark-vs-site-248')
    }
    expect(historical).toEqual(before)
  })

  it('combines old and new Wing On buildings in one listed-complex card without losing either history', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-1A019-01')!
    const before = structuredClone(historical)
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const old = result.byGroupId.get('landmark-vs-site-681')!
    expect(old).toBe(result.byGroupId.get('landmark-vs-site-631'))
    expect(old.landmarks).toHaveLength(2)
    expect(old.landmark.properties.sourceRecordIds).toEqual([681, 631])
    expect(old.landmark.properties.historicalRecords?.flatMap((record) => record.sourceRecordIds)).toEqual(expect.arrayContaining([681, 631]))
    expect(old.landmark.properties.historicalRecords?.map((record) => [record.startYear, record.endYear])).toEqual([[1918, 1918], [1935, 1935]])
    expect(result.features.features.filter((feature) => feature.properties.heritageOfficialId === link.officialId)).toHaveLength(1)
    const records = makeSearchRecords(result.features.features)
    for (const query of ['CHEKIANG ROAD / NANKING ROAD', '627 NANKING ROAD', 'Wing On Company (New Building)', '南京东路627号', '七重天大厦']) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe('landmark-vs-site-681')
    }
    expect(historical).toEqual(before)
    const incomplete = structuredClone(historical)
    incomplete.features = incomplete.features.filter((feature) => feature.properties.id !== 'landmark-vs-site-631')
    expect(linkHeritageLandmarks(incomplete, heritage, [link]).byOfficialId.size).toBe(0)
    const changed = structuredClone(historical)
    changed.features.find((feature) => feature.properties.id === 'landmark-vs-site-631')!.properties.sourceRecordIds!.push(99999)
    expect(linkHeritageLandmarks(changed, heritage, [link]).byOfficialId.size).toBe(0)
    expect(linkHeritageLandmarks(historical, heritage, [link, {
      ...link, officialId: 'another-listing', landmarkFeatureId: 'landmark-vs-site-631',
      expectedSourceRecordIds: [631], additionalLandmarks: undefined,
    }]).byOfficialId.size).toBe(0)
  })

  it.each([
    { id: 1763, code: '2C010', aliases: ['King Albert Apartments', "King'S Albert Apartments", '陕南村', '陕南邨', '亚尔培公寓', '金亚尔培公寓'], oldAddress: '377 AVENUE DU ROI ALBERT', newAddress: '陕西南路157-187号', relation: 'same-listed-complex' },
    { id: 218, code: '3C013', aliases: ['Dubail Apartments', '吕班公寓', '重庆公寓'], oldAddress: '181 AVENUE DUBAIL', newAddress: '重庆南路185号', relation: 'same-listed-building' },
    { id: 1438, code: '4M007', aliases: ['Yue Apartments', '月邨', '月村'], oldAddress: '472 EDINBURGH ROAD', newAddress: '江苏路480弄', relation: 'same-listed-complex' },
    { id: 357, code: '2D041', aliases: ['新乐路东正教堂', '圣母大堂'], oldAddress: '55 ROUTE PAUL HENRY', newAddress: '新乐路55号', relation: 'same-listed-building' },
    { id: 671, code: '1A023', aliases: ['Metropol Cinema', '大上海大戏院'], oldAddress: '500 YUYACHING ROAD', newAddress: '西藏中路500号', relation: 'same-historical-site' },
  ])('resolves reviewed body-text aliases for $code without inventing source dates or addresses', (entry) => {
    const links = heritageLandmarkLinks.filter((link) => link.officialId === `sh-fgj-${entry.code}-01`)
    const result = linkHeritageLandmarks(historical, heritage, links)
    const groupId = `landmark-vs-site-${entry.id}`
    const place = result.byGroupId.get(groupId)!
    expect(place.link.relation).toBe(entry.relation)
    expect(place.link.historicalAddresses.map((address) => address.address)).toContain(entry.oldAddress)
    expect(place.link.modernAddress?.address || place.heritage.properties.address).toContain(entry.newAddress)
    const original = historical.features.find((feature) => feature.properties.id === groupId)!
    if (entry.code === '2C010') {
      expect(place.landmark.properties.sourceRecordIds).toEqual([1763, 348])
      expect(place.landmarks?.[0].properties).toEqual(original.properties)
      expect(place.link.nearbyResidentialContext).toBe(true)
      expect(place.link.scopeNote).toContain('不表示已核定为同一栋建筑')
    } else expect(place.landmark.properties).toEqual(original.properties)
    const records = makeSearchRecords(result.features.features)
    for (const query of entry.aliases) expect(searchRecords(records, query)[0].featureGroupId).toBe(groupId)
  })

  it.each([
    [219, '4C017', '?? AVENUE DUBAIL'],
    [294, '2C009', '273 ROUTE BOURGEAT'],
    [348, '2C010', '341/371 AVENUE DU ROI ALBERT'],
    [369, '2B007', '877 AVENUE FOCH'],
    [377, '5B026', '698 ROUTE BOURGEAT'],
    [378, '5B037', '741 ROUTE RATARD'],
    [382, '3B017', '210 ROUTE AMIRAL COURBET'],
    [390, '5D067', '4/44 ROUTE DE GROUCHY'],
    [1009, '2B004', 'BUBBLING WELL ROAD / MEDHURST ROAD'],
    [1759, '5D006', '275 ROUTE RAYMOND TENANT DE LA TOUR'],
    [1761, '5D063', '257 AVENUE DU ROI ALBERT'],
    [1766, '5D016', '266 ROUTE CHARLES CULTY'],
    [1767, '5D016', '273 ROUTE CHARLES CULTY'],
    [1781, '5D045', '7 ROUTE PAUL HENRY'],
    [1782, '5D106', '27 ROUTE PAUL HENRY'],
  ])('groups anonymous housing #%i near %s without claiming identity', (id, code, oldAddress) => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === `sh-fgj-${code}-01`)!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byGroupId.get(`landmark-vs-site-${id}`)!
    expect(place).toBeTruthy()
    expect(place.link.nearbyResidentialContext).toBe(true)
    expect(place.link.historicalAddresses.map((address) => address.address)).toContain(oldAddress)
    expect(place.link.scopeNote).toMatch(/(?:不表示已核定|未核定)为同一栋建筑/)
    expect(place.landmarks?.some((feature) => feature.properties.sourceRecordIds?.includes(id))).toBe(true)
    expect(historical.features.find((feature) => feature.properties.id === `landmark-vs-site-${id}`)?.geometry)
      .toBeDefined()
  })

  it('shares one Hunan Road residential card for #1766 and #1767 while keeping both original addresses', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-5D016-01')!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    expect(result.byGroupId.get('landmark-vs-site-1766')).toBe(result.byGroupId.get('landmark-vs-site-1767'))
    expect(link.historicalAddresses.map((item) => item.address)).toEqual([
      '266 ROUTE CHARLES CULTY', '273 ROUTE CHARLES CULTY',
    ])
    expect(link.relation).toBe('nearby-residential-context')
    expect(result.byOfficialId.get(link.officialId)?.heritage.properties.address).toBe('湖南路276号')
    const beforeLoading = withReviewedHeritageAliases(historical.features, [link])
    const records = makeSearchRecords(beforeLoading)
    expect(searchRecords(records, '266 ROUTE CHARLES CULTY').map((record) => record.featureGroupId))
      .toEqual(['landmark-vs-site-1766'])
    expect(searchRecords(records, '273 ROUTE CHARLES CULTY').map((record) => record.featureGroupId))
      .toEqual(['landmark-vs-site-1767'])
  })

  it.each([67, 438, 1193, 1773])('keeps distant or different-road anonymous housing #%i independent', (id) => {
    expect(heritageLandmarkLinks.some((link) => [link, ...(link.additionalLandmarks ?? [])]
      .some((member) => member.expectedSourceRecordIds.includes(id)))).toBe(false)
  })

  it('finds new aliases before heritage loading without changing geometry, dates or source data', () => {
    const original = historical.features.find((feature) => feature.properties.id === 'landmark-vs-site-1763')!
    const snapshot = structuredClone(original)
    const result = withReviewedHeritageAliases([original], heritageLandmarkLinks)
    expect(result[0].geometry).toEqual(original.geometry)
    expect(result[0].properties.labelYearIsFallback).toBe(true)
    expect(result[0].properties.labelYear).toBe(original.properties.labelYear)
    expect(result[0].properties.heritageOfficialId).toBeUndefined()
    for (const query of ['King Albert Apartments', '金亚尔培公寓', '陕南村']) {
      expect(searchRecords(makeSearchRecords(result), query)[0].featureGroupId).toBe(original.properties.featureGroupId)
    }
    expect(original).toEqual(snapshot)
  })

  it('does not assign reviewed aliases to changed, duplicated or competing group members', () => {
    const original = historical.features.find((feature) => feature.properties.id === 'landmark-vs-site-1763')!
    const changed = structuredClone(original)
    changed.properties.sourceRecordIds!.push(99999)
    expect(withReviewedHeritageAliases([changed], heritageLandmarkLinks)).toEqual([changed])
    expect(withReviewedHeritageAliases([original, original], heritageLandmarkLinks)).toEqual([original, original])
    const link = heritageLandmarkLinks.find((item) => item.expectedSourceRecordIds.includes(1763))!
    expect(withReviewedHeritageAliases([original], [link, { ...link, officialId: 'another-place' }])).toEqual([original])
  })

  it('preserves an unknown bank-record year when sharing the Union Building card', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-2A002-01')!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byGroupId.get('landmark-vs-site-548')!
    expect(place).toBe(result.byGroupId.get('landmark-vs-site-551'))
    expect(place.landmark.properties.sourceRecordIds).toEqual([548, 551])
    const bankRecord = place.landmark.properties.historicalRecords!.find((record) => record.sourceRecordIds?.includes(551))!
    expect(bankRecord.startYear).toBeUndefined()
    expect(bankRecord.endYear).toBeUndefined()
    expect(result.features.features.filter((feature) => feature.properties.heritageOfficialId === link.officialId)).toHaveLength(1)
  })

  it('links Gordon Road Police Station to 4B013 while preserving the conflicting VS door number', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-4B013-01')!
    const before = structuredClone(historical)
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byGroupId.get('landmark-vs-site-1168')!
    expect(place.link.relation).toBe('same-listed-building')
    expect(place.link.historicalAddresses.map((address) => address.address)).toEqual(['557 GORDON ROAD'])
    expect(place.heritage.properties.address).toBe('江宁路511号')
    expect(place.link.note).toContain('不推断557必然重编为511')
    const records = makeSearchRecords(result.features.features)
    for (const query of ['Gordon Road Police Station', 'Gordon Road Station', '戈登路巡捕房', '上海公共租界戈登路捕房', '上海商业会计学校静安分校', '江宁路511号']) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe('landmark-vs-site-1168')
    }
    expect(historical).toEqual(before)
  })

  it.each([
    { id: 1489, code: '2A058', oldAddress: '30 DAFOCHANG', query: 'Qingxin Temple', relation: 'same-historical-site' },
    { id: 1563, code: '3M027', oldAddress: '338 LINSEN XILU', query: '中央银行俱乐部', relation: 'same-listed-building' },
    { id: 566, code: '2A053', oldAddress: '260 EDWARD VII', query: '华商纱布交易所', relation: 'same-listed-building' },
    { id: 1441, code: '4M023', oldAddress: '1187 BRENAN ROAD', query: '圣玛利亚女中', relation: 'same-listed-complex' },
    { id: 140, code: '3C014', oldAddress: '425 ROUTE LAFAYETTE', query: 'All Saints Church', relation: 'same-listed-complex' },
    { id: 1427, code: '2M008', oldAddress: '91 EDINBURGH ROAD', query: '中西第一小学', relation: 'same-listed-complex' },
    { id: 1487, code: '3A021', oldAddress: '490 LUCHIAPANG ROAD', query: '清心女中', relation: 'same-listed-complex' },
    { id: 1466, code: '2C014', oldAddress: "?? ROUTE DE L'ARSENAL", query: '江南制造局', relation: 'same-listed-complex' },
    { id: 1661, code: '5F002', oldAddress: '260 MINGHONG', query: '上海市警察局虹口分局', relation: 'same-listed-complex' },
  ])('links reviewed remaining match $code without replacing its source history', (entry) => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === `sh-fgj-${entry.code}-01`)!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byGroupId.get(`landmark-vs-site-${entry.id}`)!
    expect(place.link.relation).toBe(entry.relation)
    expect(place.link.historicalAddresses.map((address) => address.address)).toContain(entry.oldAddress)
    expect(searchRecords(makeSearchRecords(result.features.features), entry.query)[0].featureGroupId)
      .toBe(`landmark-vs-site-${entry.id}`)
  })

  it('keeps the police compound succession distinct from the surviving police apartment', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-5F002-01')!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byGroupId.get('landmark-vs-site-1661')!
    expect(place.landmark.properties.currentAddress).toBe('上海市虹口区闵行路260号')
    expect(place.heritage.properties.address).toBe('塘沽路219号')
    expect(place.link.note).toContain('旧捕房主楼已拆')
    expect(place.link.note).toContain('不能把公安大楼写成同一栋主楼')
    const records = makeSearchRecords(result.features.features)
    for (const query of ['Hongkou Police Station', 'Hongkew Police Station', '虹口巡捕房', '上海市警察局虹口分局', '公安大楼']) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe('landmark-vs-site-1661')
    }
  })

  it('uses the listed Jiangnan Arsenal complex point without assigning the VS point to a protected component', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-2C014-01')!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byGroupId.get('landmark-vs-site-1466')!
    expect(place.landmark.geometry).toEqual({ type: 'Point', coordinates: [121.48341, 31.198493] })
    expect(place.heritage.geometry).toEqual({ type: 'Point', coordinates: [121.48451, 31.19754] })
    expect(place.link.note).toContain('不把VS点指定为某栋楼')
    expect(place.link.currentUseHoldRetained).toBe(true)
    expect(place.landmark.properties.currentUse).toBeUndefined()
    const records = makeSearchRecords(result.features.features)
    for (const query of ['Jiangnan Arsenal', 'Kiangnan Arsenal', '江南制造总局', '江南制造局', '江南造船厂']) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe('landmark-vs-site-1466')
    }
  })

  it('uses one dormitory card for both separately numbered Toyota Mill residences', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-5M011-01')!
    expect(link.additionalHeritageOfficialIds).toEqual(['sh-fgj-5M022-01'])
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const first = result.byOfficialId.get('sh-fgj-5M011-01')!
    expect(result.byOfficialId.get('sh-fgj-5M022-01')).toBe(first)
    expect(first.heritages?.map((entry) => entry.properties.address)).toEqual([
      '愚园路1249弄2号楼', '愚园路1249弄1号',
    ])
    expect(first.link.historicalAddresses.map((address) => address.address)).toEqual(['1000 YUYUAN ROAD'])
    const records = makeSearchRecords(result.features.features)
    for (const query of ['Litian Textile Mill Dormitories', '丰田纱厂干部住宅', '愚园路1249弄1号']) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe('landmark-vs-site-1432')
    }
  })

  it('moves the Siccawei display point to the reviewed observatory building while preserving the 1872 source point', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-4D047-01')!
    const before = structuredClone(historical)
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byGroupId.get('landmark-vs-site-1552')!
    expect(place.landmark.geometry).toEqual({ type: 'Point', coordinates: [121.431362, 31.190352] })
    expect(place.heritage.geometry).toEqual({ type: 'Point', coordinates: [121.4366948, 31.1908472] })
    expect(place.link.note).toContain('相距约510米')
    expect(place.link.note).toContain('非GCJ-02问题')
    expect(searchRecords(makeSearchRecords(result.features.features), '徐家汇观象台')[0].featureGroupId)
      .toBe('landmark-vs-site-1552')
    expect(historical).toEqual(before)
  })
})
