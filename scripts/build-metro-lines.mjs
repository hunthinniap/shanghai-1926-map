import { writeFile } from 'node:fs/promises'

const bounds = [31.11, 121.34, 31.35, 121.61]
const routes = [
  { line: '1', relationId: 199200, colour: '#E4002B' },
  { line: '2', relationId: 5611325, colour: '#97D700' },
  { line: '3', relationId: 196738, colour: '#FFD100' },
  { line: '4', relationId: 196854, colour: '#5F259F' },
  { line: '5', relationId: 9170632, colour: '#A05EB5' },
  { line: '6', relationId: 6840915, colour: '#D71671' },
  { line: '7', relationId: 6819599, colour: '#FF6900' },
  { line: '8', relationId: 196737, colour: '#009FDF' },
  { line: '9', relationId: 214629, colour: '#71C5E8' },
  { line: '10', relationId: 7452118, colour: '#C1A7E2' },
  { line: '11', relationId: 5611109, colour: '#76232F' },
  { line: '12', relationId: 5498699, colour: '#007B5F' },
  { line: '13', relationId: 214631, colour: '#EF95CF' },
  { line: '14', relationId: 10557250, colour: '#827A04' },
  { line: '15', relationId: 12231216, colour: '#BBA786' },
  { line: '16', relationId: 6803856, colour: '#00A99D' },
  { line: '18', relationId: 10095918, colour: '#D6A461', routeMaster: true },
]

const endpoints = [
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

async function fetchRoute(route) {
  const relationQuery = route.routeMaster
    ? `rel(${route.relationId});rel(r);way(r)(${bounds.join(',')});out geom;`
    : `rel(${route.relationId});way(r)(${bounds.join(',')});out geom;`
  const query = `[out:json][timeout:90];${relationQuery}`

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const endpoint = endpoints[attempt % endpoints.length]
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        headers: {
          accept: 'application/json',
          'user-agent': 'Shanghai1928HistoricalMap/1.0 (local static map build)',
        },
        signal: AbortSignal.timeout(70_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      return data.elements.filter((element) => element.type === 'way' && element.geometry?.length > 1)
    } catch (error) {
      console.warn(`Line ${route.line}: attempt ${attempt + 1} failed (${error.message})`)
    }
  }
  throw new Error(`Unable to fetch Line ${route.line}`)
}

const features = []
for (const route of routes) {
  const ways = await fetchRoute(route)
  const seen = new Set()
  for (const way of ways) {
    if (seen.has(way.id)) continue
    seen.add(way.id)
    features.push({
      type: 'Feature',
      id: `${route.line}-${way.id}`,
      properties: {
        line: route.line,
        colour: route.colour,
        osmRelationId: route.relationId,
        osmWayId: way.id,
      },
      geometry: {
        type: 'LineString',
        coordinates: way.geometry.map(({ lon, lat }) => [lon, lat]),
      },
    })
  }
  console.log(`Line ${route.line}: ${seen.size} ways`)
}

await writeFile(
  new URL('../public/data/metro-lines.geojson', import.meta.url),
  `${JSON.stringify({ type: 'FeatureCollection', features })}\n`,
)
console.log(`Wrote ${features.length} coloured metro segments.`)

async function fetchStations() {
  const query = `[out:json][timeout:90];(
    nwr[railway=station][station=subway](${bounds.join(',')});
    nwr[railway=station][subway=yes](${bounds.join(',')});
  );out center tags;`
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const endpoint = endpoints[attempt % endpoints.length]
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        headers: {
          accept: 'application/json',
          'user-agent': 'Shanghai1928HistoricalMap/1.0 (local static map build)',
        },
        signal: AbortSignal.timeout(70_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return (await response.json()).elements
    } catch (error) {
      console.warn(`Stations: attempt ${attempt + 1} failed (${error.message})`)
    }
  }
  throw new Error('Unable to fetch metro stations')
}

const stationFeatures = []
const stationNames = new Set()
for (const element of await fetchStations()) {
  const name = element.tags?.['name:zh'] ?? element.tags?.name
  const longitude = element.lon ?? element.center?.lon
  const latitude = element.lat ?? element.center?.lat
  if (!name || !Number.isFinite(longitude) || !Number.isFinite(latitude) || stationNames.has(name)) continue
  stationNames.add(name)
  stationFeatures.push({
    type: 'Feature',
    id: `osm-station-${element.id}`,
    properties: {
      name,
      name_zh: name,
      'name:nonlatin': name,
      name_en: element.tags?.['name:en'] ?? '',
      class: 'railway',
      subclass: 'subway',
      osmType: element.type,
      osmId: element.id,
    },
    geometry: { type: 'Point', coordinates: [longitude, latitude] },
  })
}

await writeFile(
  new URL('../public/data/metro-stations.geojson', import.meta.url),
  `${JSON.stringify({ type: 'FeatureCollection', features: stationFeatures })}\n`,
)
console.log(`Wrote ${stationFeatures.length} local metro stations.`)
