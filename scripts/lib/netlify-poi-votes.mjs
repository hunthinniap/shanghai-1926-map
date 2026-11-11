import { randomUUID } from 'node:crypto'

/** Each selection is an immutable event, so separate function instances never
 * overwrite one another's increments. The site-wide store survives deploys. */
export function createNetlifyPoiVotesHandler({ dataset, getStore }) {
  const records = new Map(dataset.records.map(record => [record.officialId, record]))
  const json = (status, body) => new Response(JSON.stringify(body), { status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })
  return async function handler(request) {
    try {
      if (!['GET', 'POST'].includes(request.method)) return json(405, { error: '不支持的操作' })
      const url = new URL(request.url)
      let input
      if (request.method === 'POST') {
        if (request.headers.get('x-poi-selection') !== '1') return json(400, { error: '无效的选择请求' })
        const text = await request.text()
        if (text.length > 2048) return json(413, { error: '请求过长' })
        try { input = JSON.parse(text) } catch { return json(400, { error: '请求格式不正确' }) }
      }
      const officialId = request.method === 'GET' ? url.searchParams.get('officialId') : input?.officialId
      const record = records.get(officialId)
      if (!record) return json(404, { error: '该建筑没有待选候选' })
      const allowed = new Set(record.candidates.map(poi => poi.id))
      if (request.method === 'POST' && !allowed.has(input?.poiid)) return json(400, { error: '该地点不在此建筑的候选名单中' })
      const store = getStore({ name: 'heritage-poi-selections', consistency: 'strong' })
      const prefix = `events/${officialId}/`
      if (request.method === 'POST') {
        const result = await store.setJSON(`${prefix}${input.poiid}/${randomUUID()}`, {
          officialId, poiid: input.poiid, selectedAt: new Date().toISOString(),
        }, { onlyIfNew: true })
        if (!result.modified) throw Error('Selection not persisted')
      }
      const { blobs } = await store.list({ prefix })
      const counts = Object.fromEntries([...allowed].map(id => [id, 0]))
      for (const blob of blobs) {
        if (!blob.key.startsWith(prefix)) continue
        const poiid = blob.key.slice(prefix.length).split('/')[0]
        if (allowed.has(poiid)) counts[poiid]++
      }
      return request.method === 'GET' ? json(200, { officialId, counts })
        : json(200, { officialId, poiid: input.poiid, count: counts[input.poiid] })
    } catch { return json(503, { error: '暂时无法保存或读取选择，请稍后重试' }) }
  }
}
