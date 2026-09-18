import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { applyCurrentUseHold, clearCurrentUse, findCurrentUseHold } from './current-use-holds.mjs'

const execFileAsync = promisify(execFile)
const projectRoot = fileURLToPath(new URL('../../', import.meta.url))
const makeHold = (featureGroupId, sourceRecordIds) => ({
  featureGroupId,
  sourceRecordIds,
  reason: 'Original site and modern use need further evidence.',
  sourceUrls: ['https://example.test/review-source'],
  reviewedAt: '2026-09-18',
  reviewRef: 'research/rechecks/test-review.json',
})

test('clears all modern-use fields without changing historical identity or mutating input', () => {
  const properties = {
    featureGroupId: 'old-site', sourceRecordIds: [499, 1554],
    historicalName: 'Convent', modernNameZh: '历史标签', sourceIds: ['vs-buildings'],
    currentUse: 'Museum', currentNameZh: 'Incorrect museum', currentAddress: 'Wrong address',
    currentUseNote: 'Old assertion', currentUseSources: [{ url: 'https://example.test' }],
    currentUseSourceId: 'old', currentUseSourceUri: 'https://example.test',
    currentUseRelationship: 'same-building', currentUseMatch: 'matched', currentUseMatchDistance: 9,
    currentUseFutureField: 'Must not survive either',
  }
  const before = structuredClone(properties)
  assert.deepEqual(clearCurrentUse(properties), {
    featureGroupId: 'old-site', sourceRecordIds: [499, 1554],
    historicalName: 'Convent', modernNameZh: '历史标签', sourceIds: ['vs-buildings'],
  })
  assert.deepEqual(properties, before)
})

test('holds follow any member across renamed or split groups without leaking through a shared legacy name', () => {
  const hold = makeHold('legacy-convent', [499, 1554])
  assert.equal(findCurrentUseHold([hold], { featureGroupId: 'legacy-convent' }), hold)
  assert.equal(findCurrentUseHold([hold], {
    featureGroupId: 'new-convent', legacyFeatureGroupIds: ['legacy-convent'],
    sourceRecordIds: [499, 1554],
  }), hold)
  assert.equal(findCurrentUseHold([hold], {
    featureGroupId: 'separated-church', sourceRecordIds: [1554],
  }), hold)
  assert.equal(findCurrentUseHold([hold], {
    featureGroupId: 'merged-group', sourceRecordIds: [900, 499],
  }), hold)
  assert.equal(findCurrentUseHold([hold], {
    featureGroupId: 'unrelated-split', legacyFeatureGroupIds: ['legacy-convent'],
    sourceRecordIds: [900],
  }), undefined)
  assert.equal(findCurrentUseHold([hold], {
    featureGroupId: 'old-feature-without-member-ids', legacyFeatureGroupIds: ['legacy-convent'],
  }), hold)
})

test('audit hold removes stale acceptance and candidates, preserves identity, and copies hold metadata', () => {
  const hold = makeHold('old-site', [499, 1554])
  const audit = {
    featureGroupId: 'new-site', historicalName: 'Convent',
    status: 'matched-library-cache', accepted: { currentNameZh: 'Wrong museum' },
    queries: ['Old query'], searchResultCount: 3, reviewCandidate: { currentNameZh: 'Candidate' },
    nearestSearchResult: { currentNameZh: 'Nearby place' },
  }
  const updated = applyCurrentUseHold(audit, hold)
  assert.equal(updated.status, 'needs-review-research')
  assert.equal(updated.featureGroupId, 'new-site')
  assert.equal(updated.historicalName, 'Convent')
  for (const key of ['accepted', 'reviewCandidate', 'nearestSearchResult']) assert.ok(!(key in updated))
  assert.deepEqual(updated.queries, [])
  assert.equal(updated.searchResultCount, 0)
  assert.deepEqual(updated.reviewHold, hold)
  updated.reviewHold.sourceRecordIds.push(999)
  updated.reviewHold.sourceUrls.push('https://example.test/other')
  assert.deepEqual(hold.sourceRecordIds, [499, 1554])
  assert.equal(hold.sourceUrls.length, 1)
  assert.equal(audit.status, 'matched-library-cache')
  assert.ok(audit.accepted)
})

async function writeJson(root, name, value) {
  const file = path.join(root, name)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(value))
}

async function readJson(root, name) {
  return JSON.parse(await fs.readFile(path.join(root, name), 'utf8'))
}

