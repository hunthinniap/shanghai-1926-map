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
