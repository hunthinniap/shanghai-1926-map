import type { Feature, FeatureCollection, Geometry } from 'geojson'

export type FeatureKind = 'road' | 'landmark'
export type HistoricalLanguage = 'fr' | 'en' | 'zh' | 'wuu'
export type Jurisdiction =
  | 'french-concession'
  | 'international-settlement'
  | 'old-city'
  | 'chinese-administered'
export type HighlightedJurisdiction = Exclude<Jurisdiction, 'chinese-administered'>

export interface HistoricalFeatureProperties {
  id: string
  featureGroupId: string
  kind: FeatureKind
  historicalName: string
  modernNameZh: string
  modernNameEn?: string
  historicalChinese?: string
  aliases?: string[]
  jurisdiction: Jurisdiction
  language: HistoricalLanguage
  labelYear: number
  sourceIds: string[]
  category: string
  priority: number
  historicalUse?: 'park' | 'garden' | 'cemetery' | 'racecourse' | 'industrial' | 'military' | 'recreation' | 'school' | 'aerodrome'
  namingBasis?: 'translated' | 'proposed-road' | 'proposed-district' | 'proposed-site'
  labelFromFeature?: boolean
  labelOnMap?: boolean
}

export type HistoricalFeature = Feature<Geometry, HistoricalFeatureProperties>
export type HistoricalFeatureCollection = FeatureCollection<
  Geometry,
  HistoricalFeatureProperties
>

export interface SourceRecord {
  id: string
  title: string
  url: string
  license: string
  year: number
}

export interface SearchRecord {
  featureId: string
  featureGroupId: string
  historicalName: string
  modernNameZh: string
  modernNameEn?: string
  normalizedTerms: string[]
}

export interface AppData {
  features: HistoricalFeatureCollection
  jurisdictions: FeatureCollection
  sources: SourceRecord[]
}
