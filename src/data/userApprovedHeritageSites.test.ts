import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { HistoricalFeatureCollection } from '../types'
import type { HeritageBuildingCollection } from '../lib/heritageBuildings'
import { linkHeritageLandmarks } from '../lib/heritageLandmarkLinks'
import { heritageLandmarkLinks } from './heritageLandmarkLinks'
import { approvedUnlocatedHeritageSites, userApprovedHeritageSiteLinks } from './userApprovedHeritageSites'

describe('user-reviewed same-site candidates', () => {
  it('keeps exactly 27 reviewed official entries without inventing points for unlocated records', () => {
    const linkedIds = userApprovedHeritageSiteLinks.flatMap((link) => [
      link.officialId,
      ...(link.additionalHeritageOfficialIds ?? []),
    ])
    const unlocatedIds = approvedUnlocatedHeritageSites.map((site) => site.officialId)
    expect(userApprovedHeritageSiteLinks).toHaveLength(14)
    expect(approvedUnlocatedHeritageSites).toHaveLength(11)
    expect(new Set([...linkedIds, ...unlocatedIds]).size).toBe(27)
  })

  it('keeps the two Lipo Garden listings on one site card as distinct protected buildings', () => {
    const link = userApprovedHeritageSiteLinks.find((item) => item.landmarkFeatureId === 'landmark-vs-site-1521')
    expect(link?.officialId).toBe('sh-fgj-2D038-01')
    expect(link?.additionalHeritageOfficialIds).toContain('sh-fgj-4D027-01')
  })

  it('does not create a protected-building map point for Brookside Apartments', () => {
    expect(approvedUnlocatedHeritageSites.find((item) => item.row === 'C036')?.officialCode).toBe('2B020')
  })

  it('does not merge the Aurora women’s college with Taishan Apartments or the Julu Road school', () => {
    expect(userApprovedHeritageSiteLinks.some((item) => item.landmarkFeatureId === 'landmark-vs-site-263')).toBe(false)
    expect(approvedUnlocatedHeritageSites.some((item) => item.landmarkFeatureId === 'landmark-vs-site-263')).toBe(false)
  })

  it('renders every reviewed link against the actual map datasets', () => {
    const historical = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    const heritage = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8')) as HeritageBuildingCollection
    const linked = linkHeritageLandmarks(historical, heritage, [...heritageLandmarkLinks, ...userApprovedHeritageSiteLinks])
    for (const item of userApprovedHeritageSiteLinks) {
      expect(linked.byOfficialId.get(item.officialId)?.link.id, item.id).toBe(item.id)
    }
  })

  it('matches the 1922 Great Northern office to Yan’an East Road, not the earlier Bund building', () => {
    const link = userApprovedHeritageSiteLinks.find((item) => item.landmarkFeatureId === 'landmark-vs-site-545')
    expect(link?.officialId).toBe('sh-fgj-3A005-01')
    expect(link?.historicalAddresses[0].address).toBe('34 EDWARD VII ROAD')
    expect([...userApprovedHeritageSiteLinks.flatMap((item) => [item.officialId, ...(item.additionalHeritageOfficialIds ?? [])]),
      ...approvedUnlocatedHeritageSites.map((site) => site.officialId)]).not.toContain('sh-fgj-2A004-01')
  })
})
