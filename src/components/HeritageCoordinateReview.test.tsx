import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HeritageBuildingFeature, HeritageCoordinateReview } from '../lib/heritageBuildings'
import type { LinkedHeritageBuilding } from '../lib/heritageLandmarkLinks'
import { HeritageDetailsPanel } from './HeritageDetailsPanel'

const base: HeritageBuildingFeature = {
  type: 'Feature', geometry: { type: 'Point', coordinates: [121.43, 31.20] },
  properties: {
    officialId: 'coordinate-review-fixture', wikipediaId: 'fixture', batch: 4, officialCodeRaw: '4D024',
    name: '交通大学工程馆、新上院', articleTitle: '交通大学工程馆、新上院', address: '华山路1954号',
    addressComparison: 'exact', wikipediaAddress: '华山路1954号', coordinateScope: 'building-reference-point',
    coordinateSystem: 'WGS84', precisionDegrees: null, origin: 'openstreetmap', sourceUrl: 'https://example.org/original-point',
    wikipediaUrl: 'https://example.org/building', wikidataId: null, historicalGeometryVerified: false,
    officialName: '交通大学工程馆、新上院', listedName: '交通大学工程馆、新上院', district: '徐汇区',
    constructionDate: '1932年', floors: null, structure: null, designer: null,
    officialSourceUrl: 'https://example.org/official', wikipediaListUrl: 'https://example.org/wiki-list',
  },
}

const partial: HeritageCoordinateReview = {
  status: 'partial-reference',
  reason: '已取得新上院的独立楼体参考点；工程馆尚未完成定位，不能用同一校园点代替。',
  points: [{ name: '新上院', lon: 121.429676, lat: 31.2016962, coordinateScope: 'building-reference-point',
    sourceUrl: 'https://example.org/xinshangyuan', sourceTitle: '新上院建筑位置', sourceAddress: '华山路1954号' }],
}

function renderCard(feature: HeritageBuildingFeature, linked?: LinkedHeritageBuilding) {
  const container = document.createElement('div')
  container.innerHTML = renderToStaticMarkup(<HeritageDetailsPanel feature={feature} linked={linked} onClose={() => undefined} />)
  return container
}

describe('heritage coordinate review in the shared place card', () => {
  it('keeps the partial boundary and located component visible before any disclosure is opened', () => {
    const feature = structuredClone(base)
    feature.properties.coordinateReview = partial
    const card = renderCard(feature)
    const section = card.querySelector<HTMLElement>('[aria-label="位置与来源"]')!
    const details = section.querySelector('details')!
    expect(section.querySelector('.place-location-status')?.textContent).toBe('部分定位')
    expect(section.querySelector('.place-location-reason')?.textContent).toBe(partial.reason)
    expect(section.querySelector('.place-location-reason')?.closest('details')).toBeNull()
    expect(details.open).toBe(true)
    expect(section.querySelectorAll('.place-reference-points > li')).toHaveLength(1)
    expect(section.querySelector('.place-reference-points strong')?.textContent).toBe('新上院')
    expect(section.textContent).toContain('工程馆尚未完成定位')
    expect(section.textContent).toContain('经度 121.429676，纬度 31.2016962')
    expect(section.querySelector('a')?.href).toBe('https://example.org/xinshangyuan')
    expect(card.querySelector('.place-address')?.textContent).toContain('华山路1954号')
    expect(card.querySelectorAll('aside')).toHaveLength(1)
  })

  it('retains every component and its source while leaving ordinary source positions collapsed by default', () => {
    const names = ['科学馆', '西门堂', '思颜堂', '校政厅', '思孟堂', '怀施堂／韬奋楼']
    const feature = structuredClone(base)
    feature.properties.coordinateReview = {
      status: 'reference-point', reason: '六栋分别有来源参考点，保留门牌差异。',
      points: names.map((name, index) => ({ name, lon: 121.41 + index / 1000, lat: 31.22 + index / 1000,
        coordinateScope: index === 5 ? 'address-reference-point' : 'building-reference-point',
        sourceUrl: `http://example.org/component-${Math.floor(index / 2)}`, coordinateSystemInferred: index === 5 })),
    }
    const before = structuredClone(feature)
    const card = renderCard(feature)
    const section = card.querySelector<HTMLElement>('[aria-label="位置与来源"]')!
    const details = section.querySelector('details')!
    expect(details.open).toBe(false)
    expect(section.querySelectorAll('.place-reference-points > li')).toHaveLength(6)
    expect([...section.querySelectorAll('.place-reference-points strong')].map(item => item.textContent)).toEqual(names)
    expect(section.querySelector('summary')?.textContent).toBe('查看 6 个参考位置')
    section.querySelector('summary')!.click()
    expect(details.open).toBe(true)
    expect([...section.querySelectorAll('a')].map(item => item.href)).toEqual(names.map((_, index) =>
      `https://example.org/component-${Math.floor(index / 2)}`))
    expect(section.textContent).toContain('坐标系经独立对照推断')
    expect(section.textContent).toContain('门址参考点')
    expect(section.textContent).not.toContain('部分定位')
    expect(section.textContent).not.toContain('STATE')
    expect(feature).toEqual(before)
  })

  it('preserves partial location evidence for a secondary listing in a shared card', () => {
    const primary = structuredClone(base)
    primary.properties.officialId = 'primary-listing'
    primary.properties.name = '校园内另一建筑'
    const secondary = structuredClone(base)
    secondary.properties.coordinateReview = partial
    const linked: LinkedHeritageBuilding = {
      heritage: primary, heritages: [primary, secondary],
      landmark: { type: 'Feature', geometry: primary.geometry, properties: {
        id: 'historical-school', featureGroupId: 'historical-school', kind: 'landmark', historicalName: 'School', historicalChinese: '学校', modernNameZh: '学校',
        jurisdiction: 'international-settlement', language: 'en', labelYear: 1930, category: '学校', priority: 1,
        sourceIds: ['vs-buildings'], sourceRecordIds: [123],
      } },
      link: { id: 'shared', officialId: primary.properties.officialId, landmarkFeatureId: 'historical-school',
        expectedSourceRecordIds: [123], historicalAddresses: [], relation: 'same-listed-complex', note: '', sources: [] },
    }
    const card = renderCard(primary, linked)
    expect(card.querySelector('.place-location-label')?.textContent).toBe('交通大学工程馆、新上院 · 4D024')
    expect(card.querySelector('[aria-label="位置与来源"] .place-location-status')?.textContent).toBe('部分定位')
    expect(card.querySelector('.place-reference-points strong')?.textContent).toBe('新上院')
    expect(card.querySelector('.place-location-reason')?.textContent).toContain('工程馆尚未完成定位')
    expect(card.querySelector('.place-sources a[href="https://example.org/xinshangyuan"]')).not.toBeNull()
    expect(card.querySelectorAll('aside')).toHaveLength(1)
  })

  it('leaves legacy cards without the reviewed-position section and preserves their existing source and address', () => {
    const before = structuredClone(base)
    const card = renderCard(base)
    expect(card.querySelector('[aria-label="位置与来源"]')).toBeNull()
    expect(card.querySelector('h2')?.textContent).toBe('交通大学工程馆、新上院')
    expect(card.querySelector('.place-address')?.textContent).toContain('华山路1954号')
    expect(card.querySelector('a[href="https://example.org/original-point"]')).not.toBeNull()
    expect(base).toEqual(before)
  })
})
