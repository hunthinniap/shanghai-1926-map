import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { providedRoadHistory, roadRangeStart } from './road-history-import.mjs'

const rows = JSON.parse(fs.readFileSync('research/road-histories/2026-11-05-results/input/all-road-histories-results.json', 'utf8')).batches.flatMap(b => b.results)
const properties = JSON.parse(fs.readFileSync('public/data/historical-features.geojson', 'utf8')).features.map(f => f.properties)
const project = id => {
  const row = rows.find(r => r.featureGroupId === id)
  return providedRoadHistory(row, properties.find(p => p.featureGroupId === id))
}

test('range display takes the first supported year and keeps open bounds distinct', () => {
  assert.equal(roadRangeStart('1884年—1900年'), 1884)
  assert.equal(roadRangeStart('1914年—1915年（民国3—4年）'), 1914)
  assert.equal(roadRangeStart('1945年10月—1950年5月'), 1945)
  assert.equal(roadRangeStart('1920年代初'), 1920)
  assert.equal(roadRangeStart('1949年后'), undefined)
  assert.equal(roadRangeStart('1925年以前'), undefined)
})

test('a conflicting status does not block the supplied Gordon Road name history', () => {
  const result = project('road-gordon-road-江宁路')
  assert.deepEqual(result.events.map(e => [e.year, e.name]), [[1884, '戈登路 (Gordon Road)'], [1943, '江宁路']])
  assert.equal(result.events[0].originalPeriod, '1884年—1900年')
  assert.match(result.events[0].url, /nodeId=7417/)
  assert.equal(result.excluded.length, 1)
})

test('mixed building records do not discard the usable Gaoan Road event', () => {
  const result = project('road-route-andre-cohen-高安路')
  assert.deepEqual(result.events.map(e => e.year), [1914])
  assert.equal(result.excluded.length, 7)
})

test('separates explicitly dated name changes within a supplied interval', () => {
  const result = project('road-rockhill-avenue-淮海西路')
  assert.deepEqual(result.events.slice(-2).map(e => [e.year, e.name]), [[1945, '林森西路'], [1950, '淮海西路']])
})

test('bare building references and placeholders do not create road dates', () => {
  assert.deepEqual(project('road-elgin-road-安庆路').events, [])
  assert.deepEqual(project('road-crescent-avenue-to-do').events, [])
})

test('restoring the Tibet Road name consumes the whole 改回 verb for both original records', () => {
  for (const id of ['road-thibet-road-西藏中路', 'road-yuyaching-road-西藏中路']) {
    const event = project(id).events.find(e => e.year === 1943)
    assert.equal(event.name, '西藏路')
    assert.equal(event.url, 'https://zh.wikipedia.org/w/index.php?oldid=92213609')
  }
})

test('renaming verbs do not become part of the name or remove a genuine initial 回', () => {
  const row = rows.find(r => r.featureGroupId === 'road-thibet-road-西藏中路')
  const p = properties.find(p => p.featureGroupId === row.featureGroupId)
  for (const [text, expected] of [
    ['1943年改回西藏路', '西藏路'],
    ['1943年改称为西藏路', '西藏路'],
    ['1943年恢复为西藏路', '西藏路'],
    ['1943年复名为西藏路', '西藏路'],
    ['1943年改西藏路', '西藏路'],
    ['1943年改回回龙路', '回龙路'],
    ['回龙路', '回龙路'],
  ]) {
    const input = { ...row, events: [{ ...row.events[2], name: text, segment: text }] }
    assert.equal(providedRoadHistory(input, p).events[0].name, expected, text)
  }
  assert(!project('road-route-de-zikawei-徐家汇路').events.some(e => /煤屑/.test(e.name)))
})
