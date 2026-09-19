import assert from 'node:assert/strict'
import test from 'node:test'
import { utm51nToWgs84, wgs84ToUtm51n, wgs84ToGcj02, bd09ToGcj02, gcj02ToWgs84, bd09ToWgs84 } from './coordinate-systems.mjs'

test('converts the supplied UTM 51N example to central Shanghai WGS84 coordinates', () => {
  assert.deepEqual(utm51nToWgs84(351450.8, 3454972.8), {
    longitude: 121.440464,
    latitude: 31.219467,
  })
})

test('projects Shanghai WGS84 into metre-based UTM 51N for clustering', () => {
  const point = wgs84ToUtm51n(121.440464, 31.219467)
  assert.ok(Math.abs(point.x - 351450.8) < 0.06)
  assert.ok(Math.abs(point.y - 3454972.8) < 0.06)
  assert.deepEqual(utm51nToWgs84(point.x, point.y), {
    longitude: 121.440464, latitude: 31.219467,
  })
  assert.throws(() => wgs84ToUtm51n(Number.NaN, 31.2), /Invalid WGS84/u)
})

test('converts Shanghai WGS84 coordinates to GCJ-02 without mutating WGS84', () => {
  const wgs84 = { longitude: 121.440464, latitude: 31.219467 }
  assert.deepEqual(wgs84ToGcj02(wgs84.longitude, wgs84.latitude), {
    longitude: 121.445076,
    latitude: 31.217594,
  })
  assert.deepEqual(wgs84, { longitude: 121.440464, latitude: 31.219467 })
})

test('leaves coordinates outside China unchanged', () => {
  assert.deepEqual(wgs84ToGcj02(2.3522, 48.8566), {
    longitude: 2.3522,
    latitude: 48.8566,
  })
})

test('inverts the known Shanghai GCJ-02 fixture without leaving a map offset', () => {
  assert.deepEqual(gcj02ToWgs84(121.445076, 31.217594), { longitude: 121.440464, latitude: 31.219467 })
  assert.deepEqual(gcj02ToWgs84(2.3522, 48.8566), { longitude: 2.3522, latitude: 48.8566 })
})

test('removes both BD-09 offsets rather than treating Baidu coordinates as WGS84', () => {
  assert.deepEqual(bd09ToGcj02(116.404, 39.915), { longitude: 116.397627, latitude: 39.908657 })
  const bd = { longitude: 121.437584, latitude: 31.221172 }
  const wgs = bd09ToWgs84(bd.longitude, bd.latitude)
  const gcj = bd09ToGcj02(bd.longitude, bd.latitude)
  const forward = wgs84ToGcj02(wgs.longitude, wgs.latitude)
  assert.ok(Math.abs(forward.longitude - gcj.longitude) < 0.000002)
  assert.ok(Math.abs(forward.latitude - gcj.latitude) < 0.000002)
  assert.ok(Math.abs(wgs.longitude - bd.longitude) > 0.008)
  assert.throws(() => bd09ToWgs84(Number.NaN, 31.2), /Invalid/u)
})
