import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const jurisdictionsPath = path.join(projectRoot, 'public', 'data', 'jurisdictions.geojson')
const historicalFeaturesPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const curatedParksPath = path.join(projectRoot, 'public', 'data', 'curated-parks.geojson')

// The 1928 Old City boundary follows Boulevard des Deux Républiques / Min Kuo
// Road (now Renmin Road) in the north and Chunghwa Road in the south. Coordinates use the present road
// centre-lines, simplified to about three metres from OpenStreetMap geometry.
const oldCityRing = [
  [121.4783287, 31.2272165],
  [121.4783887, 31.2275174],
  [121.4792767, 31.2290198],
  [121.4797232, 31.2293782],
  [121.4799313, 31.2294782],
  [121.4802532, 31.2297695],
  [121.4806368, 31.2299782],
  [121.4829919, 31.2308533],
  [121.483547, 31.2310081],
  [121.4847231, 31.2312398],
  [121.4859993, 31.2313567],
  [121.4862999, 31.2314635],
  [121.4895573, 31.231378],
  [121.4900246, 31.2312346],
  [121.4904632, 31.2310384],
  [121.4906857, 31.2307486],
  [121.4909323, 31.2302228],
  [121.4911394, 31.2300013],
  [121.4916822, 31.229644],
  [121.4919354, 31.2294232],
  [121.4921377, 31.2291713],
  [121.4928173, 31.2273078],
  [121.4939017, 31.2254069],
  [121.4945277, 31.2238864],
  [121.4946541, 31.2232703],
  [121.494598, 31.2226648],
  [121.4942624, 31.2218216],
  [121.4941553, 31.2214599],
  [121.4940831, 31.2208479],
  [121.4941164, 31.2199748],
  [121.4940738, 31.2190361],
  [121.4936319, 31.2175234],
  [121.4934602, 31.2172356],
  [121.4933074, 31.2171197],
  [121.492559, 31.2169374],
  [121.4914499, 31.2169121],
  [121.4893082, 31.2171794],
  [121.4887157, 31.2171671],
  [121.4872798, 31.2168843],
  [121.4857764, 31.216458],
  [121.4853291, 31.2163788],
  [121.4850917, 31.2164224],
  [121.4846069, 31.2166254],
  [121.4839135, 31.2170953],
  [121.4820155, 31.2185849],
  [121.4818004, 31.2188996],
  [121.4811682, 31.2200036],
  [121.4802479, 31.2214295],
  [121.4798169, 31.2221963],
  [121.4794679, 31.2229641],
  [121.4791452, 31.2238095],
  [121.4785286, 31.2257853],
  [121.4783287, 31.2272165],
]

const oldCityBoundary = {
  type: 'Feature',
  properties: {
    id: 'old-city-1928',
    jurisdiction: 'old-city',
    historicalName: 'Old City',
    northernBoundary: 'Boulevard des Deux Républiques / Min Kuo Road',
    southernBoundary: 'Chunghwa Road',
    sourceId: 'sh-civil-affairs-renmin-road',
    geometrySource: 'OpenStreetMap contributors',
  },
  geometry: { type: 'Polygon', coordinates: [oldCityRing] },
}

function everyCoordinate(geometry) {
  const coordinates = []
  const visit = (value) => {
    if (!Array.isArray(value)) return
    if (typeof value[0] === 'number' && typeof value[1] === 'number') coordinates.push(value)
    else value.forEach(visit)
  }
  visit(geometry?.coordinates)
  return coordinates
}

function representativePoint(geometry) {
  const coordinates = everyCoordinate(geometry)
  if (!coordinates.length) return undefined
  const sum = coordinates.reduce(
    ([longitude, latitude], coordinate) => [longitude + coordinate[0], latitude + coordinate[1]],
    [0, 0],
  )
  return [sum[0] / coordinates.length, sum[1] / coordinates.length]
}

function pointInRing([longitude, latitude], ring) {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [currentLongitude, currentLatitude] = ring[index]
    const [previousLongitude, previousLatitude] = ring[previous]
    const crosses =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude
    if (crosses) inside = !inside
  }
  return inside
}

function classifyOldCityFeatures(collection) {
  let count = 0
  collection.features.forEach((feature) => {
    if (feature.properties?.curatedOldCity) {
      feature.properties.jurisdiction = 'old-city'
      count += 1
      return
    }
    const point = representativePoint(feature.geometry)
    if (!point) return
    if (pointInRing(point, oldCityRing)) {
      feature.properties.jurisdiction = 'old-city'
      count += 1
    } else if (feature.properties.jurisdiction === 'old-city') {
      feature.properties.jurisdiction = 'chinese-administered'
    }
  })
  return count
}

const [jurisdictions, historicalFeatures, curatedParks] = await Promise.all([
  fs.readFile(jurisdictionsPath, 'utf8').then(JSON.parse),
  fs.readFile(historicalFeaturesPath, 'utf8').then(JSON.parse),
  fs.readFile(curatedParksPath, 'utf8').then(JSON.parse),
])

jurisdictions.features = [
  ...jurisdictions.features.filter((feature) => feature.properties?.id !== 'old-city-1928'),
  oldCityBoundary,
]
const historicalCount = classifyOldCityFeatures(historicalFeatures)
const parkCount = classifyOldCityFeatures(curatedParks)

await Promise.all([
  fs.writeFile(jurisdictionsPath, `${JSON.stringify(jurisdictions)}\n`, 'utf8'),
  fs.writeFile(historicalFeaturesPath, `${JSON.stringify(historicalFeatures)}\n`, 'utf8'),
  fs.writeFile(curatedParksPath, `${JSON.stringify(curatedParks, null, 2)}\n`, 'utf8'),
])

console.log(
  `Added the Min Kuo Road–Chunghwa Road Old City boundary and classified ` +
    `${historicalCount} historical features plus ${parkCount} current-park records inside it.`,
)
