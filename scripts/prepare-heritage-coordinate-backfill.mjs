// Freeze the user's explicitly authorized 50 source-reference + 16 partial items.
// Run once before generating the expanded production dataset; never updates an approval silently.
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const research='research/rechecks/2026-10-30-heritage-missing-coordinates'
const approvalFile=path.join(root,'scripts/data/shanghai-heritage-coordinate-approvals.json')
try{await fs.access(approvalFile);throw new Error('Approval already exists; do not overwrite its frozen inputs')}catch(e){if(e.code!=='ENOENT')throw e}
const hash=b=>createHash('sha256').update(b).digest('hex')
const reviewBytes=await fs.readFile(path.join(root,research,'coordinate-review.json'))
const manifestBytes=await fs.readFile(path.join(root,research,'source-manifest.json'))
const review=JSON.parse(reviewBytes),mapBytes=await fs.readFile(path.join(root,'public/data/shanghai-excellent-historical-buildings/map-buildings.geojson'))
const map=JSON.parse(mapBytes),officialBytes=await fs.readFile(path.join(root,'public/data/shanghai-excellent-historical-buildings/buildings.json'))
const official=JSON.parse(officialBytes)
const records=review.records.filter(r=>['reference-point','partial-reference'].includes(r.status))
if(map.features.length!==978||records.length!==66||records.filter(r=>r.status==='reference-point').length!==50||records.flatMap(r=>r.points).length!==76)throw new Error('Unexpected authorization scope or baseline')
const integration=path.join(root,research,'map-integration')
await fs.mkdir(integration,{recursive:true})
await fs.writeFile(path.join(integration,'map-before.geojson'),mapBytes)
const approval={schemaVersion:1,approvedOn:'2026-10-31',authorization:'用户明确批准：可以回填有来源 和 部分有定位。',
 researchReport:`${research}/coordinate-review.json`,researchReportSha256:hash(reviewBytes),
 sourceManifest:`${research}/source-manifest.json`,sourceManifestSha256:hash(manifestBytes),
 originalMapSnapshot:`${research}/map-integration/map-before.geojson`,originalMapSha256:hash(mapBytes),
 originalMapFeatureArraySha256:hash(JSON.stringify(map.features)),officialRecordsSha256:hash(officialBytes),
 expectedCounts:{existingMapRecords:978,approvedRecords:66,sourceReferenceRecords:50,partialReferenceRecords:16,referencePoints:76,totalMapRecords:1044,remainingRecords:14},
 records:records.map(r=>{
  const source=official.records.find(o=>o.id===r.officialId)
  if(!source||source.originalNameOrUse!==r.name||source.addressAsListed!==r.officialAddress||map.features.some(f=>f.properties.officialId===r.officialId))throw new Error('Changed/mapped target '+r.officialId)
  return {officialId:r.officialId,status:r.status,expectedOfficialName:r.name,expectedAddress:r.officialAddress,pointCount:r.points.length}
 })}
await fs.writeFile(approvalFile,JSON.stringify(approval,null,2)+'\n')
console.log(JSON.stringify(approval.expectedCounts,null,2))
