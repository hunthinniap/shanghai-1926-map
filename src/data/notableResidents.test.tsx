import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HeritageBuildingCollection } from '../lib/heritageBuildings'
import { reviewedResidentsForHeritage } from './notableResidents'
import wikipediaReviews from './wikipediaNotableResidents.json'
import { buildPlaceDetails } from '../lib/placeDetails'
import { PlaceDetailsPanel } from '../components/PlaceDetailsPanel'
import { makePlaceSearchRecords, searchRecords } from '../lib/search'

const heritage = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8')) as HeritageBuildingCollection

describe('reviewed Wikipedia residence claims', () => {
  it('keeps every accepted residence attached to its exact directory identity and captured article version', () => {
    expect(wikipediaReviews.records.length).toBeGreaterThan(0)
    for (const record of wikipediaReviews.records) {
      const target = heritage.features.find(feature => feature.properties.officialId === record.officialId)
      expect(target, record.officialId).toBeDefined()
      expect(target!.properties.officialName).toBe(record.expectedName)
      expect(target!.properties.address).toBe(record.expectedAddress)
      for (const resident of record.residents) {
        expect(resident.name.trim()).not.toBe('')
        expect(resident.sources.length).toBeGreaterThan(0)
        expect(resident.sources.some(source => new URL(source.url).hostname === 'zh.wikipedia.org' && Number(new URL(source.url).searchParams.get('oldid')) > 0)).toBe(true)
        for (const source of resident.sources) {
          const url = new URL(source.url)
          expect(url.protocol).toBe('https:')
        }
      }
      const before = structuredClone(target!)
      const details = buildPlaceDetails({ heritage: target! })
      for (const resident of record.residents) expect(details.residents).toContainEqual(resident)
      expect(target).toEqual(before)
      expect(reviewedResidentsForHeritage({ ...target!.properties, address: '另一门牌' })).toEqual([])
      expect(reviewedResidentsForHeritage({ ...target!.properties, officialName: '另一建筑' })).toEqual([])
    }
  })

  it('makes the resident searchable and shows their sourced entry directly below the timeline', () => {
    const target = heritage.features.find(feature => feature.properties.officialId === 'sh-fgj-2B022-01')!
    const result = searchRecords(makePlaceSearchRecords([], heritage.features), '张爱玲')
    expect(result.some(record => record.heritageOfficialId === target.properties.officialId)).toBe(true)
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<PlaceDetailsPanel details={buildPlaceDetails({ heritage: target })} onClose={() => undefined} />)
    const section = container.querySelector('section[aria-label="时间线"]')!.nextElementSibling!
    expect(section.getAttribute('aria-label')).toBe('居住过的名人')
    expect(section.textContent).toContain('张爱玲')
    expect(section.querySelector('a[href*="oldid="]')).not.toBeNull()
  })

  it('does not turn a visitor or a resident of a neighboring city/address into a resident of the mapped building', () => {
    const siming = heritage.features.find(feature => feature.properties.officialId === 'sh-fgj-3B014-01')!
    expect(reviewedResidentsForHeritage(siming.properties).some(resident => resident.name === '泰戈尔')).toBe(false)
    for (const target of heritage.features.filter(feature => ['愚园路699号', '岳阳路145号'].includes(feature.properties.address))) {
      expect(reviewedResidentsForHeritage(target.properties).some(resident => ['严家淦', '沈德潜', '宋子文'].includes(resident.name))).toBe(false)
    }
  })
})
