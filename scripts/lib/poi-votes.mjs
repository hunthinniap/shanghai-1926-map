/** Serialize writes so simultaneous selections cannot overwrite each other. */
export function createPoiVotesMiddleware({ loadCandidates, loadVotes, saveVotes }) {
  let writes = Promise.resolve()
  return function middleware(request, response, next) {
    const url = new URL(request.url, 'http://local')
    if (url.pathname !== '/api/poi-candidate-votes') { next(); return }
    const reply = (status, data) => {
      response.statusCode = status
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.setHeader('Cache-Control', 'no-store')
      response.end(JSON.stringify(data))
    }
    void (async () => {
      if (!['GET', 'POST'].includes(request.method)) { reply(405, { error: '不支持的操作' }); return }
      if (request.method === 'POST' && request.headers['x-poi-selection'] !== '1') { reply(400, { error: '无效的选择请求' }); return }
      let input
      if (request.method === 'POST') {
        let body = ''
        for await (const chunk of request) {
          body += chunk.toString()
          if (body.length > 2048) { reply(413, { error: '请求过长' }); return }
        }
        try { input = JSON.parse(body) } catch { reply(400, { error: '请求格式不正确' }); return }
      }
      const officialId = request.method === 'GET' ? url.searchParams.get('officialId') : input?.officialId
      const dataset = await loadCandidates()
      const record = dataset.records.find(item => item.officialId === officialId)
      if (!record) { reply(404, { error: '该建筑没有待选候选' }); return }
      if (request.method === 'GET') {
        await writes
        const votes = await loadVotes()
        reply(200, { officialId, counts: Object.fromEntries(record.candidates.map(poi => [poi.id, votes[officialId]?.[poi.id] ?? 0])) })
        return
      }
      const poiid = input?.poiid
      if (!record.candidates.some(poi => poi.id === poiid)) { reply(400, { error: '该地点不在此建筑的候选名单中' }); return }
      const task = writes.then(async () => {
        const votes = await loadVotes()
        const previous = votes[officialId]?.[poiid] ?? 0
        if (!Number.isSafeInteger(previous) || previous < 0 || previous >= Number.MAX_SAFE_INTEGER) throw Error('Invalid counter')
        const count = previous + 1
        const nextVotes = { ...votes, [officialId]: { ...votes[officialId], [poiid]: count } }
        await saveVotes(nextVotes)
        reply(200, { officialId, poiid, count })
      })
      writes = task.catch(() => {})
      await task
    })().catch(() => reply(500, { error: '暂时无法保存选择，请重试' }))
  }
}
