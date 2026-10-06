import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { HistoricalFeatureCollection } from '../types'
import type { HeritageBuildingCollection } from '../lib/heritageBuildings'
import { linkHeritageLandmarks } from '../lib/heritageLandmarkLinks'
import { heritageLandmarkLinks } from './heritageLandmarkLinks'
import { approvedUnlocatedHeritageSites, reviewedContextualHeritageSites, userApprovedHeritageSiteLinks } from './userApprovedHeritageSites'

describe('user-reviewed same-site candidates', () => {
  it('keeps exactly 30 same-site official entries without inventing points for unlocated records', () => {
    const linkedIds = userApprovedHeritageSiteLinks.flatMap((link) => [
      link.officialId,
      ...(link.additionalHeritageOfficialIds ?? []),
    ])
    const unlocatedIds = approvedUnlocatedHeritageSites.map((site) => site.officialId)
    expect(userApprovedHeritageSiteLinks).toHaveLength(16)
    expect(approvedUnlocatedHeritageSites).toHaveLength(12)
    expect(new Set([...linkedIds, ...unlocatedIds]).size).toBe(30)
    expect(reviewedContextualHeritageSites.map((item) => item.row).sort()).toEqual(['C064', 'C065', 'D051', 'N001'])
  })

  it('keeps the two Lipo Garden listings on one site card as distinct protected buildings', () => {
    const link = userApprovedHeritageSiteLinks.find((item) => item.landmarkFeatureId === 'landmark-vs-site-1521')
    expect(link?.officialId).toBe('sh-fgj-2D038-01')
    expect(link?.additionalHeritageOfficialIds).toContain('sh-fgj-4D027-01')
  })

  it('does not create a protected-building map point for Brookside Apartments', () => {
    expect(approvedUnlocatedHeritageSites.find((item) => item.row === 'C036')?.officialCode).toBe('2B020')
    expect(approvedUnlocatedHeritageSites.find((item) => item.row === 'C072')?.officialCode).toBe('2C012')
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
      for (const officialId of [item.officialId, ...(item.additionalHeritageOfficialIds ?? [])]) {
        expect(linked.byOfficialId.get(officialId)?.link.id, item.id).toBe(item.id)
      }
    }
    expect(linked.byOfficialId.get('sh-fgj-2C001-01')?.landmark.properties.id).toBe('landmark-vs-site-169')
    for (const id of ['landmark-vs-site-301', 'landmark-vs-site-13', 'landmark-vs-site-1776',
      'landmark-vs-site-70', 'landmark-vs-site-355', 'landmark-vs-site-85']) {
      const original = historical.features.find((feature) => feature.properties.id === id)!
      const reviewed = linked.features.features.find((feature) => feature.properties.id === id)!
      expect(reviewed.geometry, id).toEqual(original.geometry)
      expect(linked.byGroupId.has(id), id).toBe(false)
    }
    const oldOffice = historical.features.find((feature) => feature.properties.id === 'landmark-vs-site-85')!
    expect(oldOffice.properties.currentAddress).toBeUndefined()
    expect(oldOffice.properties.currentUse).toBeUndefined()
  })

  it('matches the 1922 Great Northern office to Yan’an East Road, not the earlier Bund building', () => {
    const link = userApprovedHeritageSiteLinks.find((item) => item.landmarkFeatureId === 'landmark-vs-site-545')
    expect(link?.officialId).toBe('sh-fgj-3A005-01')
    expect(link?.historicalAddresses[0].address).toBe('34 EDWARD VII ROAD')
    expect([...userApprovedHeritageSiteLinks.flatMap((item) => [item.officialId, ...(item.additionalHeritageOfficialIds ?? [])]),
      ...approvedUnlocatedHeritageSites.map((site) => site.officialId)]).not.toContain('sh-fgj-2A004-01')
  })
})
