import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
const hash=b=>createHash('sha256').update(b).digest('hex')
const statuses=new Set(['reference-point','partial-reference'])
const scopes=new Set(['linked-building-reference-point','building-reference-point','building-complex-reference-point','address-reference-point'])

export function parseApprovedCoordinateReview(bytes,approval){
 if(approval.schemaVersion!==1||hash(bytes)!==approval.researchReportSha256)throw new Error('Approved coordinate research changed; re-review before backfill')
 return JSON.parse(bytes)
}

export async function loadApprovedCoordinateReview(root){
 const file='scripts/data/shanghai-heritage-coordinate-approvals.json'
 let approvalBytes;try{approvalBytes=await fs.readFile(path.join(root,file))}catch(e){if(e.code==='ENOENT')return null;throw e}
 const approval=JSON.parse(approvalBytes),reportBytes=await fs.readFile(path.join(root,approval.researchReport))
 const review=parseApprovedCoordinateReview(reportBytes,approval)
 const manifestBytes=await fs.readFile(path.join(root,approval.sourceManifest))
 if(hash(manifestBytes)!==approval.sourceManifestSha256)throw new Error('Approved coordinate source manifest changed')
 const officialBytes=await fs.readFile(path.join(root,'public/data/shanghai-excellent-historical-buildings/buildings.json'))
 if(hash(officialBytes)!==approval.officialRecordsSha256)throw new Error('Official list changed; re-review approved coordinate identities')
 const researchDir=path.dirname(path.join(root,approval.researchReport)),manifest=JSON.parse(manifestBytes)
 const manifestByFile=new Map(manifest.files.map(f=>[path.resolve(researchDir,f.file),f]))
 const verified=new Set()
 const accepted=new Set(approval.records.map(r=>r.officialId))
 for(const r of review.records.filter(r=>accepted.has(r.officialId))){
  for(const p of r.points){
   for(const snapshot of Array.isArray(p.sourceSnapshot)?p.sourceSnapshot:[p.sourceSnapshot]){
    const resolved=path.resolve(researchDir,snapshot)
    if(verified.has(resolved))continue
    const bytes=await fs.readFile(resolved),source=manifestByFile.get(resolved)
    const preservedLibrary=resolved===path.join(root,'public/data/shanghai-excellent-historical-buildings/geocoding/library/buildings.json')
    const expected=source?.sha256??(preservedLibrary?manifest.reusedInputs.find(f=>f.file.endsWith('/library/buildings.json'))?.sha256:null)
    if(!expected||hash(bytes)!==expected)throw new Error('Approved coordinate source snapshot changed: '+snapshot)
    verified.add(resolved)
   }
  }
 }
 return {approval,review,inputHashes:[{repositoryFile:file,byteLength:approvalBytes.length,sha256:hash(approvalBytes)},
  {repositoryFile:approval.researchReport,byteLength:reportBytes.length,sha256:hash(reportBytes)},
  {repositoryFile:approval.sourceManifest,byteLength:manifestBytes.length,sha256:hash(manifestBytes)}],verifiedSourceSnapshots:verified.size}
}

function sourceTitle(p){
 if(p.origin==='shanghai-library'||p.sourceUrl.includes('library.sh.cn'))return '上海图书馆历史建筑开放数据'
 if(p.origin==='openstreetmap'||p.sourceUrl.includes('openstreetmap.org'))return 'OpenStreetMap'
 if(p.origin==='amap'||p.sourceUrl.includes('amap.com'))return '高德地图'
 if(p.sourceUrl.includes('map.360.cn'))return '360地图'
 if(p.sourceUrl.includes('wikipedia.org'))return '维基百科'
 return p.sourceTitle??'独立门址资料'
}

