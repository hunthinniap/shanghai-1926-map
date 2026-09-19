import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeHeritageAddress, planHeritageAddress, buildHeritageAddressPlan, buildHeritageGeocodingTargets } from './heritage-addresses.mjs'

function record(address, extra = {}) {
  return { id: 'fixture', batch: 2, codeRaw: '2A001', locationStatus: 'no-source-coordinate',
    official: { originalNameOrUse: '测试住宅', listedNameOrUse: '住宅', addressAsListed: address,
      districtAsListed: '徐汇区', sourceNotes: [], source: { url: 'https://example.org/list', rowIndices: [1] } },
    address: { alternatives: [] }, match: { reviewFlags: [], comparisons: { address: { status: 'exact' } } },
    wikipedia: { id: 'fixture-wiki', addressAsListed: address, components: [], source: { url: 'https://example.org/wiki' } }, ...extra }
}

test('query normalization keeps a full house number and original text', () => {
  const r = planHeritageAddress(record('淮海中路 １２２２ 號'))
  assert.equal(r.addressAsListed, '淮海中路 １２２２ 號')
  assert.equal(r.queries[0].query, '上海市徐汇区淮海中路1222号')
  assert.equal(r.addressClass, 'single-door')
  assert.equal(normalizeHeritageAddress('廣東路94—102號/\n四川中路109號'), '广东路94-102号/；四川中路109号')
})

test('number ranges and lists never become a falsely precise first door number', () => {
  const range = planHeritageAddress(record('南京东路627-635号'))
  assert.equal(range.queries[0].addressText, '南京东路627-635号')
  assert.equal(range.addressClass, 'number-range')
  assert.equal(range.queries.length, 1)
  const list = planHeritageAddress(record('桃江路7、15、21、25号'))
  assert.equal(list.addressClass, 'multiple-numbers')
  assert.equal(list.addressComponents.length, 1)
  assert.equal(list.addressComponents[0].addressText, '桃江路7、15、21、25号')
})

test('separate road components keep ranges and inherited lane numbers', () => {
  const r = planHeritageAddress(record('淮海中路584弄1-14号，成都南路142弄1-7号，成都南路132弄33-38号'))
  assert.equal(r.addressClass, 'multiple-streets')
  assert.equal(r.addressComponents.length, 3)
  assert.equal(r.queries[3].query, '上海市徐汇区成都南路132弄33-38号')
  const shared = planHeritageAddress(record('湖南路280弄2、4、9、20号；296弄14-26号'))
  assert.equal(shared.addressComponents.length, 1)
  assert.equal(shared.addressComponents[0].addressText, '湖南路280弄2、4、9、20号、296弄14-26号')
})

test('lane doors and sub-building addresses retain their subordinate information', () => {
  assert.equal(planHeritageAddress(record('武康路40弄1号')).addressClass, 'lane-door')
  const r = planHeritageAddress(record('岳阳路320号（14号楼）'))
  assert.equal(r.addressClass, 'sub-building')
  assert.equal(r.queries[0].addressText, '岳阳路320号(14号楼)')
  assert.ok(r.requiresReview)
  assert.equal(planHeritageAddress(record('东安路131号东1号楼')).precisionHint, 'sub-building-needs-confirmation')
})

test('historical districts change queries only and are not duplicated', () => {
  const input = record('崇明县城桥镇南门港街26号')
  input.official.districtAsListed = '崇明县'
  const r = planHeritageAddress(input)
  assert.equal(r.addressAsListed, '崇明县城桥镇南门港街26号')
  assert.equal(r.queries[0].query, '上海市崇明区城桥镇南门港街26号')
  const j = record('南苏州路85号')
  j.official.districtAsListed = '原闸北区'
  assert.equal(planHeritageAddress(j).queries[0].query, '上海市静安区南苏州路85号')
})

test('source alternatives do not overwrite an official conflicting address', () => {
  const r = record('常熟路179号')
  r.wikipedia.addressAsListed = '常熟路183弄'
  r.match.reviewFlags = ['address-difference']
  const plan = planHeritageAddress(r)
  assert.equal(plan.queries[0].query, '上海市徐汇区常熟路179号')
  assert.equal(plan.queries[1].query, '上海市徐汇区常熟路183弄')
  assert.equal(plan.queries[1].kind, 'source-alternative-address')
  assert.ok(plan.queries[1].requiresReview)
})

test('intersection, rural address, missing address and demolition are not exact building points', () => {
  assert.equal(planHeritageAddress(record('天山路、哈密路口')).addressClass, 'intersection')
  assert.equal(planHeritageAddress(record('合庆镇华星村连家宅67号')).addressClass, 'rural-number')
  const missing = planHeritageAddress(record(null))
  assert.equal(missing.addressClass, 'missing-address')
  assert.equal(missing.queries[0].kind, 'historic-name-only')
  const demolished = record('陕西北路80号')
  demolished.official.sourceNotes = ['*于1994年左右灭失']
  assert.ok(planHeritageAddress(demolished).flags.includes('source-reports-demolished'))
  assert.ok(planHeritageAddress(demolished).requiresReview)
})

test('same listed address preserves separate IDs including already located siblings', () => {
  const a = record('岳阳路145号', { id: 'a' })
  const b = record('岳阳路145号', { id: 'b', locationStatus: 'has-reference-point' })
  const targets = buildHeritageGeocodingTargets({ records: [a, b] })
  assert.equal(targets.records.length, 1)
  assert.deepEqual(targets.records[0].sameAddressOfficialIds, ['a', 'b'])
  const plan = buildHeritageAddressPlan(targets)
  assert.equal(plan.records.length, 1)
  assert.ok(plan.records[0].requiresReview)
  assert.equal(plan.stats.withSharedListedAddress, 1)
})
