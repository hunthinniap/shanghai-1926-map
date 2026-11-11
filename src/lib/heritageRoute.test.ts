import { describe, expect, it } from 'vitest'
import { appRouteLink, parseRoute, webRouteLink, type RouteStop } from './heritageRoute'

const stops: RouteStop[] = Array.from({ length: 4 }, (_, i) => ({ officialId: `building-${i}`, name: `建筑${i}`,
  address: `测试路${i}号`, poiid: `B000${i}`, poiName: `高德地点${i}`, location: `${121.4 + i / 100},31.2` }))
describe('heritage route links', () => {
  it('retains order and every intermediate point in both mobile platforms, with POI IDs for endpoints', () => {
    for (const platform of ['ios', 'android'] as const) {
      const url = new URL(appRouteLink(stops, 'walk', platform)!)
      expect(url.searchParams.get('sid')).toBe('B0000')
      expect(url.searchParams.get('did')).toBe('B0003')
      expect(url.searchParams.get('vian')).toBe('2')
      expect(url.searchParams.get('vialons')!.split('|')).toEqual(stops.slice(1, 3).map(stop => stop.location!.split(',')[0]))
      expect(url.searchParams.get('vianames')).toBe('高德地点1|高德地点2')
      expect(url.searchParams.get('t')).toBe('2')
    }
  })
  it('does not silently omit stops unsupported by the web URI', () => {
    expect(webRouteLink(stops, 'walk')).toBeNull()
    expect(webRouteLink(stops.slice(0, 3), 'walk')).toBeNull()
    const car = new URL(webRouteLink(stops.slice(0, 3), 'car')!)
    expect(car.searchParams.get('via')).toContain('高德地点1')
    expect(webRouteLink(stops.slice(0, 2), 'walk')).toContain('mode=walk')
    expect(appRouteLink([{ ...stops[0], location: undefined }, stops[1]], 'walk', 'ios')).toBeNull()
  })
  it('restores a valid ordered route and rejects corrupt storage or duplicate building IDs', () => {
    expect(parseRoute(JSON.stringify([...stops, stops[0]]))).toEqual(stops)
    expect(parseRoute('broken')).toEqual([])
    expect(parseRoute(JSON.stringify([{ ...stops[0], poiid: 'bad?query=1' }]))).toEqual([])
  })
})
