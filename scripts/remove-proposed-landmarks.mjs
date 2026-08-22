import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const historicalPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const curatedParksPath = path.join(projectRoot, 'public', 'data', 'curated-parks.geojson')
const sourcesPath = path.join(projectRoot, 'public', 'data', 'sources.json')

const [historical, curatedParks, sources] = await Promise.all([
  fs.readFile(historicalPath, 'utf8').then(JSON.parse),
  fs.readFile(curatedParksPath, 'utf8').then(JSON.parse),
  fs.readFile(sourcesPath, 'utf8').then(JSON.parse),
])

const isProposedLandmark = (feature) =>
  feature.properties?.kind === 'landmark' &&
  feature.properties?.namingBasis?.startsWith('proposed-')

const removed = curatedParks.features.filter(isProposedLandmark)
const retainedParks = curatedParks.features.filter((feature) => !isProposedLandmark(feature))
const removedSourceIds = new Set(removed.flatMap((feature) => feature.properties?.sourceIds ?? []))
const usedSourceIds = new Set(
  [...historical.features, ...retainedParks].flatMap((feature) => feature.properties?.sourceIds ?? []),
)
const retainedSources = sources.filter(
  (source) => !removedSourceIds.has(source.id) || usedSourceIds.has(source.id),
)

await Promise.all([
  fs.writeFile(
    curatedParksPath,
    `${JSON.stringify({ ...curatedParks, features: retainedParks }, null, 2)}\n`,
    'utf8',
  ),
  fs.writeFile(sourcesPath, `${JSON.stringify(retainedSources, null, 2)}\n`, 'utf8'),
])

console.log(
  `Removed ${new Set(removed.map((feature) => feature.properties.featureGroupId)).size} proposed landmark groups ` +
    `(${removed.length} points) and ${sources.length - retainedSources.length} unused source records.`,
)
