import type { NotableResident } from '../types'
import type { HeritageBuildingProperties } from '../lib/heritageBuildings'
import wikipediaReviews from './wikipediaNotableResidents.json'

interface ReviewedResidences {
  officialId: string
  expectedName: string
  expectedAddress: string
  residents: NotableResident[]
}

const yicunSources = [
  { title: '徐汇区政府 · 逸村（历史网页存档）', url: 'https://web.archive.org/web/20211220055148id_/http://www.qjtrip.com/xhtrip/XHShowDetail.aspx?Id=4050&fromsType=' },
  { title: '维基百科 · 逸村', url: 'https://zh.wikipedia.org/zh-cn/%E9%80%B8%E6%9D%91' },
]

/** Reviewed against the archived Xuhui tourism article; individual house numbers preserve scope. */
export const reviewedNotableResidences: ReviewedResidences[] = [{
  officialId: 'sh-fgj-2D008-01', expectedName: '逸村', expectedAddress: '淮海中路1610弄',
  residents: [
    { name: '蒋经国', period: '1948年', address: '淮海中路1610弄2号',
      sources: yicunSources },
    { name: '徐恩曾', period: '抗战胜利后至1949年前', address: '淮海中路1610弄7号',
      sources: yicunSources },
  ],
}, ...(wikipediaReviews.records as ReviewedResidences[])]

export function reviewedResidentsForHeritage(properties: Pick<HeritageBuildingProperties, 'officialId' | 'officialName' | 'address'>): NotableResident[] {
  return reviewedNotableResidences.filter(item => item.officialId === properties.officialId
    && item.expectedName === properties.officialName && item.expectedAddress === properties.address)
    .flatMap(review => review.residents)
}
