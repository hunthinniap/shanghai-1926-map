import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { planHeritageAddress } from '../../../scripts/lib/heritage-addresses.mjs'
import { matchHeritageLibrary, heritageAddressKey, addressesOverlap } from '../../../scripts/lib/heritage-library-matching.mjs'
import { bd09ToWgs84 } from '../../../scripts/lib/coordinate-systems.mjs'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '../../..')
const data = 'public/data/shanghai-excellent-historical-buildings'
const read = async p => JSON.parse(await fs.readFile(path.join(root,p),'utf8'))
const write = async (p,v) => fs.writeFile(path.join(dir,p),JSON.stringify(v,null,2)+'\n')
const digest = b => createHash('sha256').update(b).digest('hex')
const enriched = await read(`${data}/buildings-enriched.json`)
const map = await read(`${data}/map-buildings.geojson`)
const onMap = new Set(map.features.map(f=>f.properties.officialId))
const records = enriched.records.filter(r=>!onMap.has(r.id))
if(records.length!==80 || new Set(records.map(r=>r.id)).size!==80) throw new Error('Expected exactly 80 original missing records')
const targetFile = path.join(dir,'targets.json')
try { await fs.access(targetFile) } catch {
  const files = [`${data}/buildings.json`,`${data}/buildings-enriched.json`,`${data}/map-buildings.geojson`,
    `${data}/geocoding/results.json`,`${data}/geocoding/library/buildings.json`,
    'README.md','handoff.md','src/data/landmarkSiteSourceAdditions.ts']
  await write('baseline.json',{date:'2026-10-30',files:await Promise.all(files.map(async file=>({file,sha256:digest(await fs.readFile(path.join(root,file)))})))})
  await write('targets.json',{date:'2026-10-30',recordCount:80,selection:'1058 official records minus 978 map official IDs; frozen before this research',records})
}
const frozen = await read('research/rechecks/2026-10-30-heritage-missing-coordinates/targets.json')
if(frozen.records.map(r=>r.id).join()!==records.map(r=>r.id).join()) throw new Error('Frozen target set changed')
const library=await read(`${data}/geocoding/library/buildings.json`)
const coord=await read('scripts/data/shanghai-heritage-library-coordinate-review.json')
const local = records.map(r=>{
 const plan=planHeritageAddress(r,enriched.records.filter(o=>heritageAddressKey(o.official.addressAsListed)===heritageAddressKey(r.official.addressAsListed)).map(o=>o.id))
 const match=matchHeritageLibrary(r,plan,library.records,[],coord.reviews)
 const nameParts=[r.official.originalNameOrUse,r.official.listedNameOrUse,...r.articleReferences.map(a=>a.requestedTitle)].filter(Boolean)
 const nearby=library.records.filter(l=> !match.candidates.some(c=>c.libraryUri===l.uri) && (
   addressesOverlap(r.official.addressAsListed,l.address)|| addressesOverlap(r.wikipedia.addressAsListed,l.address)||
   nameParts.some(n=>n.length>=4 && (n.includes(l.nameS)||l.nameS.includes(n)))
 )).map(l=>({uri:l.uri,name:l.nameS,address:l.address,sourceCoordinates:l.coordinates,wgs84:bd09ToWgs84(l.coordinates.longitude,l.coordinates.latitude)}))
 return {officialId:r.id,code:r.codeRaw,name:r.official.originalNameOrUse,listedName:r.official.listedNameOrUse,address:r.address.value,priorStatus:r.locationStatus,priorGeocoding:r.geocoding??null,match,otherLibraryCandidates:nearby}
})
await write('local-address-review.json',{recordCount:80,librarySource:`${data}/geocoding/library/buildings.json`,records:local})
console.log(JSON.stringify({targets:80,previousWikipediaCandidates:local.filter(r=>!r.priorGeocoding).length,localMatchCounts:Object.fromEntries([...new Set(local.map(r=>r.match.status))].map(s=>[s,local.filter(r=>r.match.status===s).length]))},null,2))
for(const r of local) console.log([r.code,r.name.replaceAll('\n','/'),r.address.replaceAll('\n','/'),r.match.status,r.match.point?`${r.match.point.lon},${r.match.point.lat}`:'',r.match.candidates.map(c=>c.name+'@'+c.address).join('|'),r.otherLibraryCandidates.map(c=>c.name+'@'+c.address).slice(0,4).join('|')].join('\t'))