async function makeWorkspace(t, script) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'current-use-holds-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  await fs.mkdir(path.join(root, 'scripts/lib'), { recursive: true })
  await fs.copyFile(path.join(projectRoot, 'scripts', script), path.join(root, 'scripts', script))
  await fs.copyFile(path.join(projectRoot, 'scripts/lib/current-use-holds.mjs'), path.join(root, 'scripts/lib/current-use-holds.mjs'))
  await fs.symlink(path.join(projectRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir')
  return root
}

function feature(id, sourceRecordIds, extra = {}) {
  return {
    type: 'Feature', geometry: { type: 'Point', coordinates: [121.45, 31.22] },
    properties: {
      kind: 'landmark', id, featureGroupId: id, sourceRecordIds,
      historicalName: id, modernNameZh: '待查历史设施', category: '重要建筑',
      currentUse: 'Stale use', currentNameZh: 'Stale name', currentAddress: 'Stale address',
      currentUseSourceUri: 'https://example.test/stale', currentUseFutureField: 'Stale extension',
      ...extra,
    },
  }
}

const collection = (features) => ({ type: 'FeatureCollection', features })

for (const networkAvailable of [true, false]) {
  test(`enrich script blocks every fallback and clears both collections (network ${networkAvailable ? 'available' : 'unavailable'})`, async (t) => {
    const root = await makeWorkspace(t, 'enrich-landmark-current-uses.mjs')
    const source = await fs.readFile(path.join(root, 'scripts/enrich-landmark-current-uses.mjs'), 'utf8')
    // The production script validates all its built-in Wikipedia targets. Give
    // each one a fixture, while checking hold precedence on the first target.
    const wikiSection = source.slice(source.indexOf('const wikipediaMatches'), source.indexOf('const genericQueries'))
    const wikiIds = [...wikiSection.matchAll(/\['([^']+)', \{/gu)].map((match) => match[1])
    assert.ok(wikiIds.length > 1)
    const wikiFeatures = wikiIds.map((id, index) => feature(id, [10_000 + index]))
    const research = feature('research-renamed', [499, 1554], { legacyFeatureGroupIds: ['research-old'] })
    const fresh = feature('fresh-library-held', [70001], { modernNameZh: '不可查询大楼' })
    const cached = feature('cached-library-held', [1274], { modernNameZh: '不可缓存大楼' })
    const park = feature('current-park-held', [70002], { category: '现存公园', modernNameZh: '公园' })
    park.geometry = { type: 'Polygon', coordinates: [[[121.45, 31.22], [121.46, 31.22], [121.45, 31.23], [121.45, 31.22]]] }
    const control = feature('library-control', [70003], { modernNameZh: '已核控制大楼' })
    const holds = [makeHold(wikiIds[0], [10000]), makeHold('research-old', [499, 1554]),
      makeHold('fresh-library-held', [70001]), makeHold('cached-library-held', [1274]), makeHold('current-park-held', [70002])]
    const features = [...wikiFeatures, research, fresh, cached, park, control]
    await writeJson(root, 'public/data/historical-features.geojson', collection(features))
    await writeJson(root, 'public/data/curated-parks.geojson', collection([park]))
    await writeJson(root, 'public/data/sources.json', [])
    await writeJson(root, 'scripts/data/landmark-current-use-holds.json', holds)
    await writeJson(root, 'scripts/data/landmark-current-use-overrides.json', [{
      featureGroupId: 'research-old', sourceRecordIds: [499, 1554], expectedHistoricalNames: ['research-renamed'],
      currentUse: 'Bad research use', currentNameZh: 'Bad research building', currentAddress: 'Bad address',
      currentUseSourceUri: 'https://example.test/research', evidence: 'Old assertion',
    }])
    await writeJson(root, 'public/data/landmark-current-use-audit.json', {
      records: [cached, control].map((item) => ({
        featureGroupId: item.properties.featureGroupId, status: 'matched',
        accepted: { currentNameZh: 'Cached building', currentAddress: 'Cached address', currentUse: 'Cached use',
          sourceUri: 'https://example.test/cache', distanceMetres: 0, query: 'Cache', evidence: 'Historical relation' },
      })),
    })
    await fs.writeFile(path.join(root, 'mock-network.mjs'), `
      import fs from 'node:fs/promises'
      globalThis.fetch = async (value) => {
        const url = new URL(value)
        await fs.appendFile(${JSON.stringify(path.join(root, 'requests.jsonl'))}, JSON.stringify(String(value)) + '\\n')
        if (!${networkAvailable}) throw new Error('Offline fixture')
        if (url.pathname.endsWith('/allBuilding.js')) return new Response('key: "0123456789abcdef0123456789abcdef"')
        if (url.pathname.endsWith('/getArchitectures')) {
          const query = url.searchParams.get('freetext')
          return Response.json({ data: [{ uri: 'https://example.test/building/' + encodeURIComponent(query), nameS: query, long: 121.45, lat: 31.22 }] })
        }
        if (url.pathname.endsWith('/getArchitectureDetail')) {
          const name = decodeURIComponent(new URL(url.searchParams.get('uri')).pathname.split('/').at(-1))
          return Response.json({ data: [{ nameS: name, address: 'Verified control address' }] })
        }
        throw new Error('Unexpected network URL: ' + value)
      }
    `)
    const run = () => execFileAsync(process.execPath, ['--import', path.join(root, 'mock-network.mjs'), path.join(root, 'scripts/enrich-landmark-current-uses.mjs')])
    await run()
    const heldIds = new Set([wikiIds[0], research.properties.featureGroupId, fresh.properties.featureGroupId,
      cached.properties.featureGroupId, park.properties.featureGroupId])
    for (const file of ['historical-features.geojson', 'curated-parks.geojson']) {
      const output = await readJson(root, `public/data/${file}`)
      for (const item of output.features.filter((entry) => heldIds.has(entry.properties.featureGroupId))) {
        assert.ok(!Object.keys(item.properties).some((key) => key.startsWith('currentUse') || ['currentNameZh', 'currentAddress'].includes(key)))
        assert.deepEqual(item.geometry, features.find((entry) => entry.properties.featureGroupId === item.properties.featureGroupId).geometry)
      }
    }
    const audit = await readJson(root, 'public/data/landmark-current-use-audit.json')
    assert.equal(audit.summary.needsReviewResearch, heldIds.size)
    for (const record of audit.records.filter((entry) => heldIds.has(entry.featureGroupId))) {
      assert.equal(record.status, 'needs-review-research')
      assert.equal(record.searchResultCount, 0)
      assert.deepEqual(record.queries, [])
      assert.ok(!('accepted' in record))
      assert.ok(record.reviewHold.reviewRef)
    }
    assert.equal(audit.records.find((record) => record.featureGroupId === 'library-control').status,
      networkAvailable ? 'matched' : 'matched-library-cache')
    assert.equal(audit.records.find((record) => record.featureGroupId === wikiIds[1]).status, 'matched-wikipedia')
    const requests = (await fs.readFile(path.join(root, 'requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse)
    const queries = requests.map((url) => new URL(url).searchParams.get('freetext')).filter(Boolean)
    assert.deepEqual(queries, networkAvailable ? ['已核控制大楼'] : [])
    // A second run must not resurrect a held old cache/override or lose its audit.
    await run()
    const rerun = await readJson(root, 'public/data/landmark-current-use-audit.json')
    assert.equal(rerun.summary.needsReviewResearch, heldIds.size)
    assert.ok(rerun.records.filter((record) => heldIds.has(record.featureGroupId)).every((record) => !record.accepted))
  })
}

test('apply script skips an entire held group even when a member says yes, while allowing a disjoint legacy split', async (t) => {
  const root = await makeWorkspace(t, 'apply-unresolved-research-overrides.mjs')
  await writeJson(root, 'public/data/historical-features.geojson', collection([
    feature('renamed-held', [1, 2], { legacyFeatureGroupIds: ['legacy-group'] }),
    feature('unrelated-split', [3], { legacyFeatureGroupIds: ['legacy-group'] }),
  ]))
  await writeJson(root, 'scripts/data/landmark-current-use-holds.json', [makeHold('legacy-group', [1, 2])])
  await writeJson(root, 'scripts/data/landmark-current-use-overrides.json', [])
  await writeJson(root, 'scripts/data/unresolved-landmarks-001-research.json', {
    records: [1, 2, 3].map((IDBAT) => ({ IDBAT, mapWriteRecommendation: IDBAT === 2 ? 'review' : 'yes' })),
  })
  await writeJson(root, 'research/unresolved-landmarks/001-results.json', {
    records: [1, 2, 3].map((IDBAT) => ({ IDBAT, NAME: `Name ${IDBAT}`, currentUse: 'Office', currentNameZh: 'Building',
      currentAddress: 'Address', relationship: 'same-building', notes: 'Verified',
      references: [{ title: 'Source', url: 'https://example.test/source' }],
    })),
  })
  const { stdout } = await execFileAsync(process.execPath, [path.join(root, 'scripts/apply-unresolved-research-overrides.mjs'), '001'])
  const overrides = await readJson(root, 'scripts/data/landmark-current-use-overrides.json')
  assert.deepEqual(overrides.map((record) => record.sourceRecordIds), [[3]])
  const skipped = JSON.parse(stdout.split('\n').find((line) => line.startsWith('Skipped: ')).slice('Skipped: '.length))
  assert.deepEqual(skipped.map((record) => record.IDBAT), [1, 2])
  assert.ok(skipped.every((record) => record.reason.startsWith('research hold: ') && record.reviewRef))
})

test('both writers fail closed without the persistent hold registry and leave data untouched', async (t) => {
  for (const script of ['enrich-landmark-current-uses.mjs', 'apply-unresolved-research-overrides.mjs']) {
    const root = await makeWorkspace(t, script)
    const original = collection([feature('site-with-old-modern-fields', [1])])
    await writeJson(root, 'public/data/historical-features.geojson', original)
    await writeJson(root, 'public/data/curated-parks.geojson', collection([]))
    await writeJson(root, 'public/data/sources.json', [])
    await writeJson(root, 'scripts/data/landmark-current-use-overrides.json', [])
    await writeJson(root, 'scripts/data/unresolved-landmarks-001-research.json', { records: [] })
    await writeJson(root, 'research/unresolved-landmarks/001-results.json', { records: [] })
    await assert.rejects(execFileAsync(process.execPath, [path.join(root, 'scripts', script), '001']),
      (error) => error.stderr.includes('ENOENT') && error.stderr.includes('landmark-current-use-holds.json'))
    assert.deepEqual(await readJson(root, 'public/data/historical-features.geojson'), original)
    assert.deepEqual(await readJson(root, 'scripts/data/landmark-current-use-overrides.json'), [])
  }
})
