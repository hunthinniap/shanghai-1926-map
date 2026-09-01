import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildingNamesAreVariants,
  clusterBuildingRecords,
  normalizeBuildingAddress,
} from './cluster-buildings.mjs'

function building({ id, name, chinese = '', address = '', start = 0, end = 0, x, y, types = [] }) {
  const properties = {
    IDBAT: id,
    NAME: name,
    CHINESE: chinese,
    F_ADDRESS: address,
    START: start,
    END_: end,
    XC: x,
    YC: y,
  }
  types.forEach((type, index) => {
    properties[`TYP${String(index + 1).padStart(2, '0')}`] = type
  })
  return {
    type: 'Feature',
    properties,
    geometry: { type: 'Point', coordinates: [x, y] },
  }
}

describe('normalizeBuildingAddress', () => {
  it('normalizes punctuation, abbreviations, number prefixes, and number order', () => {
    const first = normalizeBuildingAddress('No. 597, Rte. de Zikawei')
    const second = normalizeBuildingAddress('597 ROUTE DE ZIKAWEI')
    assert.equal(first.normalized, 'ROUTE DE ZIKAWEI|597')
    assert.equal(first.normalized, second.normalized)
    assert.equal(first.hasStreetNumber, true)
  })

  it('does not invent a street number for an unnumbered address', () => {
    const address = normalizeBuildingAddress('Route Pottier Gardens')
    assert.equal(address.normalized, 'ROUTE POTTIER GARDENS')
    assert.equal(address.streetNumber, null)
  })
})

describe('buildingNamesAreVariants', () => {
  it('accepts punctuation and conservative spelling variants', () => {
    assert.equal(buildingNamesAreVariants("St. Joseph's Church", 'St Josephs Church'), true)
    assert.equal(buildingNamesAreVariants('Cemetery', 'Seminary'), false)
  })
})

