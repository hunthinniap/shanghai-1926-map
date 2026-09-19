import test from 'node:test'
import assert from 'node:assert/strict'
import { addressesOverlap, heritageAddressKey, matchHeritageLibrary } from './heritage-library-matching.mjs'
const target = (address, wiki = address, name = '住宅') => ({ id: 'test', codeRaw: 'test',
  official: { addressAsListed: address, originalNameOrUse: name }, wikipedia: { addressAsListed: wiki } })
const plan = { addressClass: 'single-door', sameAddressOfficialIds: ['test'], flags: [] }
const source = (address, extra = {}) => ({ address, nameS: '住宅', uri: 'http://example.org/1', long: '121.5', lat: '31.2',
  coordinates: { coordinateSystem: 'BD-09', longitude: 121.5, latitude: 31.2 }, ...extra })

test('address keys preserve separate house numbers and lane hierarchy', () => {
  assert.notEqual(heritageAddressKey('上海市黄浦区中山路1、2号'), heritageAddressKey('中山路12号'))
  assert.equal(heritageAddressKey('上海市徐汇区長樂路１—３號（单号）'), heritageAddressKey('长乐路1-3号'))
  assert.notEqual(heritageAddressKey('中山路1弄2号'), heritageAddressKey('中山路12号'))
})
test('alternative addresses need an intersecting road/number hierarchy', () => {
  assert.equal(addressesOverlap('虎丘路142-146号', '虎丘路146号'), true)
  assert.equal(addressesOverlap('虎丘路142-146号', '虎丘路147号'), false)
  assert.equal(addressesOverlap('虎丘路142-146号', '其他路146号'), false)
  assert.equal(addressesOverlap('延安路955弄1号', '延安路955号'), false)
  assert.equal(addressesOverlap('武康路40弄1号', '武康路40弄5号'), false)
  assert.equal(addressesOverlap('武康路40弄1-10号', '武康路40弄5号'), true)
  assert.equal(addressesOverlap('武康路2-10号（双号）', '武康路3号'), false)
  assert.equal(addressesOverlap('武康路2-10号（双号）', '武康路4号'), true)
})
test('a sourced door point is converted and retains its BD-09 original', () => {
  const result = matchHeritageLibrary(target('长乐路12号'), plan, [source('长乐路12号')])
  assert.equal(result.status, 'accepted-reference-point')
  assert.equal(result.point.coordinateScope, 'address-reference-point')
  assert.equal(result.point.sourceCoordinates.coordinateSystem, 'BD-09')
  assert.ok(Math.abs(result.point.lon - 121.5) > 0.005)
  assert.equal(result.point.accuracyMetres, null)
})
test('a conflicting generic alternative stays in review', () => {
  const result = matchHeritageLibrary(target('东风街109号', '东风街111号'), plan, [source('东风街111号')])
  assert.equal(result.status, 'needs-review')
  assert.equal(result.point, null)
})
test('same door with different points cannot silently pick its first building', () => {
  const result = matchHeritageLibrary(target('华山路1954号'), plan, [source('华山路1954号'), source('华山路1954号', { uri: 'http://example.org/2', long: '121.4' })])
  assert.equal(result.status, 'needs-review')
})
test('a specific name can resolve a shared-address candidate', () => {
  const result = matchHeritageLibrary(target('华山路1954号', undefined, '礼堂'), plan,
    [source('华山路1954号'), source('华山路1954号', { nameS: '主图书馆', uri: 'http://example.org/2', long: '121.4' })])
  assert.equal(result.status, 'needs-review')
  const named = matchHeritageLibrary(target('华山路1954号', undefined, '主图书馆'), plan,
    [source('华山路1954号'), source('华山路1954号', { nameS: '主图书馆', uri: 'http://example.org/2', long: '121.4' })])
  assert.equal(named.point.libraryUri, 'http://example.org/2')
})
test('source coordinate holds also block manually resolved identities', () => {
  const result = matchHeritageLibrary(target('澳门路660弄'), plan, [source('澳门路660弄')],
    [{ officialId: 'test', libraryUri: 'http://example.org/1', reason: 'Identity verified' }],
    [{ libraryUri: 'http://example.org/1', action: 'hold', reason: 'Copied coordinate on another street' }])
  assert.equal(result.status, 'needs-review')
  assert.equal(result.point, null)
})
test('shared addresses and demolished notes remain explicit', () => {
  const result = matchHeritageLibrary(target('长乐路12号'), { ...plan,
    sameAddressOfficialIds: ['test', 'other'], flags: ['source-reports-demolished'] }, [source('长乐路12号')])
  assert.equal(result.point.coordinateScope, 'building-complex-reference-point')
  assert.ok(result.point.notes.some((note) => note.includes('灭失')))
})
test('identical campus coordinates do not borrow an arbitrary building name', () => {
  const result = matchHeritageLibrary(target('宝庆路20号'), plan, [
    source('宝庆路20号', { nameS: '轻工研究所4号楼' }),
    source('宝庆路20号', { nameS: '轻工研究所3号楼', uri: 'http://example.org/2' }),
  ])
  assert.equal(result.status, 'accepted-reference-point')
  assert.equal(result.point.libraryName, null)
  assert.equal(result.point.identity, 'shared-address-unresolved')
  assert.equal(result.point.coordinateScope, 'building-complex-reference-point')
  assert.equal(result.point.supportingLibraryUris.length, 2)
})
