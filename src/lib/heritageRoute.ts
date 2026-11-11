import { useSyncExternalStore } from 'react'
import amapLocations from '../data/heritageAmapLocations.json'

export interface RouteStop { officialId: string; name: string; address: string; poiid: string; poiName: string; location?: string; referenceNote?: string }
// Preserve the original key so previously selected buildings remain available.
export const routeStorageKey = 'shanghai-heritage-route-v1'
export function parseRoute(raw: string | null): RouteStop[] {
  try {
    const data: unknown = JSON.parse(raw || '[]')
    if (!Array.isArray(data)) return []
    const seen = new Set<string>()
    return data.filter((x): x is RouteStop => {
      if (!x || typeof x !== 'object' || typeof x.officialId !== 'string' || typeof x.name !== 'string'
        || typeof x.address !== 'string' || typeof x.poiName !== 'string' || typeof x.poiid !== 'string' || !/^[A-Za-z0-9]+$/.test(x.poiid)
        || x.location !== undefined && typeof x.location !== 'string' || x.referenceNote !== undefined && typeof x.referenceNote !== 'string'
        || seen.has(x.officialId)) return false
      seen.add(x.officialId); return true
    })
  } catch { return [] }
}
const empty = { items: [] as RouteStop[], error: '' }
let state = empty, loaded = false
const listeners = new Set<() => void>()
function read() {
  if (!loaded && typeof window !== 'undefined') {
    loaded = true
    try { state = { items: parseRoute(localStorage.getItem(routeStorageKey)), error: '' } } catch { /* Keep an in-memory route. */ }
  }
  return state
}
function save(items: RouteStop[]) {
  let error = ''
  try { localStorage.setItem(routeStorageKey, JSON.stringify(items)) } catch { error = '清单暂未保存到浏览器，关闭页面前请保留地点信息。' }
  state = { items, error }; listeners.forEach(listener => listener())
}
function storageChange(event: StorageEvent) {
  if (event.key !== routeStorageKey && event.key !== null) return
  state = { items: parseRoute(event.newValue), error: '' }; listeners.forEach(listener => listener())
}
const subscribe = (listener: () => void) => {
  if (!listeners.size) window.addEventListener('storage', storageChange)
  listeners.add(listener)
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener('storage', storageChange) }
}
export function useHeritageRoute() { return useSyncExternalStore(subscribe, read, () => empty) }
export function addRouteStop(stop: RouteStop) {
  const items = read().items
  const existing = items.findIndex(item => item.officialId === stop.officialId)
  save(existing < 0 ? [...items, stop] : items.map((item, index) => index === existing ? stop : item))
}
export function removeRouteStop(id: string) { save(read().items.filter(item => item.officialId !== id)) }
export function moveRouteStop(id: string, offset: number) {
  const items = [...read().items], index = items.findIndex(item => item.officialId === id), next = index + offset
  if (index < 0 || next < 0 || next >= items.length) return
  ;[items[index], items[next]] = [items[next], items[index]]; save(items)
}
export function clearHeritageRoute() { save([]) }
export function selectedPlacesText(items: RouteStop[]) {
  const coordinates = (value?: string) => {
    const parts = value?.split(',').map(part => part.trim())
    if (!parts || parts.length !== 2 || parts.some(part => !part)) return null
    const [lon, lat] = parts.map(Number)
    return Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90
      ? [lon, lat].map(value => Number(value.toFixed(6))) : null
  }
  return ['名称\t经度（GCJ-02）\t纬度（GCJ-02）', ...items.map(item => {
    const point = coordinates((amapLocations as Record<string, string>)[item.poiid]) ?? coordinates(item.location)
    return [item.name.replace(/\s+/gu, ' ').trim(), ...(point ?? ['坐标缺失', '坐标缺失'])].join('\t')
  })].join('\n')
}
export function amapListGroups(items: RouteStop[]) {
  const unique = [...new Map(items.map(item => [item.poiid, item])).values()]
  const groups: { ids: string[]; url: string }[] = []
  for (let index = 0; index < unique.length; index += 10) {
    const ids = unique.slice(index, index + 10).map(item => item.poiid)
    const params = new URLSearchParams({ markers: ids.join('|'), src: 'shanghai_heritage', callnative: '1' })
    groups.push({ ids, url: `https://uri.amap.com/marker?${params}` })
  }
  return groups
}
