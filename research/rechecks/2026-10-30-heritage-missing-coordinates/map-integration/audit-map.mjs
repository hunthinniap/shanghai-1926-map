import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {loadApprovedCoordinateReview} from '../../../../scripts/lib/reviewed-heritage-coordinates.mjs'
const hash=b=>createHash('sha256').update(b).digest('hex')
const assert=(value,message)=>{if(!value)throw new Error(message)}
export async function auditApprovedHeritageMap(root){
 const input=await loadApprovedCoordinateReview(root);assert(input,'Missing coordinate approval')
 const {approval,review}=input,c=approval.expectedCounts
 const oldBytes=await fs.readFile(path.join(root,approval.originalMapSnapshot))
 assert(hash(oldBytes)===approval.originalMapSha256,'Original map snapshot drift')
 const original=JSON.parse(oldBytes),map=JSON.parse(await fs.readFile(path.join(root,'public/data/shanghai-excellent-historical-buildings/map-buildings.geojson'),'utf8'))
 const enriched=JSON.parse(await fs.readFile(path.join(root,'public/data/shanghai-excellent-historical-buildings/buildings-enriched.json'),'utf8'))
 assert(original.features.length===c.existingMapRecords&&isDeepStrictEqual(map.features.slice(0,c.existingMapRecords),original.features),'Original 978 features changed')
 assert(map.features.length===c.totalMapRecords&&new Set(map.features.map(f=>f.properties.officialId)).size===c.totalMapRecords,'Map count or uniqueness mismatch')
 const added=map.features.slice(c.existingMapRecords),ids=new Set(approval.records.map(r=>r.officialId))
 assert(added.length===ids.size&&added.every(f=>ids.has(f.properties.officialId)),'Unapproved map additions')
 let points=0,partial=0
 for(const feature of added){
  const r=review.records.find(r=>r.officialId===feature.properties.officialId),q=feature.properties.coordinateReview
  const record=enriched.records.find(e=>e.id===r.officialId)
  assert(isDeepStrictEqual(feature.geometry.coordinates,[r.points[0].lon,r.points[0].lat]),'Primary marker mismatch '+r.code)
  assert(q.status===r.status&&q.reason===r.reason&&q.points.length===r.points.length,'Coordinate review mismatch '+r.code)
  for(let i=0;i<r.points.length;i++){
   const p=r.points[i],actual=q.points[i]
   assert(actual.lon===p.lon&&actual.lat===p.lat&&actual.sourceUrl===p.sourceUrl&&actual.coordinateScope===p.coordinateScope,'Dropped or changed component '+r.code)
  }
  assert(record.locationStatus==='has-reference-point'&&isDeepStrictEqual(record.coordinateReview.sourcePoints,r.points),'Enriched provenance mismatch '+r.code)
  points+=q.points.length;partial+=Number(q.status==='partial-reference')
 }
 assert(points===c.referencePoints&&partial===c.partialReferenceRecords,'Component accounting mismatch')
 const pending=review.records.filter(r=>!ids.has(r.officialId))
 assert(pending.length===c.remainingRecords&&pending.every(r=>!map.features.some(f=>f.properties.officialId===r.officialId)),'Pending candidate was imported')
 return {schemaVersion:1,approvedOn:approval.approvedOn,officialRecords:enriched.records.length,previousMapRecords:c.existingMapRecords,
  addedRecords:added.length,sourceReferenceRecords:added.length-partial,partialReferenceRecords:partial,documentedSourcePositions:points,
  mapRecords:map.features.length,remainingRecords:pending.length,remainingCandidateRecords:pending.filter(r=>r.status==='needs-review').length,
  remainingWithoutCoordinate:pending.filter(r=>r.status==='no-coordinate').length,verifiedSelectedSourceSnapshots:input.verifiedSourceSnapshots,
  researchReportSha256:approval.researchReportSha256,sourceManifestSha256:approval.sourceManifestSha256,
  checks:{officialCatalogHashUnchanged:true,original978FeaturesUnchanged:true,approved66IdsOnly:true,all76SourcePositionsPreserved:true,
   partial16RestrictionsPreserved:true,remaining14NotImported:true,uniqueOfficialIds:true},remaining:pending.map(r=>({officialId:r.officialId,code:r.code,address:r.officialAddress,status:r.status}))}
}
