import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Readable } from 'node:stream'
import { createPoiVotesMiddleware } from './poi-votes.mjs'

const dataset = { records: [
  { officialId: 'a', candidates: [{ id: 'poi1' }, { id: 'poi2' }] },
  { officialId: 'b', candidates: [{ id: 'poi1' }] },
] }
function setup() {
  let saved = {}, fail = false
  const create = () => createPoiVotesMiddleware({ loadCandidates: async () => dataset,
    loadVotes: async () => structuredClone(saved),
    saveVotes: async votes => { if (fail) throw Error('Disk full'); saved = structuredClone(votes) },
  })
  return { middleware: create(), create, setFailure(value) { fail = value } }
}
function request(middleware, body, method = 'POST', path = '/api/poi-candidate-votes', headers = { 'x-poi-selection': '1' }) {
  return new Promise(resolve => {
    const incoming = Object.assign(Readable.from(body === undefined ? [] : [JSON.stringify(body)]), { method, url: path, headers })
    const outgoing = { statusCode: 200, setHeader() {}, end(text) { resolve({ status: this.statusCode, body: JSON.parse(text) }) } }
    middleware(incoming, outgoing, () => resolve({ next: true }))
  })
}
test('each selection increments once, concurrent selections are retained, and a fresh service reads saved counts', async () => {
  const store = setup()
  const results = await Promise.all(Array.from({ length: 25 }, () => request(store.middleware, { officialId: 'a', poiid: 'poi1' })))
  assert(results.every(result => result.status === 200))
  assert.deepEqual(results.map(result => result.body.count), Array.from({ length: 25 }, (_, i) => i + 1))
  const fresh = await request(store.create(), undefined, 'GET', '/api/poi-candidate-votes?officialId=a')
  assert.deepEqual(fresh.body.counts, { poi1: 25, poi2: 0 })
  assert.equal((await request(store.middleware, { officialId: 'b', poiid: 'poi1' })).body.count, 1)
})
test('rejects unknown targets and unrelated candidate IDs without writing a vote', async () => {
  const { middleware } = setup()
  assert.equal((await request(middleware, { officialId: 'missing', poiid: 'poi1' })).status, 404)
  assert.equal((await request(middleware, { officialId: 'b', poiid: 'poi2' })).status, 400)
  assert.equal((await request(middleware, { officialId: 'a', poiid: '__proto__' })).status, 400)
  assert.deepEqual((await request(middleware, undefined, 'GET', '/api/poi-candidate-votes?officialId=a')).body.counts, { poi1: 0, poi2: 0 })
})
test('failed persistence reports failure and does not inflate the count; subsequent saves recover', async () => {
  const store = setup(); store.setFailure(true)
  assert.equal((await request(store.middleware, { officialId: 'a', poiid: 'poi1' })).status, 500)
  store.setFailure(false)
  assert.equal((await request(store.middleware, { officialId: 'a', poiid: 'poi1' })).body.count, 1)
})
test('only handles its own endpoint and requires explicit selection requests', async () => {
  const { middleware } = setup()
  assert.equal((await request(middleware, undefined, 'GET', '/')).next, true)
  assert.equal((await request(middleware, {}, 'DELETE')).status, 405)
  assert.equal((await request(middleware, { officialId: 'a', poiid: 'poi1' }, 'POST', '/api/poi-candidate-votes', {})).status, 400)
})
