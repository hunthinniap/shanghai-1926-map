import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HeritageBuildingFeature } from '../lib/heritageBuildings'
import type { LinkedHeritageBuilding } from '../lib/heritageLandmarkLinks'
import { HeritageDetailsPanel } from './HeritageDetailsPanel'

const heritage: HeritageBuildingFeature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [121.47772, 31.2393] },
  properties: {
    officialId: 'sh-fgj-4A016-01', wikipediaId: '4A016', batch: 4, officialCodeRaw: '4A016',
    name: '南京饭店', articleTitle: '南京饭店', address: '山西南路182—200号、天津路191—211号',
    addressComparison: 'different', wikipediaAddress: '山西南路200号',
    coordinateScope: 'building-reference-point', coordinateSystem: 'WGS84', precisionDegrees: null,
    origin: 'wikipedia-article', sourceUrl: 'https://example.org/nanjing-hotel',
    wikipediaUrl: 'https://example.org/nanjing-hotel', wikidataId: null, historicalGeometryVerified: false,
    officialName: '南京饭店', listedName: '南京饭店', district: '黄浦区', constructionDate: '1929年',
    floors: '6层', structure: '钢筋混凝土', designer: '建筑师事务所',
    officialSourceUrl: 'https://example.org/official-list', wikipediaListUrl: 'https://example.org/wiki-list',
  },
}

const linked: LinkedHeritageBuilding = {
  heritage,
  landmark: {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [121.477603, 31.239438] },
    properties: {
      id: 'landmark-vs-site-609', featureGroupId: 'landmark-vs-site-609', kind: 'landmark',
      historicalName: 'Nanjing Hotel', modernNameZh: '南京飯店',
      jurisdiction: 'international-settlement', language: 'en', labelYear: 1931,
      sourceIds: ['vs-buildings'], sourceRecordIds: [609],
      sourceUrls: { 'vs-buildings': 'https://www.virtualshanghai.net/数据/建筑?ID=609' },
      category: '饭店', priority: 3, aliases: ['Nanking Hotel'],
      historicalRecords: [{
        name: 'Nanjing Hotel', nameZh: '南京飯店', startYear: 1931, endYear: 1949,
        sourceRecordIds: [609], category: '饭店', sourceUrls: ['http://example.org/historical-record'],
      }],
      currentUse: '酒店 / 住宿', currentNameZh: '南京饭店', currentAddress: '山西南路200号',
      currentUseSourceId: 'sh-library-excellent-historical-buildings',
      currentUseSourceUri: 'https://example.org/library-use', currentUseMatchDistance: 1217,
      currentUseSources: [{ title: '酒店沿革', url: 'https://example.org/hotel-history' }],
      currentUseRelationship: 'same-building', currentUseNote: '用途依据所列资料记载。',
    },
  },
  link: {
    id: 'nanjing-hotel', officialId: 'sh-fgj-4A016-01', landmarkFeatureId: 'landmark-vs-site-609',
    expectedSourceRecordIds: [609],
    historicalAddresses: [{
      sourceRecordId: 609, address: '200 SHANSI ROAD',
      sourceUrl: 'https://www.virtualshanghai.net/数据/建筑?ID=609',
    }],
    note: '历史资料的山西路与名录所列山西南路对应；各来源年代分别保留。',
    sources: [{ title: '南京饭店沿革', url: 'https://example.org/identity-history' }],
  },
}

function renderCard(value?: LinkedHeritageBuilding, selectedFeature = heritage) {
  const container = document.createElement('div')
  container.innerHTML = renderToStaticMarkup(
    <HeritageDetailsPanel feature={selectedFeature} linked={value} onClose={() => undefined} />,
  )
  return container
}

function field(container: HTMLElement, label: string) {
  return [...container.querySelectorAll('dt')].find((element) => element.textContent === label)
    ?.nextElementSibling?.textContent
}

