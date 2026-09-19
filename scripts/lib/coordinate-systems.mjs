import proj4 from 'proj4'

const pi = Math.PI
const a = 6_378_245
const ee = 0.006693421622965943

function outsideChina(longitude, latitude) {
  return longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271
}

function transformLatitude(longitude, latitude) {
  let result = -100 + 2 * longitude + 3 * latitude + 0.2 * latitude ** 2 +
    0.1 * longitude * latitude + 0.2 * Math.sqrt(Math.abs(longitude))
  result += (20 * Math.sin(6 * longitude * pi) + 20 * Math.sin(2 * longitude * pi)) * 2 / 3
  result += (20 * Math.sin(latitude * pi) + 40 * Math.sin(latitude / 3 * pi)) * 2 / 3
  result += (160 * Math.sin(latitude / 12 * pi) + 320 * Math.sin(latitude * pi / 30)) * 2 / 3
  return result
}

function transformLongitude(longitude, latitude) {
  let result = 300 + longitude + 2 * latitude + 0.1 * longitude ** 2 +
    0.1 * longitude * latitude + 0.1 * Math.sqrt(Math.abs(longitude))
  result += (20 * Math.sin(6 * longitude * pi) + 20 * Math.sin(2 * longitude * pi)) * 2 / 3
  result += (20 * Math.sin(longitude * pi) + 40 * Math.sin(longitude / 3 * pi)) * 2 / 3
  result += (150 * Math.sin(longitude / 12 * pi) + 300 * Math.sin(longitude / 30 * pi)) * 2 / 3
  return result
}

function rounded(value) {
  return Number(value.toFixed(6))
}

export function utm51nToWgs84(x, y) {
  const [longitude, latitude] = proj4('EPSG:32651', 'EPSG:4326', [x, y])
  return { longitude: rounded(longitude), latitude: rounded(latitude) }
}

export function wgs84ToUtm51n(longitude, latitude) {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) ||
    Math.abs(longitude) > 180 || Math.abs(latitude) > 90) {
    throw new Error('Invalid WGS84 coordinate')
  }
  const [x, y] = proj4('EPSG:4326', 'EPSG:32651', [longitude, latitude])
  return { x, y }
}

export function wgs84ToGcj02(longitude, latitude) {
  if (outsideChina(longitude, latitude)) {
    return { longitude: rounded(longitude), latitude: rounded(latitude) }
  }
  let latitudeDelta = transformLatitude(longitude - 105, latitude - 35)
  let longitudeDelta = transformLongitude(longitude - 105, latitude - 35)
  const radians = latitude / 180 * pi
  const magic = 1 - ee * Math.sin(radians) ** 2
  const rootMagic = Math.sqrt(magic)
  latitudeDelta = latitudeDelta * 180 / ((a * (1 - ee)) / (magic * rootMagic) * pi)
  longitudeDelta = longitudeDelta * 180 / (a / rootMagic * Math.cos(radians) * pi)
  return {
    longitude: rounded(longitude + longitudeDelta),
    latitude: rounded(latitude + latitudeDelta),
  }
}

// Shanghai Library's map converts its BD-09 coordinates with the same inverse
// before displaying them on AMap. Retain source coordinates alongside results:
// these numerical conversions do not certify the accuracy of a source point.
export function bd09ToGcj02(longitude, latitude) {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) throw new Error('Invalid BD-09 coordinate')
  const x = longitude - 0.0065
  const y = latitude - 0.006
  const frequency = pi * 3000 / 180
  const radius = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * frequency)
  const angle = Math.atan2(y, x) - 0.000003 * Math.cos(x * frequency)
  return { longitude: rounded(radius * Math.cos(angle)), latitude: rounded(radius * Math.sin(angle)) }
}

export function gcj02ToWgs84(longitude, latitude) {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) throw new Error('Invalid GCJ-02 coordinate')
  let result = { longitude, latitude }
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const forward = wgs84ToGcj02(result.longitude, result.latitude)
    const dx = forward.longitude - longitude, dy = forward.latitude - latitude
    result = { longitude: result.longitude - dx, latitude: result.latitude - dy }
    if (Math.max(Math.abs(dx), Math.abs(dy)) <= 0.000001) break
  }
  return { longitude: rounded(result.longitude), latitude: rounded(result.latitude) }
}

export function bd09ToWgs84(longitude, latitude) {
  const gcj = bd09ToGcj02(longitude, latitude)
  return gcj02ToWgs84(gcj.longitude, gcj.latitude)
}
