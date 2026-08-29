import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HistoricalFeature } from '../types'
import { DetailsPanel } from './DetailsPanel'

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
  it('keeps the existing single-name card unchanged when no records are provided', () => {
    const markup = renderToStaticMarkup(
      <DetailsPanel feature={baseFeature} sources={[]} onClose={() => undefined} />,
    )

    expect(markup).toContain('<h2>Chinese Red Cross Hospital No. 1</h2>')
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

    expect(markup).toContain('<h2>Chinese Red Cross Hospital No. 1</h2>')
    expect(markup).toContain('同址历史记录')
    expect(markup).toContain('Chinese Red Cross General Hospital')
    expect(markup).toContain('中國紅十字會總醫院')
    expect(markup).toContain('1907–1928 年')
    expect(markup).toContain('1929 年起')
    expect(markup).toContain('href="https://example.com/general-hospital"')
    expect(markup).toContain('aria-label="Chinese Red Cross Hospital No. 1史料来源 1"')
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
