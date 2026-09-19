import type { Feature, FeatureCollection, Point } from 'geojson'

export interface HeritageBuildingProperties {
  officialId: string
  wikipediaId: string
  batch: number
  officialCodeRaw: string
  name: string
  articleTitle: string
  address: string
  addressComparison: string
  coordinateScope: 'linked-building-reference-point' | 'building-reference-point' | 'building-complex-reference-point' | 'address-reference-point'
  coordinateSystem: 'WGS84'
  precisionDegrees: number | null
  origin: string
  sourceUrl: string
  coordinateSourceTitle?: string
  sourceAddress?: string | null
  locationNote?: string
  wikipediaUrl: string
  wikidataId: string | null
  historicalGeometryVerified: false
  officialName: string
  listedName: string | null
  wikipediaAddress: string | null
  district: string | null
  constructionDate: string | null
  floors: string | null
  structure: string | null
  designer: string | null
  officialSourceUrl: string
  wikipediaListUrl: string
}

export type HeritageBuildingFeature = Feature<Point, HeritageBuildingProperties>
export type HeritageBuildingCollection = FeatureCollection<Point, HeritageBuildingProperties>

export function getHeritageBuildingName(properties: HeritageBuildingProperties) {
  const name = properties.name.trim()
  const genericName = /^(住宅|花园住宅|里弄住宅|公寓|办公楼|学校|医院|厂房|其他)$/
  if ((!name || genericName.test(name)) && properties.articleTitle.trim()) {
    return properties.articleTitle.trim()
  }
  return name || properties.officialCodeRaw
}
