import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HistoricalFeature, HistoricalFeatureCollection } from '../types'
import { DetailsPanel } from './DetailsPanel'
import { reviewedAddressUses } from '../data/reviewedAddressUses'

const baseFeature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [121.47, 31.22] },
  properties: {
    id: 'landmark-shared-site',
    featureGroupId: 'landmark-shared-site',
    kind: 'landmark',
    historicalName: 'Chinese Red Cross Hospital No. 1',
    historicalChinese: '中國紅十字會第一醫院',
    modernNameZh: '复旦大学附属华山医院',
    jurisdiction: 'french-concession',
    language: 'zh',
    labelYear: 1928,
    sourceIds: [],
    category: '医院',
    priority: 1,
  },
} satisfies HistoricalFeature

describe('DetailsPanel historical records', () => {
  it('places sourced residents after the timeline and only shows a period when recorded', () => {
    const feature: HistoricalFeature = { ...baseFeature, properties: { ...baseFeature.properties, notableResidents: [
      { name: '甲', period: '1948年', address: '某路2号', sources: [{ url: 'https://example.org/resident-a' }] },
      { name: '乙', sources: [{ url: 'https://example.org/resident-b' }] },
    ] } }
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<DetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    const timeline = container.querySelector('section[aria-label="时间线"]')!
    const residents = timeline.nextElementSibling!
    expect(residents.getAttribute('aria-label')).toBe('居住过的名人')
    expect(residents.textContent).toContain('甲（1948年）某路2号')
    expect(residents.querySelector('a[href="https://example.org/resident-b"]')?.parentElement?.textContent).toBe('乙')
    expect(residents.textContent).not.toContain('年份未知')
  })
  it('shows nearby or same-courtyard evidence without claiming a shared building', () => {
    const historical = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    const school = historical.features.find((feature) => feature.properties.id === 'landmark-vs-site-13')!
    const markup = renderToStaticMarkup(<DetailsPanel feature={school} sources={[]} onClose={() => undefined} />)
    expect(markup).toContain('地理／沿革关联（不合并建筑）')
    expect(markup).toContain('若瑟堂 · 2A045')
    expect(markup).toContain('学校和教堂是不同建筑')
    expect(markup).not.toContain('同址优秀历史建筑（名录点待核）')
  })

  it('keeps the sports field separate after the library listing receives a reference position', () => {
    const historical = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    const sportsField = historical.features.find(feature => feature.properties.id === 'landmark-vs-site-242')!
    const before = structuredClone(sportsField)
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<DetailsPanel feature={sportsField} sources={[]} onClose={() => undefined} />)
    const questions = container.querySelector('[aria-label="待核查"]')!
    expect(questions.textContent).toContain('同址名录参考（保持分卡）')
    expect(questions.textContent).toContain('名录已有独立参考点')
    expect(questions.textContent).toContain('震旦大学运动场与图书馆教学大楼、博物馆')
    expect(questions.textContent).toContain('非同一楼体')
    expect(questions.textContent).toContain('两侧仍保持分卡')
    expect(container.textContent).not.toContain('名录点待核')
    expect(container.querySelector('[aria-label="位置与来源"]')).toBeNull()
    expect(sportsField).toEqual(before)
  })

  it('replaces the unknown-use placeholder with a qualified address reference, not a confirmed use', () => {
    const entry = reviewedAddressUses.find(e => e.expectedSourceRecordIds.includes(440))!
    const feature = { ...baseFeature, properties: { ...baseFeature.properties, addressUseEvidence: entry.evidence } }
    const markup = renderToStaticMarkup(<DetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    expect(markup).toContain('<dt>今址用途参考</dt>')
    expect(markup).not.toContain('<dt>现在用途</dt>')
    expect(markup).not.toContain('暂未查到可靠对应')
    expect(markup).toContain('上海歌剧院')
    expect(markup).toContain('历史原址／原建筑对应待核')
  })
  it('shows Chinese first and retains the original name in a single-record timeline', () => {
    const markup = renderToStaticMarkup(
      <DetailsPanel feature={baseFeature} sources={[]} onClose={() => undefined} />,
    )

    expect(markup).toContain('<h2>中國紅十字會第一醫院</h2>')
    expect(markup).not.toContain('同址历史记录')
  })

  it('shows multiple names, periods, categories and record-level sources for one site', () => {
    const feature = {
      ...baseFeature,
      properties: {
        ...baseFeature.properties,
        historicalRecords: [
          {
            name: 'Chinese Red Cross General Hospital',
            nameZh: '中國紅十字會總醫院',
            startYear: 1907,
            endYear: 1928,
            category: '医院',
            sourceUrls: ['http://example.com/general-hospital'],
          },
          {
            name: 'Chinese Red Cross Hospital No. 1',
            nameZh: '中國紅十字會第一醫院',
            startYear: 1929,
            category: '医院',
            sourceUrls: ['https://example.com/hospital-no-1'],
          },
        ],
      },
    } satisfies HistoricalFeature

    const markup = renderToStaticMarkup(
      <DetailsPanel feature={feature} sources={[]} onClose={() => undefined} />,
    )

    expect(markup).toContain('<h2>中國紅十字會第一醫院</h2>')
    expect(markup).toContain('时间线')
    expect(markup).toContain('Chinese Red Cross General Hospital')
    expect(markup).toContain('中國紅十字會總醫院')
    expect(markup).toContain('1907–1928 年')
    expect(markup).toContain('1929 年起')
    expect(markup).toContain('href="https://example.com/general-hospital"')
    expect(markup).toContain('href="https://example.com/hospital-no-1"')
  })

  it('distinguishes a relocated successor from the historical map point', () => {
    const feature = {
      ...baseFeature,
      properties: {
        ...baseFeature.properties,
        currentUse: '医疗机构延续 / 原址用途已变',
        currentNameZh: '上海市儿童医院',
        currentAddress: '泸定路355号（机构现址，非历史原址）',
        currentUseRelationship: 'institutional-successor-relocated',
        currentUseSourceUri: 'https://example.com/hospital-history',
        currentUseSources: [
          { title: '医院现址', url: 'https://example.com/hospital-address' },
        ],
      },
    } satisfies HistoricalFeature

    const markup = renderToStaticMarkup(
      <DetailsPanel feature={feature} sources={[]} onClose={() => undefined} />,
    )

    expect(markup).toContain('后继机构')
    expect(markup).toContain('机构现址（非地图点）')
    expect(markup).toContain('机构延续，但已迁离历史原址')
    expect(markup).toContain('href="https://example.com/hospital-address"')
  })
})
