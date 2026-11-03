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

/** A sourced residence claim; ownership or employment alone is not residence. */
export interface NotableResident {
  name: string
  period?: string
  address?: string
  note?: string
  sources: CurrentUseSource[]
}

export interface AddressUseEvidence {
  sourceRecordIds: number[]
  mode: 'current-use' | 'address-reference'
  use: string
  address: string
  note: string
  identityBasis?: string
  retainedHold?: { reason: string; reviewRef: string }
  reviewedOn: string
  sources: { id: string; title: string; url: string; informationAsOf: string | null; accessedOn: string; supports: string }[]
}

export interface HistoricalRecord {
  dateEvidence?: { sourceUrl: string; sourceTitle: string; note: string }
  sourceRecordIds?: number[]
  sourceParkRecordIds?: number[]
  name: string
  nameZh?: string
  /** Reviewed display label; original source names remain unchanged. */
  displayNameZh?: string
  startYear?: number
  endYear?: number
  sourceUrls?: string[]
  category?: string
  generic?: boolean
}

/** Reviewed site phases use [startYear, endYear); record spans remain documentary. */
export interface HistoricalSitePhase {
  id: string
  name: string
  nameZh?: string
  address?: string
  use?: string
  startYear: number
  endYear?: number
  relationship: 'same-building' | 'site-use' | 'replacement-building' | 'vacant-site'
  buildingId?: string
  note?: string
  sources: CurrentUseSource[]
}

export interface TimelineStage {
  year: number
  name: string
  nameZh?: string
  use?: string
  status: 'reviewed-phase' | 'record-span' | 'latest-record' | 'unknown'
  records: HistoricalRecord[]
  phase?: HistoricalSitePhase
  scope?: string
}

/** Physical building dates only. A record/name's end date is not demolition. */
export interface BuildingLifeDates {
  built?: { year: number; sourceUrl: string; note?: string }
  demolished?: { year: number; sourceUrl: string; note?: string }
}

export interface HistoricalFeatureProperties {
  notableResidents?: NotableResident[]
  mapDisplayName?: string
  historicalPhases?: HistoricalSitePhase[]
  timelineStage?: TimelineStage
  buildingLifeDates?: BuildingLifeDates
  id: string
  featureGroupId: string
  kind: FeatureKind
  historicalName: string
  modernNameZh: string
  modernNameEn?: string
  historicalChinese?: string
  historicalAddresses?: { sourceRecordId: number; address: string }[]
  historicalRecords?: HistoricalRecord[]
  historicalSiteNote?: string
  historicalSiteSources?: CurrentUseSource[]
  heritageOfficialId?: string
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
  addressUseEvidence?: AddressUseEvidence[]
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
