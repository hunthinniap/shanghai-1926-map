import registry from '../data/heritageConstructionDateReviews.json'
import { shtongConstructionDateReviews } from '../data/shtongDatedHistoriesBatch002'
import type { HeritageBuildingCollection } from './heritageBuildings'
import { parseConstructionDate } from './buildingTimeline'

export interface ConstructionDateEvidence {
  originalText: string | null
  dateText: string
  sourceTitle: string
  sourceUrl: string
  sourceRow?: number
  note: string
  reviewedOn: string
}

interface DateReview {
  officialId: string
  expectedName: string
  expectedAddress: string
  originalConstructionDate: string | null
  dateText: string
  sourceId?: string
  source?: { title: string; url: string }
  reviewedOn?: string
  sourceRow?: number
  note: string
}
const reviews = new Map(([...registry.records, ...shtongConstructionDateReviews] as DateReview[]).map(review => [review.officialId, review]))
const sources = registry.sources as Record<string, { title: string; url: string }>

/** Guarded overlay: source data and uncertain dates remain untouched. */
export function applyReviewedHeritageConstructionDates(collection: HeritageBuildingCollection): HeritageBuildingCollection {
  return { ...collection, features: collection.features.map(feature => {
    const p = feature.properties
    const review = reviews.get(p.officialId)
    if (!review || p.officialName !== review.expectedName || p.address !== review.expectedAddress
      || p.constructionDate !== review.originalConstructionDate) return feature
    const source = review.source ?? (review.sourceId ? sources[review.sourceId] : undefined)
    if (!source || !/^https?:\/\//.test(source.url) || parseConstructionDate(review.dateText).startYear === undefined) return feature
    return { ...feature, properties: { ...p, constructionDate: review.dateText,
      constructionDateEvidence: {
        originalText: p.constructionDate, dateText: review.dateText, sourceTitle: source.title, sourceUrl: source.url,
        sourceRow: review.sourceRow, note: review.note, reviewedOn: review.reviewedOn ?? registry.reviewedOn,
      },
    } }
  }) }
}
