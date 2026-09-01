import assert from 'node:assert/strict'
import test from 'node:test'
import { utm51nToWgs84, wgs84ToGcj02 } from './coordinate-systems.mjs'

test('converts the supplied UTM 51N example to central Shanghai WGS84 coordinates', () => {
  assert.deepEqual(utm51nToWgs84(351450.8, 3454972.8), {
    longitude: 121.440464,
    latitude: 31.219467,
  })
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