describe('clusterBuildingRecords', () => {
  it('clusters Virtual Shanghai 323/324/493 as one site without choosing Temple', () => {
    const records = [
      building({
        id: 323,
        name: 'Muslim Cemetery',
        chinese: '清真公瑩',
        address: '597 ROUTE DE ZIKAWEI',
        x: 353199.7535,
        y: 3453538.4923,
        types: ['Site of memory', 'Cemetery'],
      }),
      building({
        id: 324,
        name: 'Temple',
        chinese: '寺廟',
        address: '597 ROUTE DE ZIKAWEI',
        start: 1892,
        x: 353144.5723,
        y: 3453481.4239,
        types: ['Religious facility', 'Temple'],
      }),
      building({
        id: 493,
        name: 'Muslim Cemetery',
        chinese: '清真公塋',
        address: '597 ROUTE DE ZIKAWEI',
        x: 353277.9571,
        y: 3453563.5672,
        types: ['Site of memory', 'Cemetery', 'French municipal council'],
      }),
    ]
    const result = clusterBuildingRecords(records)

    assert.equal(result.clusters.length, 1)
    assert.equal(result.sourceRecords.length, 3)
    const cluster = result.clusters[0]
    assert.deepEqual(cluster.sourceRecordIds, [323, 324, 493])
    assert.equal(cluster.historicalName, 'Muslim Cemetery')
    assert.notEqual(cluster.primaryRecordId, 324)
    assert.equal(result.recordToCluster['323'], result.recordToCluster['324'])
    assert.equal(result.recordToCluster['324'], result.recordToCluster['493'])

    const cemetery = cluster.historicalRecords.find((record) => record.historicalName === 'Muslim Cemetery')
    assert.deepEqual(cemetery.sourceRecordIds, [323, 493])
    assert.deepEqual(new Set(cemetery.historicalNameZhVariants), new Set(['清真公瑩', '清真公塋']))
    const temple = cluster.historicalRecords.find((record) => record.historicalName === 'Temple')
    assert.equal(temple.startYear, 1892)
    assert.deepEqual(temple.sourceRecordIds, [324])
    assert.equal(temple.isGeneric, true)
    assert.equal(cluster.mergeReasons.length, 3)
    assert.ok(cluster.mergeReasons.every((reason) => reason.code === 'same-numbered-address-within-radius'))
  })

  it('uses 30 m for unnumbered addresses and avoids transitive radius chains', () => {
    const result = clusterBuildingRecords([
      building({ id: 1, name: 'Alpha Hall', address: 'Bubbling Well Road', x: 350000, y: 3450000 }),
      building({ id: 2, name: 'Beta Hall', address: 'Bubbling Well Road', x: 350029, y: 3450000 }),
      building({ id: 3, name: 'Gamma Hall', address: 'Bubbling Well Road', x: 350058, y: 3450000 }),
    ])
    assert.equal(result.clusters.length, 2)
    assert.equal(result.recordToCluster['1'], result.recordToCluster['2'])
    assert.notEqual(result.recordToCluster['1'], result.recordToCluster['3'])
  })

  it('merges an exact semantic variant within 8 m even when address text differs', () => {
    const result = clusterBuildingRecords([
      building({ id: 10, name: "St. Joseph's Church", address: '61 Museum Road', x: 100, y: 100 }),
      building({ id: 11, name: 'St Josephs Church', address: 'Museum Road', x: 107.9, y: 100 }),
      building({ id: 12, name: 'St Josephs Church', address: 'Elsewhere', x: 116.1, y: 100 }),
    ])
    assert.equal(result.clusters.length, 2)
    assert.equal(result.recordToCluster['10'], result.recordToCluster['11'])
    assert.notEqual(result.recordToCluster['10'], result.recordToCluster['12'])
    assert.equal(result.clusters.find((cluster) => cluster.sourceRecordIds.includes(10)).historicalRecords.length, 1)
  })

  it('keeps important aliases side by side and downweights generic labels', () => {
    const input = [
      building({ id: 20, name: 'School', chinese: '學校', address: '10 Love Lane', start: 1901, x: 500, y: 500 }),
      building({ id: 21, name: 'Sino-French Technical Institute', chinese: '中法工學院', address: '10 Love Lane', start: 1912, x: 520, y: 500 }),
      building({ id: 22, name: 'Aurora College', chinese: '震旦學院', address: '10 Love Lane', start: 1910, x: 510, y: 500 }),
    ]
    const snapshot = structuredClone(input)
    const result = clusterBuildingRecords(input)
    const cluster = result.clusters[0]

    assert.equal(cluster.historicalName, 'Sino-French Technical Institute')
    assert.deepEqual(cluster.historicalRecords.map((record) => record.historicalName), [
      'Sino-French Technical Institute',
      'Aurora College',
      'School',
    ])
    assert.deepEqual(input, snapshot, 'the clustering function must not mutate live records')
  })

  it('keeps records separate when coordinates are missing or no conservative rule matches', () => {
    const noCoordinates = { IDBAT: 30, NAME: 'Temple', F_ADDRESS: '8 Temple Street' }
    const result = clusterBuildingRecords([
      noCoordinates,
      { IDBAT: 31, NAME: 'Temple', F_ADDRESS: '8 Temple Street' },
      building({ id: 32, name: 'Temple', address: '9 Temple Street', x: 0, y: 0 }),
      building({ id: 33, name: 'Temple', address: '10 Temple Street', x: 8.1, y: 0 }),
    ])
    assert.equal(result.clusters.length, 4)
  })

  it('honours a curated separation for distinct facilities sharing one campus address', () => {
    const records = [
      building({
        id: 241,
        name: "Aurora University Chapel (Saint Peter's Church)",
        address: '280 AVENUE DUBAIL',
        x: 353793.0008,
        y: 3454461.0945,
      }),
      building({
        id: 242,
        name: 'Aurora University - Sports Field',
        address: '280 AVENUE DUBAIL',
        x: 353804.0254,
        y: 3454404.396,
      }),
      building({
        id: 999,
        name: 'Aurora University Laboratory',
        address: '280 AVENUE DUBAIL',
        x: 353798,
        y: 3454432,
      }),
    ]

    assert.equal(clusterBuildingRecords(records).clusters.length, 1)
    const separated = clusterBuildingRecords(records, { separateSourceRecordPairs: [[241, 242]] })
    assert.equal(separated.clusters.length, 2)
    assert.notEqual(separated.recordToCluster['241'], separated.recordToCluster['242'])
    assert.equal(separated.mergeReasons.some((reason) =>
      new Set([reason.leftRecordId, reason.rightRecordId]).has(241) &&
      new Set([reason.leftRecordId, reason.rightRecordId]).has(242)), false)
  })
})
