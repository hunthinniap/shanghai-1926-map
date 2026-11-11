import { describe, expect, it } from 'vitest'
import { amapListGroups, parseRoute, selectedPlacesText, type RouteStop } from './heritageRoute'

const stops: RouteStop[] = Array.from({ length: 4 }, (_, i) => ({ officialId: `building-${i}`, name: `建筑${i}`,
  address: `测试路${i}号`, poiid: `B000${i}`, poiName: `高德地点${i}`, location: `${121.4 + i / 100},31.2` }))
describe('heritage place lists', () => {
  it('copies all names and coordinates in order and resolves known POIs for older saved selections', () => {
    const text = selectedPlacesText([
      { ...stops[0], name: '中国银行', poiid: 'B00155KIMU', location: undefined },
      { ...stops[1], name: '第二处\n建筑' },
      { ...stops[2], name: '未知坐标', location: 'not,a-point' },
    ])
    expect(text.split('\n')).toEqual([
      '名称\t经度（GCJ-02）\t纬度（GCJ-02）',
      '中国银行\t121.489809\t31.23954',
      '第二处 建筑\t121.41\t31.2',
      '未知坐标\t坐标缺失\t坐标缺失',
    ])
  })
  it('uses only POI IDs to display all places without coordinates or navigation parameters', () => {
    const groups = amapListGroups(stops.map(stop => ({ ...stop, location: undefined })))
    expect(groups).toHaveLength(1)
    const url = new URL(groups[0].url)
    expect(url.pathname).toBe('/marker')
    expect(url.searchParams.get('markers')).toBe(stops.map(stop => stop.poiid).join('|'))
    expect(url.searchParams.has('from')).toBe(false)
    expect(url.searchParams.has('mode')).toBe(false)
    expect(amapListGroups([])).toEqual([])
    expect(amapListGroups(stops.slice(0, 1))[0].ids).toEqual(['B0000'])
  })
  it('splits at ten distinct places without losing any selected POI', () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ ...stops[0], officialId: `building-${i}`, poiid: `B00${i}` }))
    expect(amapListGroups(many.slice(0, 10))).toHaveLength(1)
    const groups = amapListGroups(many)
    expect(groups.map(group => group.ids.length)).toEqual([10, 10, 1])
    expect(groups.flatMap(group => new URL(group.url).searchParams.get('markers')!.split('|'))).toEqual(many.map(item => item.poiid))
  })
  it('deduplicates shared map markers without changing the building list', () => {
    const buildings = [...stops, { ...stops[0], officialId: 'other-building' }]
    expect(amapListGroups(buildings)[0].ids).toHaveLength(4)
    expect(buildings).toHaveLength(5)
  })
  it('restores existing selections and rejects corrupt storage or duplicate building IDs', () => {
    expect(parseRoute(JSON.stringify([...stops, stops[0]]))).toEqual(stops)
    expect(parseRoute('broken')).toEqual([])
    expect(parseRoute(JSON.stringify([{ ...stops[0], poiid: 'bad?query=1' }]))).toEqual([])
  })
})
