import type { Feature, FeatureCollection, Geometry } from 'geojson'

export type FeatureKind = 'road' | 'landmark'
export type HistoricalLanguage = 'fr' | 'en' | 'zh' | 'wuu'
export type Jurisdiction =
  | 'french-concession'
  | 'international-settlement'
  | 'old-city'
  | 'chinese-administered'
export type HighlightedJurisdiction = Exclude<Jurisdiction, 'chinese-administered'>
export type CurrentUseRelationship =
  | 'same-building'
  | 'same-site-continuing-use'
  | 'same-site-repurposed'
  | 'partial-remains-on-original-site'
  | 'site-redeveloped'
  | 'institutional-successor-relocated'

export interface CurrentUseSource {
  title?: string
  url: string
}

export interface HistoricalRecord {
  sourceRecordIds?: number[]
  name: string
  nameZh?: string
  startYear?: number
  endYear?: number
  sourceUrls?: string[]
  category?: string
  generic?: boolean
}

export interface HistoricalFeatureProperties {
  id: string
  featureGroupId: string
  kind: FeatureKind
  historicalName: string
  modernNameZh: string
  modernNameEn?: string
  historicalChinese?: string
  historicalRecords?: HistoricalRecord[]
  sourceRecordIds?: number[]
  sourceParkRecordIds?: number[]
  legacyFeatureGroupIds?: string[]
  clusterReason?: string
  aliases?: string[]
  jurisdiction: Jurisdiction
  language: HistoricalLanguage
  labelYear: number
  labelYearIsFallback?: boolean
  sourceIds: string[]
  sourceUrls?: Record<string, string>
  category: string
  priority: number
  historicalUse?: 'park' | 'garden' | 'cemetery' | 'racecourse' | 'industrial' | 'military' | 'recreation' | 'school' | 'aerodrome'
  namingBasis?: 'translated' | 'proposed-road' | 'proposed-district' | 'proposed-site'
  currentUse?: string
  currentNameZh?: string
  currentAddress?: string
  currentUseNote?: string
  currentUseRelationship?: CurrentUseRelationship
  currentUseSources?: CurrentUseSource[]
  currentUseSourceId?: string
  currentUseSourceUri?: string
  currentUseMatch?:
    | 'historical-name-and-location'
    | 'historical-name-and-list-record'
    | 'documented-current-place'
    | 'verified-online-research'
  currentUseMatchDistance?: number
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
