import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const recordsPath = path.join(projectRoot, 'scripts/data/virtual-shanghai-buildings-live.json')
const featuresPath = path.join(projectRoot, 'public/data/historical-features.geojson')

const records = JSON.parse(await fs.readFile(recordsPath, 'utf8')).records
const collection = JSON.parse(await fs.readFile(featuresPath, 'utf8'))
const addressesById = new Map()

for (const record of records) {
  if (!Number.isInteger(record.id) || addressesById.has(record.id)) {
    throw new Error(`Invalid or duplicate Virtual Shanghai record ID: ${record.id}`)
  }
  addressesById.set(record.id, String(record.address ?? '').trim())
}

let updated = 0
for (const feature of collection.features) {
  const properties = feature.properties
  if (properties?.kind !== 'landmark' || !properties.sourceIds?.includes('vs-buildings')) continue
  const recordIds = properties.sourceRecordIds ?? []
  const missingIds = recordIds.filter((id) => !addressesById.has(id))
  if (missingIds.length) {
    throw new Error(`${properties.id} has unknown Virtual Shanghai record IDs: ${missingIds.join(', ')}`)
  }
  const addresses = recordIds
    .map((sourceRecordId) => ({ sourceRecordId, address: addressesById.get(sourceRecordId) }))
    .filter(({ address }) => address && /[\p{L}\p{N}]/u.test(address))
  if (addresses.length) properties.historicalAddresses = addresses
  else delete properties.historicalAddresses
  updated += 1
}

await fs.writeFile(featuresPath, `${JSON.stringify(collection)}\n`)
console.log(`Attached original addresses to ${updated} Virtual Shanghai landmark cards.`)
