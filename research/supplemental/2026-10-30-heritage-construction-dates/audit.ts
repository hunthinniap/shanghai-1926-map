import { readFileSync, writeFileSync } from 'node:fs'
import { heritageBuildingPeriod, linkedHeritageBuildingPeriod } from '../../../src/lib/buildingTimeline'
import { applyReviewedHeritageConstructionDates } from '../../../src/lib/heritageConstructionDates'
import { linkHeritageLandmarks } from '../../../src/lib/heritageLandmarkLinks'
import { mergeLandmarkSites } from '../../../src/lib/landmarkSites'
import { mergeCuratedParkFeatures } from '../../../src/lib/parkLabels'
import { landmarkSiteLinksWithSources } from '../../../src/data/landmarkSiteSourceAdditions'
import { heritageLandmarkLinks } from '../../../src/data/heritageLandmarkLinks'
import { userApprovedHeritageSiteLinks } from '../../../src/data/userApprovedHeritageSites'
import { reviewedLandmarkIdentities } from '../../../src/data/reviewedLandmarkIdentities'
import { applyReviewedLandmarkIdentities } from '../../../src/lib/reviewedLandmarkIdentities'
import type { HeritageBuildingCollection } from '../../../src/lib/heritageBuildings'
import dateRegistry from '../../../src/data/heritageConstructionDateReviews.json'

const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'))
const raw: HeritageBuildingCollection = read('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson')
const updated = applyReviewedHeritageConstructionDates(raw)
const historical = applyReviewedLandmarkIdentities(mergeLandmarkSites(mergeCuratedParkFeatures(
  read('public/data/historical-features.geojson'), read('public/data/curated-parks.geojson'),
), landmarkSiteLinksWithSources), reviewedLandmarkIdentities)
const links = [...heritageLandmarkLinks, ...userApprovedHeritageSiteLinks]
const beforeLinks = linkHeritageLandmarks(historical, raw, links)
const afterLinks = linkHeritageLandmarks(historical, updated, links)
const records = raw.features.map((feature, index) => {
  const before = linkedHeritageBuildingPeriod(feature, beforeLinks.byOfficialId.get(feature.properties.officialId))
  const after = linkedHeritageBuildingPeriod(updated.features[index], afterLinks.byOfficialId.get(feature.properties.officialId))
  return { officialId: feature.properties.officialId, name: feature.properties.articleTitle, address: feature.properties.address,
    before: { construction: heritageBuildingPeriod(feature), map: before },
    after: { construction: heritageBuildingPeriod(updated.features[index]), map: after },
    reviewedDateApplied: Boolean(updated.features[index].properties.constructionDateEvidence) }
})
const report = { reviewedOn: dateRegistry.reviewedOn, mapped: records.length,
  beforeUnknownConstruction: records.filter(record => record.before.construction.startYear === undefined).length,
  afterUnknownConstruction: records.filter(record => record.after.construction.startYear === undefined).length,
  beforeUnknownOnMap: records.filter(record => record.before.map.startYear === undefined).length,
  afterUnknownOnMap: records.filter(record => record.after.map.startYear === undefined).length,
  newlyDatedMapPoints: records.filter(record => record.before.map.startYear === undefined && record.after.map.startYear !== undefined).length,
  applied: records.filter(record => record.reviewedDateApplied).length,
  records }
const output = 'research/supplemental/2026-10-30-heritage-construction-dates/timeline-coverage.json'
const text = JSON.stringify(report, null, 2) + '\n'
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== text) throw new Error('Coverage report drift')
} else writeFileSync(output, text)
const { records: _, ...summary } = report
console.log(JSON.stringify(summary, null, 2))
