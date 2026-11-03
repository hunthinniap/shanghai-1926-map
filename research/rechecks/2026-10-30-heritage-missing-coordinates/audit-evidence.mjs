// Independent checks against saved provider bytes, not the decision generator.
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {bd09ToWgs84,gcj02ToWgs84} from '../../../scripts/lib/coordinate-systems.mjs'
import {auditApprovedHeritageMap} from './map-integration/audit-map.mjs'
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../..'),cache=new Map()
const bytes=async p=>{const file=path.resolve(dir,p);if(!cache.has(file))cache.set(file,await fs.readFile(file));return cache.get(file)}
const read=async p=>JSON.parse(await bytes(p)),hash=b=>createHash('sha256').update(b).digest('hex')
const review=await read('coordinate-review.json'),targets=await read('targets.json'),manifest=await read('source-manifest.json')
const original=JSON.parse(await fs.readFile(path.join(root,'public/data/shanghai-excellent-historical-buildings/buildings.json'),'utf8'))
const integrated=await fs.access(path.join(root,'scripts/data/shanghai-heritage-coordinate-approvals.json')).then(()=>auditApprovedHeritageMap(root),()=>null)
const map=JSON.parse(await fs.readFile(integrated?path.join(dir,'map-integration/map-before.geojson'):path.join(root,'public/data/shanghai-excellent-historical-buildings/map-buildings.geojson'),'utf8'))
const idsOnMap=new Set(map.features.map(f=>f.properties.officialId)),missing=original.records.filter(r=>!idsOnMap.has(r.id)).map(r=>r.id)
if(map.features.length!==978||new Set(review.records.map(r=>r.officialId)).size!==80||review.records.length!==80)throw new Error('Coverage mismatch')
if([...missing].sort().join()!==review.records.map(r=>r.officialId).sort().join()||targets.records.map(r=>r.id).sort().join()!==missing.sort().join())throw new Error('Exact frozen gap not covered')
for(const item of manifest.files)if(hash(await bytes(item.file))!==item.sha256)throw new Error('Snapshot checksum mismatch '+item.file)
let count=0,osmChecks=0,conversionChecks=0,inferred=0
const near=(a,b)=>Math.abs(a-b)<=0.000003
for(const r of review.records){
 if(!r.reason||!r.queries?.length)throw new Error('Missing per-record finding/query '+r.code)
 if(['reference-point','partial-reference'].includes(r.status)!==Boolean(r.points.length))throw new Error('Status/point inconsistency '+r.code)
 for(const p of r.points){
  count++
  const sources=Array.isArray(p.sourceSnapshot)?p.sourceSnapshot:[p.sourceSnapshot]
  for(const source of sources)await bytes(source)
  if(p.sourceSnapshotSha256&&hash(await bytes(sources[0]))!==p.sourceSnapshotSha256)throw new Error('Selected point hash mismatch '+r.code)
  const osmId=/openstreetmap\.org\/(node|way)\/(\d+)/.exec(p.sourceUrl)
  if(osmId){
   const data=JSON.parse((await bytes(sources[0])).toString('utf8')),e=data.elements.find(e=>e.type===osmId[1]&&e.id===Number(osmId[2]))
   if(!e)throw new Error('Selected OSM feature absent '+r.code)
   let lon,lat
   if(e.type==='node'){lon=e.lon;lat=e.lat}else{
    const nodes=new Map(data.elements.filter(x=>x.type==='node').map(x=>[x.id,x])),pts=e.nodes.map(id=>nodes.get(id))
    if(pts.some(p=>!p))throw new Error('Incomplete OSM geometry '+r.code)
    lon=(Math.min(...pts.map(p=>p.lon))+Math.max(...pts.map(p=>p.lon)))/2
    lat=(Math.min(...pts.map(p=>p.lat))+Math.max(...pts.map(p=>p.lat)))/2
   }
   if(!near(lon,p.lon)||!near(lat,p.lat))throw new Error('Selected point differs from OSM bytes '+r.code)
   osmChecks++
  }
  const source=p.sourceCoordinates
  if(source?.coordinateSystem?.startsWith('GCJ-02')||source?.coordinateSystem==='BD-09'){
   const lon=source.lon??source.longitude,lat=source.lat??source.latitude
   const converted=source.coordinateSystem==='BD-09'?bd09ToWgs84(lon,lat):gcj02ToWgs84(lon,lat)
   if(!near(converted.longitude,p.lon)||!near(converted.latitude,p.lat))throw new Error('Coordinate conversion does not reproduce '+r.code)
   conversionChecks++
   if(source.coordinateSystem.includes('inferred')){
    if(p.publisherDeclarationAvailable!==false||p.sourceCoordinateSystemEvidence!=='empirical-control-comparison')throw new Error('Unlabelled inference '+r.code)
    await bytes(p.coordinateSystemAudit??'urban/coordinate-system-audit.json');inferred++
   }
   if(!sources.some(file=>cache.get(path.resolve(dir,file)).toString('utf8').includes(String(lon))&&cache.get(path.resolve(dir,file)).toString('utf8').includes(String(lat))))throw new Error('Original coordinate numbers missing from source snapshot '+r.code)
  }
 }
}
if(count!==review.coverage.documentedReferencePoints)throw new Error('Reference point total mismatch')
const output={reviewDate:'2026-10-31',exactTargetRecords:80,referencePoints:count,sourceSnapshotsHashed:manifest.files.length,osmGeometriesRecomputed:osmChecks,
 coordinateConversionsRecomputed:conversionChecks,explicitlyLabelledCoordinateSystemInferences:inferred,historicalResearchMapFeatures:map.features.length,
 checks:{exactMissingIdSet:true,sourceHashesMatch:true,selectedPointsPresentInSavedSources:true,osmGeometryCentresReproduced:true,coordinateConversionsReproduced:true,inferencesLabelled:true,original978MapFeaturesUnchanged:true},
 ...(integrated?{approvedIntegration:{mapRecords:integrated.mapRecords,addedRecords:integrated.addedRecords,remaining:integrated.remainingRecords}}:{})}
await fs.writeFile(path.join(dir,'evidence-verification.json'),JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify(output,null,2))
