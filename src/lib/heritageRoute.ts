import { useSyncExternalStore } from 'react'

export interface RouteStop { officialId: string; name: string; address: string; poiid: string; poiName: string; location?: string; referenceNote?: string }
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
  try { localStorage.setItem(routeStorageKey, JSON.stringify(items)) } catch { error = '路线暂未保存到浏览器，关闭页面前请保留地点信息。' }
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
export function routeCoordinates(stop: RouteStop) {
  const values = stop.location?.split(',').map(Number)
  return values?.length === 2 && values.every(Number.isFinite) && Math.abs(values[0]) <= 180 && Math.abs(values[1]) <= 90 ? values : null
}
const cleanName = (name: string) => name.replace(/[,|]/gu, ' ')
export function webRouteLink(stops: RouteStop[], mode: 'walk' | 'car') {
  if (stops.length < 2 || stops.length > (mode === 'car' ? 3 : 2) || stops.some(stop => !routeCoordinates(stop))) return null
  const point = (stop: RouteStop) => `${routeCoordinates(stop)!.join(',')},${cleanName(stop.poiName)}`
  const params = new URLSearchParams({ from: point(stops[0]), to: point(stops.at(-1)!), mode, src: 'shanghai_heritage', callnative: '1' })
  if (stops.length === 3) params.set('via', point(stops[1]))
  return `https://uri.amap.com/navigation?${params}`
}
export function appRouteLink(stops: RouteStop[], mode: 'walk' | 'car', platform: 'ios' | 'android') {
  if (stops.length < 2 || stops.some(stop => !routeCoordinates(stop))) return null
  const start = stops[0], end = stops.at(-1)!, via = stops.slice(1, -1)
  const params = new URLSearchParams({ sourceApplication: 'ShanghaiHeritage', sid: start.poiid, did: end.poiid,
    slon: String(routeCoordinates(start)![0]), slat: String(routeCoordinates(start)![1]), sname: cleanName(start.poiName),
    dlon: String(routeCoordinates(end)![0]), dlat: String(routeCoordinates(end)![1]), dname: cleanName(end.poiName), dev: '0', t: mode === 'car' ? '0' : '2', m: '0' })
  if (via.length) {
    params.set('vian', String(via.length)); params.set('vialons', via.map(stop => routeCoordinates(stop)![0]).join('|'))
    params.set('vialats', via.map(stop => routeCoordinates(stop)![1]).join('|')); params.set('vianames', via.map(stop => cleanName(stop.poiName)).join('|'))
  }
  return `${platform === 'ios' ? 'iosamap://path' : 'amapuri://route/plan/'}?${params}`
}
