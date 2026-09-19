import test from 'node:test'
import assert from 'node:assert/strict'
import { codeTarget, compareRecords, matchListings, articleScope, articleLocation } from './wikipedia-heritage-enrichment.mjs'

test('legacy III is not the batch number, and the second-batch E aliases are preserved', () => {
  assert.equal(codeTarget({ batch: 2, codeRaw: 'A-Ⅲ-050' }).code, '2A050')
  assert.equal(codeTarget({ batch: 2, codeRaw: 'E-Ⅲ-003' }).code, '2A058')
  assert.equal(codeTarget({ batch: 3, codeRaw: 'D-III-49' }).code, '3D001')
  assert.equal(codeTarget({ batch: 3, codeRaw: 'D-III-83' }).code, '3D035')
  for (const [letter, code] of [['O', '3W001'], ['P', '3J001'], ['Q', '3K001']]) {
    assert.equal(codeTarget({ batch: 3, codeRaw: `${letter}-III-01` }).code, code)
  }
  assert.throws(() => codeTarget({ batch: 3, codeRaw: 'D-III-48' }), /Unknown/u)
})

test('source code anomalies target explicit unique IDs without changing the raw code', () => {
  assert.equal(codeTarget({ batch: 4, codeRaw: '4H008' }).code, '4H007')
  assert.equal(codeTarget({ batch: 5, codeRaw: 'HP-J-012-V' }).officialId, 'sh-fgj-5A012-01')
  assert.equal(codeTarget({ batch: 5, codeRaw: 'HP-J-013-V' }).officialId, 'sh-fgj-5A012-02')
  assert.equal(codeTarget({ batch: 5, codeRaw: 'HK-J-039-V' }).officialId, 'sh-fgj-5F038-02')
  assert.equal(codeTarget({ batch: 5, codeRaw: 'XH-J-080-V' }).officialId, 'sh-fgj-b5-50D80-01')
  assert.throws(() => codeTarget({ batch: 5, codeRaw: 'XX-J-001-V' }), /Unknown/u)
})

test('same names and addresses cannot collapse distinct listed buildings', () => {
  const official = ['2D024', '2D028'].map((code) => ({ id: code, code, codeRaw: code, batch: 2,
    originalNameOrUse: '住宅', addressAsListed: '岳阳路145号' }))
  const wiki = ['024', '028'].map((n, index) => ({ id: n, batch: 2, codeRaw: `D-Ⅲ-${n}`,
    originalNameOrUse: '住宅', addressAsListed: index ? '岳阳路145号' : '永嘉路501号' }))
  const result = matchListings(official, wiki, [])
  assert.deepEqual(result.map((r) => r.officialId), ['2D024', '2D028'])
  assert.equal(result[0].comparisons.address.status, 'different-as-listed')
  assert.equal(result[1].comparisons.address.status, 'exact')
  assert.throws(() => matchListings(official, [wiki[0], { ...wiki[0], id: 'duplicate' }], []), /Multiple/u)
})

test('first-batch sequence cannot substitute for a reviewed identity mapping', () => {
  assert.throws(() => matchListings([{ id: '1A001', batch: 1 }], [{ id: 'wiki-1', batch: 1, sequenceRaw: '1' }], []), /No reviewed mapping/u)
})

test('name normalization accepts traditional characters but does not erase address differences', () => {
  assert.equal(compareRecords({ originalNameOrUse: '中国银行大楼', addressAsListed: '中山东一路23号' },
    { originalNameOrUse: '中國銀行大樓', addressAsListed: '中山東一路 23 號' }).address.status, 'formatting-only')
  assert.equal(compareRecords({ addressAsListed: '常熟路179号' }, { addressAsListed: '常熟路183弄' }).address.status, 'different-as-listed')
})

const article = (overrides = {}) => ({ requestedTitle: '测试大楼', resolvedTitle: '测试大楼', url: 'https://zh.wikipedia.org/wiki/测试大楼',
  wikidataId: 'Q1', wikipediaCoordinates: [], entity: { coordinateClaims: [], instanceOfIds: [] }, sourceRefs: ['source1'], ...overrides })
const scope = { scope: 'building-reference', reason: 'fixture' }
const claim = (overrides = {}) => ({ lat: 31.2, lon: 121.5, globe: 'http://www.wikidata.org/entity/Q2', rank: 'normal', precision: 0.0001, ...overrides })

test('institution/campus/person positions are candidates, never building reference points', () => {
  const a = article({ resolvedTitle: '上海中学', entity: { instanceOfIds: [], coordinateClaims: [claim()] } })
  const s = articleScope(a)
  assert.equal(s.scope, 'organization')
  assert.equal(articleLocation(a, s).point, null)
  assert.equal(articleLocation(a, s).status, 'scope-review')
  assert.equal(articleScope(a, [{ title: a.requestedTitle, scope: 'campus', reason: 'schoolwide' }]).scope, 'campus')
  assert.equal(articleScope(article({ entity: { instanceOfIds: ['Q5'] } })).scope, 'person')
})

test('non-Earth, non-Shanghai, deprecated and secondary positions are excluded', () => {
  const a = article({ wikipediaCoordinates: [{ lat: 31.2, lon: 121.5, primary: false }],
    entity: { coordinateClaims: [claim({ globe: 'http://www.wikidata.org/entity/Q111' }), claim({ lat: 22.3 }), claim({ rank: 'deprecated' })] } })
  const result = articleLocation(a, scope)
  assert.equal(result.status, 'rejected')
  assert.equal(result.point, null)
  assert.equal(result.candidates.length, 4)
})

test('conflicting primary coordinates require review while a preferred claim outranks normal', () => {
  const a = article({ wikipediaCoordinates: [{ lat: 31.2, lon: 121.5, primary: true }],
    entity: { coordinateClaims: [claim({ lon: 121.52 })] } })
  assert.equal(articleLocation(a, scope).status, 'coordinate-conflict')
  assert.equal(articleLocation(a, scope).point, null)
  const b = article({ entity: { coordinateClaims: [claim({ lon: 121.52 }), claim({ rank: 'preferred' })] } })
  assert.equal(articleLocation(b, scope).point.lon, 121.5)
})

test('coarse or unspecified-globe Wikidata values stay as candidates', () => {
  const coarse = article({ entity: { coordinateClaims: [claim({ precision: 0.01 })] } })
  assert.equal(articleLocation(coarse, scope).status, 'precision-review')
  assert.equal(articleLocation(coarse, scope).point, null)
  assert.equal(articleLocation(article({ entity: { coordinateClaims: [claim({ globe: null })] } }), scope).point, null)
})

test('primary Wikipedia position and source precision remain explicit', () => {
  const a = article({ wikipediaCoordinates: [{ lat: 31.2, lon: 121.5, primary: true }],
    entity: { coordinateClaims: [claim({ lon: 121.50001 })] } })
  const result = articleLocation(a, scope)
  assert.equal(result.point.origin, 'wikipedia-geodata')
  assert.equal(result.point.precision, null)
  assert.equal(result.candidates[1].precision, 0.0001)
  assert.equal(articleLocation(a, { scope: 'complex' }).point.coordinateScope, 'building-complex-reference-point')
})