describe('HeritageDetailsPanel linked historical site', () => {
  it('shows historical use independently of a modern arts-centre name and keeps its evidence link', () => {
    const feature = structuredClone(heritage)
    feature.properties.name = '西岸艺术中心'
    feature.properties.historicalUse = {
      category: 'industrial', categories: ['industrial'], status: 'reviewed',
      historicalName: '上海飞机制造厂冲压车间',
      note: '原厂房改作艺术中心；分类不表示1928年已存在。',
      sources: ['https://www.westbund.com/cn/index/KEY-PROJECTS/detail_41bE6.html'],
    }
    const card = renderCard(undefined, feature)
    expect(field(card, '历史用途')).toContain('工业')
    expect(field(card, '历史用途')).toContain('上海飞机制造厂冲压车间')
    expect(field(card, '历史用途')).toContain('资料已复核')
    expect(card.querySelector('a[href="https://www.westbund.com/cn/index/KEY-PROJECTS/detail_41bE6.html"]')).not.toBeNull()
  })

  it('retains the original heritage card when no historical landmark is linked', () => {
    const card = renderCard()
    expect(card.querySelectorAll('aside')).toHaveLength(1)
    expect(card.querySelector('h2')?.textContent).toBe('南京饭店')
    expect(field(card, '官网记载地址')).toBe(heritage.properties.address)
    expect(field(card, '建造年代')).toBe('1929年')
    expect(card.textContent).not.toContain('历史资料年代')
    expect(card.textContent).not.toContain('现用资料记载')
  })

  it('combines both identities in one card while distinguishing old and listed addresses and source dates', () => {
    const before = structuredClone(linked)
    const card = renderCard(linked)
    expect(card.querySelectorAll('aside')).toHaveLength(1)
    expect(card.querySelector('h2')?.textContent).toBe('南京饭店')
    expect(card.querySelector('.details-historical-chinese')?.textContent).toBe('Nanjing Hotel')
    expect(card.querySelector('.details-kicker')?.textContent).toContain('饭店')
    expect(card.querySelector('.details-kicker')?.textContent).toContain('第 4 批')
    expect(field(card, '旧地点地址')).toContain('200 SHANSI ROAD')
    expect(field(card, '旧地点地址')).toContain('Virtual Shanghai #609')
    expect(field(card, '新地点地址')).toBe(heritage.properties.address)
    expect(field(card, '维基列表记载地址')).toBe('山西南路200号')
    expect(field(card, '名录建造年代')).toBe('1929年')
    expect(field(card, '历史资料年代')).toBe('1931 年资料')
    expect(field(card, '1931–1949 年')).toContain('Nanjing Hotel')
    expect(card.textContent).toContain('Nanking Hotel')
    expect(card.textContent).toContain('地图位置 · 优秀历史建筑参考点')
    expect(card.textContent).not.toContain('1217')
    expect(linked).toEqual(before)
  })

  it('preserves sources for the official entry, historical address, historical record and documented use', () => {
    const card = renderCard(linked)
    const urls = [...card.querySelectorAll('a')].map((element) => element.getAttribute('href'))
    for (const url of [
      heritage.properties.officialSourceUrl, heritage.properties.wikipediaListUrl, heritage.properties.wikipediaUrl,
      linked.link.historicalAddresses[0].sourceUrl, 'https://example.org/historical-record',
      'https://example.org/identity-history', 'https://example.org/library-use', 'https://example.org/hotel-history',
    ]) expect(urls).toContain(url)
    expect(field(card, '历史建筑记录')).toBe('Virtual Shanghai #609')
    expect(field(card, '公布时名称／使用单位')).toBe('南京饭店')
    expect(field(card, '现用资料记载')).toBe('酒店 / 住宿')
    expect(card.textContent).toContain('上海图书馆 · 用途资料')
    expect(card.textContent).toContain('原建筑延续使用')
  })

  it('does not turn a listed name or historical use into an unsupported current-use claim', () => {
    const withoutCurrentUse = structuredClone(linked)
    for (const key of Object.keys(withoutCurrentUse.landmark.properties)) {
      if (key.startsWith('currentUse') || key === 'currentNameZh' || key === 'currentAddress') {
        delete (withoutCurrentUse.landmark.properties as unknown as Record<string, unknown>)[key]
      }
    }
    const card = renderCard(withoutCurrentUse)
    expect(field(card, '公布时名称／使用单位')).toBe('南京饭店')
    expect(field(card, '现用资料记载')).toBe('暂未查到可靠对应')
    expect(card.textContent).not.toContain('酒店 / 住宿')
    expect(card.textContent).not.toContain('上海图书馆 · 用途资料')
  })

  it('identifies a relocated successor address separately from the listed building address', () => {
    const relocated = structuredClone(linked)
    relocated.landmark.properties.currentUseRelationship = 'institutional-successor-relocated'
    relocated.landmark.properties.currentNameZh = '后继机构'
    relocated.landmark.properties.currentAddress = '另一条路100号'
    const card = renderCard(relocated)
    expect(field(card, '新地点地址')).toBe(heritage.properties.address)
    expect(field(card, '机构现址（非历史原址）')).toBe('另一条路100号')
    expect(field(card, '与历史地点的关系')).toBe('机构延续，但已迁离历史原址')
  })

  it('keeps the reviewed complex scope visible instead of implying one surviving building', () => {
    const complex = structuredClone(linked)
    complex.link.relation = 'same-listed-complex'
    complex.link.scopeNote = '对应整处历史建筑群，点位不表示某一栋楼。'
    const card = renderCard(complex)
    expect(field(card, '对应范围')).toContain('同一名录建筑群／园区')
    expect(field(card, '对应范围')).toContain(complex.link.scopeNote)
    expect(field(card, '旧地点地址')).toContain(complex.link.historicalAddresses[0].address)
    expect(field(card, '新地点地址')).toBe(heritage.properties.address)
  })

  it('labels anonymous residential proximity as display grouping, not a verified building match', () => {
    const nearby = structuredClone(linked)
    nearby.link.relation = 'nearby-residential-context'
    nearby.link.nearbyResidentialContext = true
    nearby.link.scopeNote = '同路名且相距8米；未核定同一栋。'
    const card = renderCard(nearby)
    expect(field(card, '对应范围')).toContain('同路段邻近住宅归并（非同栋核定）')
    expect(field(card, '对应范围')).toContain(nearby.link.scopeNote)
  })

  it('labels an adjacent school record without claiming institutional or building identity', () => {
    const campus = structuredClone(linked)
    campus.link.relation = 'nearby-campus-context'
    campus.link.scopeNote = '旧小学与女中位于相邻门址；不核定为同一学校或同一栋。'
    const card = renderCard(campus)
    expect(field(card, '对应范围')).toContain('相邻校址归并（非同校、同楼核定）')
    expect(field(card, '对应范围')).toContain(campus.link.scopeNote)
  })

  it('distinguishes a checked modern address, listing range and earlier building phases', () => {
    const site = structuredClone(linked)
    site.link.relation = 'same-historical-site'
    site.link.scopeNote = '1874年旧址记录；1923年现楼启用。'
    site.link.modernAddress = { address: '中山东一路12号', sourceUrl: 'https://example.org/checked-address', title: '地址来源' }
    const card = renderCard(site)
    expect(field(card, '新地点地址')).toBe('中山东一路12号')
    expect(field(card, '名录登记地址范围')).toBe(heritage.properties.address)
    expect(field(card, '对应范围')).toContain('同一地点的不同历史阶段')
    expect(card.textContent).toContain('1874年旧址记录；1923年现楼启用。')
    expect(card.textContent).not.toContain('原建筑延续使用')
    expect(card.querySelector('a[href="https://example.org/checked-address"]')).not.toBeNull()
  })

  it('shows explicitly reviewed aliases without overwriting the historical heading', () => {
    const value = structuredClone(linked)
    value.link.aliases = ['King Albert Apartments', '金亚尔培公寓']
    const card = renderCard(value)
    expect(card.querySelector('.details-historical-chinese')?.textContent).toBe('Nanjing Hotel')
    expect(card.querySelector('.details-aliases')?.textContent).toContain('King Albert Apartments')
    expect(card.querySelector('.details-aliases')?.textContent).toContain('金亚尔培公寓')
  })

  it('scopes current-use claims to a component instead of the whole listed complex', () => {
    const value = structuredClone(linked)
    value.link.relation = 'component-of-listed-complex'
    value.link.scopeNote = '仅代表名录建筑群的一栋。'
    const card = renderCard(value)
    expect(field(card, '对应范围')).toContain('名录建筑群中的一栋／局部使用')
    expect(field(card, 'Nanjing Hotel · 现用资料记载')).toBe('酒店 / 住宿')
    expect(field(card, '现用资料记载')).toBeUndefined()
  })

  it('does not show the generic complex-reference-position row', () => {
    const complex = structuredClone(heritage)
    complex.properties.coordinateScope = 'building-complex-reference-point'
    complex.properties.locationNote = '此为门址所在里弄、院落或建筑群参考点，未逐栋核定位置。'
    const card = renderCard(undefined, complex)
    expect(card.textContent).not.toContain('建筑群参考位置')
    expect(card.textContent).not.toContain(complex.properties.locationNote)
    expect(card.textContent).toContain('官网记载地址')
  })
})