/** One official record keeps one map marker; all 76 source positions stay in its card. */
export function applyApprovedHeritageCoordinates({records,mapFeatures,approval,review}){
 const selected=review.records.filter(r=>statuses.has(r.status))
 const guards=new Map(approval.records.map(r=>[r.officialId,r]))
 const approvedIds=new Set(approval.records.map(r=>r.officialId))
 const counts=approval.expectedCounts
 if(guards.size!==approval.records.length||selected.length!==counts.approvedRecords||guards.size!==selected.length||
  selected.some(r=>!approvedIds.has(r.officialId))||new Set(selected.map(r=>r.officialId)).size!==selected.length)throw new Error('Approved coordinate ID set changed')
 if(mapFeatures.length!==counts.existingMapRecords||hash(JSON.stringify(mapFeatures))!==approval.originalMapFeatureArraySha256)throw new Error('Existing map baseline changed; do not overwrite existing coordinates')
 const byId=new Map(records.map(r=>[r.id,r])),existing=new Set(mapFeatures.map(f=>f.properties.officialId))
 let partial=0,pointCount=0
 const additions=[]
 for(const item of selected){
  const record=byId.get(item.officialId),guard=guards.get(item.officialId)
  if(!record||existing.has(item.officialId)||record.official.originalNameOrUse!==guard.expectedOfficialName||record.official.addressAsListed!==guard.expectedAddress||
   item.name!==guard.expectedOfficialName||item.officialAddress!==guard.expectedAddress||item.status!==guard.status||item.points.length!==guard.pointCount||!item.points.length||!item.reason)throw new Error('Approved coordinate identity/scope changed: '+item.officialId)
  for(const p of item.points){
   if(p.coordinateSystem!=='WGS84'||!Number.isFinite(p.lon)||!Number.isFinite(p.lat)||p.lon<120.7||p.lon>122.3||p.lat<30.6||p.lat>32||!scopes.has(p.coordinateScope)||!/^https?:\/\//.test(p.sourceUrl))throw new Error('Invalid approved reference point: '+item.officialId)
  }
  partial+=Number(item.status==='partial-reference');pointCount+=item.points.length
  const coordinateReview={status:item.status,reason:item.reason,points:item.points.map(p=>({name:p.sourceName??record.official.originalNameOrUse,
   lon:p.lon,lat:p.lat,coordinateScope:p.coordinateScope,sourceUrl:p.sourceUrl,sourceTitle:sourceTitle(p),sourceAddress:p.sourceAddress??null,
   coordinateSystemInferred:p.publisherDeclarationAvailable===false}))}
  record.coordinateReview={...coordinateReview,approvedOn:approval.approvedOn,previousLocationStatus:record.locationStatus,
   researchReport:approval.researchReport,sourcePoints:item.points}
  record.locationStatus='has-reference-point'
  const p=item.points[0],generic=/^(住宅|民宅|民居|花园住宅|里弄住宅|公寓|办公楼|学校|医院|厂房|其他)$/u.test(record.official.originalNameOrUse.trim())
  const name=record.official.originalNameOrUse
  const locationNote=(item.status==='partial-reference'?'部分定位：':'')+item.reason
  additions.push({type:'Feature',id:`${record.id}-reviewed-coordinate`,geometry:{type:'Point',coordinates:[p.lon,p.lat]},properties:{
   officialId:record.id,wikipediaId:record.wikipedia.id,batch:record.batch,officialCodeRaw:record.codeRaw,name,
   articleTitle:generic?`${record.address.value} ${name}`:name,address:record.address.value,addressComparison:record.address.comparisonStatus,
   coordinateScope:p.coordinateScope,coordinateSystem:'WGS84',precisionDegrees:null,origin:p.origin??'reviewed-public-source',
   sourceUrl:p.sourceUrl,coordinateSourceTitle:sourceTitle(p),sourceAddress:p.sourceAddress??null,locationNote,coordinateReview,
   wikipediaUrl:record.articleReferences[0]?.url??record.wikipedia.source.url,wikidataId:null,historicalGeometryVerified:false,
   officialName:name,listedName:record.official.listedNameOrUse,wikipediaAddress:record.wikipedia.addressAsListed,
   district:record.official.districtAsListed,constructionDate:record.wikipedia.constructionDateText,
   floors:record.wikipedia.floorsText,structure:record.wikipedia.structureText,designer:record.wikipedia.designerText,
   officialSourceUrl:record.official.source.url,wikipediaListUrl:record.wikipedia.source.url,
  }})
 }
 if(partial!==counts.partialReferenceRecords||selected.length-partial!==counts.sourceReferenceRecords||pointCount!==counts.referencePoints)throw new Error('Approved coordinate coverage changed')
 return {mapFeatures:[...mapFeatures,...additions],coverage:{approvedRecords:selected.length,sourceReferenceRecords:selected.length-partial,partialReferenceRecords:partial,documentedSourcePoints:pointCount}}
}
