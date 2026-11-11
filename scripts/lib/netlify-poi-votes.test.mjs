import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createNetlifyPoiVotesHandler } from './netlify-poi-votes.mjs'

const dataset = { records: [
  { officialId: 'building-a', candidates: [{ id: 'B0001' }, { id: 'B0002' }] },
  { officialId: 'building-b', candidates: [{ id: 'B0001' }] },
] }
const makeRequest = (body, method = 'POST') => new Request(`https://map.example/api/poi-candidate-votes${method === 'GET' ? '?officialId=building-a' : ''}`, {
  method, headers: { 'X-Poi-Selection': '1' }, ...(body ? { body: JSON.stringify(body) } : {}),
})
function setup() {
  const events = new Map()
  let fail = false
  const getStore = options => {
    assert.deepEqual(options, { name: 'heritage-poi-selections', consistency: 'strong' })
    return {
      async setJSON(key, value, options) {
        assert.equal(options.onlyIfNew, true)
        if (fail) throw Error('Storage unavailable')
        assert(!events.has(key)); events.set(key, value)
        return { modified: true }
      },
      async list({ prefix }) { return { blobs: [...events.keys()].filter(key => key.startsWith(prefix)).map(key => ({ key })) } },
    }
  }
  return { events, create: () => createNetlifyPoiVotesHandler({ dataset, getStore }), setFailure(value) { fail = value } }
}
test('separate function instances retain concurrent selection events and read counts after a new deployment', async () => {
  const store = setup()
  const responses = await Promise.all(Array.from({ length: 25 }, () => store.create()(makeRequest({ officialId: 'building-a', poiid: 'B0001' }))))
  assert(responses.every(response => response.status === 200)); assert.equal(store.events.size, 25)
  const freshRead = await store.create()(makeRequest(undefined, 'GET'))
  assert.deepEqual((await freshRead.json()).counts, { B0001: 25, B0002: 0 })
  const otherBuilding = await store.create()(makeRequest({ officialId: 'building-b', poiid: 'B0001' }))
  assert.equal((await otherBuilding.json()).count, 1)
  const secondPoi = await store.create()(makeRequest({ officialId: 'building-a', poiid: 'B0002' }))
  assert.equal((await secondPoi.json()).count, 1)
})
test('validates the building and its candidates before touching storage', async () => {
  const store = setup(), handler = store.create()
  assert.equal((await handler(makeRequest({ officialId: 'unknown', poiid: 'B0001' }))).status, 404)
  assert.equal((await handler(makeRequest({ officialId: 'building-b', poiid: 'B0002' }))).status, 400)
  assert.equal((await handler(new Request('https://map.example/api/poi-candidate-votes', { method: 'POST', body: '{}' }))).status, 400)
  assert.equal((await handler(makeRequest(undefined, 'DELETE'))).status, 405)
  assert.equal(store.events.size, 0)
})
test('a storage failure cannot claim a successful increment', async () => {
  const store = setup(); store.setFailure(true)
  const handler = store.create()
  assert.equal((await handler(makeRequest({ officialId: 'building-a', poiid: 'B0001' }))).status, 503)
  assert.equal(store.events.size, 0)
  store.setFailure(false)
  assert.equal((await (await handler(makeRequest({ officialId: 'building-a', poiid: 'B0001' }))).json()).count, 1)
})
