import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { bd09ToWgs84, gcj02ToWgs84 } from '../../../scripts/lib/coordinate-systems.mjs'
import { libraryReferences, osmReferences, amapReferences, partialReferences, additionalNotes } from './decisions.mjs'
import {auditApprovedHeritageMap} from './map-integration/audit-map.mjs'

const dir=path.dirname(fileURLToPath(import.meta.url)), root=path.resolve(dir,'../../..')
const check=process.argv.includes('--check')
const read=async p=>JSON.parse(await fs.readFile(path.join(dir,p),'utf8'))
const digest=b=>createHash('sha256').update(b).digest('hex')
// The approved research is immutable; later production integration is checked separately.
if(await fs.access(path.join(root,'scripts/data/shanghai-heritage-coordinate-approvals.json')).then(()=>true,()=>false)){
 if(!check)throw new Error('Research is approved and frozen. Save further findings in a new dated recheck; do not rewrite approved source hashes.')
 const integrated=await auditApprovedHeritageMap(root),baseline=await read('baseline.json')
 for(const input of baseline.files.filter(f=>f.file.startsWith('public/data/')&&!f.file.endsWith('/buildings-enriched.json')&&!f.file.endsWith('/map-buildings.geojson'))){
  if(digest(await fs.readFile(path.join(root,input.file)))!==input.sha256)throw new Error('Frozen input changed: '+input.file)
 }
 console.log(JSON.stringify({approvedResearchFrozen:true,checked:true,mapRecords:integrated.mapRecords,approvedRecords:integrated.addedRecords,remaining:integrated.remainingRecords},null,2))
 process.exit(0)
}
const frozen=await read('targets.json'), local=await read('local-address-review.json'), osm=await read('osm-features.json')
const oldResults=JSON.parse(await fs.readFile(path.join(root,'public/data/shanghai-excellent-historical-buildings/geocoding/results.json'),'utf8'))
const library=JSON.parse(await fs.readFile(path.join(root,'public/data/shanghai-excellent-historical-buildings/geocoding/library/buildings.json'),'utf8'))
const sourceFiles=(await fs.readdir(path.join(dir,'sources'))).sort()
const webSources=await Promise.all(sourceFiles.filter(f=>f.endsWith('.txt')).map(async file=>({file:'sources/'+file,text:await fs.readFile(path.join(dir,'sources',file),'utf8')})))
const queries=new Map()
for(const source of webSources){
 if(!source.file.includes('web-targets-'))continue
 const line=source.text.split('\n')[0]
 if(!line.startsWith('Queries: '))throw new Error('Missing frozen query metadata: '+source.file)
 for(const q of JSON.parse(line.slice(9))){if(queries.has(q.id))throw new Error('Duplicate initial query '+q.id);queries.set(q.id,{query:q.q,evidence:source.file})}
}
if(frozen.records.length!==80||queries.size!==80)throw new Error('Expected 80 records and 80 per-record initial queries')
const baseline=await read('baseline.json')
const baselineObservations=[]
for(const f of baseline.files){
 const currentSha256=digest(await fs.readFile(path.join(root,f.file)))
 if(currentSha256===f.sha256)continue
 if(f.file.startsWith('public/data/'))throw new Error('Protected data input changed during research: '+f.file)
 baselineObservations.push({file:f.file,originalSha256:f.sha256,currentSha256,note:'研究期间其他工作修改；本轮未写此文件，不覆盖或还原。'})
}
const findOsm=id=>{const f=osm.records.find(f=>f.type+'/'+f.id===id);if(!f)throw new Error('Missing chosen OSM geometry '+id);return f}
const asOsmPoint=(f,scope)=>({lon:f.point.lon,lat:f.point.lat,coordinateSystem:'WGS84',
 coordinateScope:scope??(f.type==='node'?'building-reference-point':f.tags.building?'building-reference-point':'building-complex-reference-point'),
 origin:'openstreetmap',sourceUrl:f.sourceUrl,sourceSnapshot:f.sourceFile,sourceVersion:f.version,sourceTimestamp:f.timestamp,
 sourceName:f.name,sourceAddress:f.address||null,derivation:f.type==='node'?'OSM原始点':'完整OSM轮廓包围框中心（范围参考，非测绘楼心）',
 measuredAccuracyMetres:null,historicalGeometryVerified:false})
const sourceForUrl=url=>webSources.filter(s=>s.text.includes(url)).map(s=>s.file)
function libraryPoint(l){
 if(l.code==='3A022'){
  const source=library.records.find(r=>r.nameS==='龙门村'&&r.address.includes('133'))
  if(!source)throw new Error('Missing reviewed Longmen Village library entity')
  const p=bd09ToWgs84(source.coordinates.longitude,source.coordinates.latitude)
  return {lon:p.longitude,lat:p.latitude,coordinateSystem:'WGS84',coordinateScope:'building-complex-reference-point',origin:'shanghai-library',sourceUrl:source.uri,
   sourceName:source.nameS,sourceAddress:source.address,sourceCoordinates:source.coordinates,sourceSnapshot:'../../../public/data/shanghai-excellent-historical-buildings/geocoding/library/buildings.json',measuredAccuracyMetres:null,historicalGeometryVerified:false}
 }
 if(!l.match.point)throw new Error('No documented library selection for '+l.code)
 return {...l.match.point,sourceName:l.match.point.libraryName??l.name,sourceSnapshot:'../../../public/data/shanghai-excellent-historical-buildings/geocoding/library/buildings.json',measuredAccuracyMetres:null}
}
const allIds=new Set(frozen.records.map(r=>r.id))
const usedCodes=new Set()
const records=frozen.records.map(target=>{
 const l=local.records.find(r=>r.officialId===target.id), previous=oldResults.records.find(r=>r.officialId===target.id)
 const code=target.code, oldWiki=target.articleReferences.flatMap(ref=>(ref.location.candidates??[]).map(c=>({
   lon:c.lon,lat:c.lat,coordinateSystem:'WGS84-as-declared-by-source-unverified',origin:c.origin,sourceUrl:c.sourceUrl,
   sourceName:ref.requestedTitle,precision:c.precision??null,priorStatus:ref.location.status,priorScope:ref.scope,
   exclusionReasons:c.exclusionReasons??[],adopted:false})))
 const oldLibrary=(previous?.candidates??l.match.candidates??[]).map(c=>{
   const sourceCoordinates=c.sourceCoordinates??library.records.find(source=>source.uri===c.libraryUri)?.coordinates??null
   return {sourceName:c.name,sourceAddress:c.address,sourceUrl:c.libraryUri,sourceCoordinates,
    wgs84:Number.isFinite(sourceCoordinates?.longitude)&&Number.isFinite(sourceCoordinates?.latitude)?bd09ToWgs84(sourceCoordinates.longitude,sourceCoordinates.latitude):null,
    sourceSnapshot:'../../../public/data/shanghai-excellent-historical-buildings/geocoding/library/buildings.json',
    priorCoordinateReview:c.coordinateReview??null,adopted:false}
 })
 const result={officialId:target.id,code:target.codeRaw,batch:target.batch,name:target.official.originalNameOrUse,
   listedName:target.official.listedNameOrUse,officialAddress:target.official.addressAsListed,wikipediaAddress:target.wikipedia.addressAsListed,
   officialSourceUrl:target.official.source.url,previousLocationStatus:target.locationStatus,
   status:'needs-review',points:[],reason:additionalNotes[code]??null,queries:[queries.get(target.id)],
   sourceUrls:[],evidenceFiles:[],candidates:[...oldWiki,...oldLibrary],productionMapModified:false}
 if(l.match.point)result.candidates.push({...l.match.point,adopted:false,origin:'shanghai-library-new-address-pass'})
 if(libraryReferences[code]){result.status='reference-point';result.reason=libraryReferences[code];result.points=[libraryPoint(l)];usedCodes.add(code)}
 if(osmReferences[code]){const d=osmReferences[code];result.status='reference-point';result.reason=d.reason;result.points=d.ids.map(id=>asOsmPoint(findOsm(id),d.scope));result.sourceUrls.push(...d.sources??[]);usedCodes.add(code)}
 if(amapReferences[code]){const d=amapReferences[code],p=gcj02ToWgs84(d.lon,d.lat);result.status='reference-point';result.reason=d.reason;
   result.points=[{lon:p.longitude,lat:p.latitude,coordinateSystem:'WGS84',coordinateScope:d.scope??'building-reference-point',origin:'amap',
    sourceUrl:d.url,sourceSnapshot:sourceForUrl(d.url),sourceName:d.name,sourceCoordinates:{lon:d.lon,lat:d.lat,coordinateSystem:'GCJ-02'},
    derivation:'高德GCJ-02经现有12步迭代逆转换为WGS84；原值保留',measuredAccuracyMetres:null,historicalGeometryVerified:false}];usedCodes.add(code)}
 if(partialReferences[code]){const d=partialReferences[code];result.status='partial-reference';result.reason=d.reason;
   result.points=d.kind==='osm'?d.ids.map(id=>asOsmPoint(findOsm(id))):[libraryPoint(l)];result.sourceUrls.push(...d.sources??[]);usedCodes.add(code)}
 if(code==='1M004'){
   result.status='reference-point';result.reason=additionalNotes[code];result.points=[{lon:121.3667,lat:31.1919,coordinateSystem:'WGS84',coordinateScope:'building-reference-point',
   origin:'wikipedia',sourceUrl:'https://zh.wikipedia.org/wiki/罗别根花园',sourceSnapshot:['sources/web-005.txt','sources/web-targets-05-08.txt'],
   sourceName:'罗别根花园（虹桥路2310号住宅）',derivation:'具体建筑词条坐标，保留原四位小数，不用摄影者坐标替代楼体点',measuredAccuracyMetres:null,historicalGeometryVerified:false}];usedCodes.add(code)
 }
 if(code==='2B008'){const p=gcj02ToWgs84(121.452103,31.221697);result.candidates.push({sourceName:'延安中路955弄小区',sourceUrl:'https://ditu.amap.com/place/B00155LW7S',
   sourceCoordinates:{lon:121.452103,lat:31.221697,coordinateSystem:'GCJ-02'},wgs84:p,adopted:false,reason:'范围1—67号，未核官方保护1—11号'})}
 if(code==='4M047'){const p=gcj02ToWgs84(121.394385,31.199244);result.candidates.push({sourceName:'上海国际舞蹈中心',sourceUrl:'https://ditu.amap.com/place/B00156NZA8',
   sourceCoordinates:{lon:121.394385,lat:31.199244,coordinateSystem:'GCJ-02'},wgs84:p,adopted:false,reason:'整体剧场点，未逐栋对应老住宅'})}
 if(code==='4C023')result.candidates.push({lon:121.462556,lat:31.218735,coordinateSystem:'not-declared',sourceName:'淮海路796历峰双墅',
   sourceUrl:'https://m.map.360.cn/?new=1&pid=13f12c1e57ecc860&src=pc_shenbian',sourceSnapshot:'sources/map360-richemont.json',adopted:false,reason:'公开导航字段，未明确坐标系；不猜测转换'})
 if(['5A049','5A050'].includes(code))result.candidates.push({lon:121.486351,lat:31.243350909634,coordinateSystem:'not-declared',sourceName:'Art+ Shanghai Gallery JSON-LD geo',
   sourceUrl:'https://artguide.artforum.com/venue/art-shanghai-gallery-2088/',sourceSnapshot:'sources/artguide-955.json',adopted:false,reason:'页面地址为955号，但未取得此geo字段对应具体仓库的独立证据；可能沿用场馆旧点，不用于991/955两保护项'})
 if(!result.reason)throw new Error('Missing individual review decision '+code)
 if(!result.points.length&&!result.candidates.some(c=>Number.isFinite(c.lon)&&Number.isFinite(c.lat)||Number.isFinite(c.wgs84?.longitude)&&Number.isFinite(c.wgs84?.latitude)))result.status='no-coordinate'
 result.sourceUrls=[...new Set([result.officialSourceUrl,...result.sourceUrls,...result.points.map(p=>p.sourceUrl),...result.candidates.map(c=>c.sourceUrl).filter(Boolean)])]
 result.evidenceFiles=[...new Set([queries.get(target.id).evidence,...result.points.flatMap(p=>Array.isArray(p.sourceSnapshot)?p.sourceSnapshot:[p.sourceSnapshot]).filter(Boolean),
   ...result.sourceUrls.flatMap(sourceForUrl)])]
 for(const point of result.points){
  if(point.coordinateSystem!=='WGS84'||!Number.isFinite(point.lon)||!Number.isFinite(point.lat)||point.lon<120.7||point.lon>122.3||point.lat<30.6||point.lat>32)throw new Error('Invalid point '+code)
  if(!point.sourceSnapshot?.length)throw new Error('Chosen coordinate has no source snapshot '+code)
 }
 return result
})
for(const code of [...Object.keys(libraryReferences),...Object.keys(osmReferences),...Object.keys(amapReferences),...Object.keys(partialReferences)])if(!usedCodes.has(code))throw new Error('Unused decision '+code)
if(new Set(records.map(r=>r.officialId)).size!==80||records.some(r=>!allIds.has(r.officialId)))throw new Error('Target coverage drift')
const supplementalInputs=[]
for(const folder of ['residential','outer','urban','followup']){
 const file=path.join(dir,folder,'proposals.json')
 let bytes;try{bytes=await fs.readFile(file)}catch(e){if(e.code==='ENOENT')continue;throw e}
 const proposal=JSON.parse(bytes), items=proposal.records
 if(!Array.isArray(items))throw new Error('Invalid supplemental proposal '+folder)
 supplementalInputs.push({file:folder+'/proposals.json',sha256:digest(bytes)})
 const seen=new Set()
 for(const item of items){
  const result=records.find(r=>r.code===item.code||r.code.split(/[ (]/)[0]===item.code)
  if(!result||seen.has(result.officialId))throw new Error('Unknown/duplicate supplemental target '+item.code)
  seen.add(result.officialId)
  if(!['reference-point','partial-reference','needs-review','no-coordinate'].includes(item.status)||!item.reason)throw new Error('Incomplete supplemental decision '+item.code)
  for(const p of item.points??[]){
   if(!Number.isFinite(p.lon)||!Number.isFinite(p.lat)||p.lon<120.7||p.lon>122.3||p.lat<30.6||p.lat>32||!p.sourceSnapshot||!p.sourceUrl||!p.coordinateScope)throw new Error('Invalid supplemental point '+item.code)
   for(const snapshot of Array.isArray(p.sourceSnapshot)?p.sourceSnapshot:[p.sourceSnapshot])await fs.access(path.resolve(dir,snapshot))
  }
  if(['reference-point','partial-reference'].includes(item.status)&&!item.points?.length)throw new Error('Supplemental success without coordinates '+item.code)
  result.previousResearchDecision={status:result.status,reason:result.reason,points:result.points}
  result.status=item.status;result.reason=item.reason;result.points=(item.points??[]).map(p=>({...p,coordinateSystem:'WGS84',measuredAccuracyMetres:p.measuredAccuracyMetres??null,historicalGeometryVerified:false}))
  result.candidates.push(...item.candidates??[])
  result.sourceUrls=[...new Set([...result.sourceUrls,...item.sourceUrls??[],...result.points.map(p=>p.sourceUrl)])]
  result.evidenceFiles=[...new Set([...result.evidenceFiles,...item.evidenceFiles??[],folder+'/proposals.json',...result.points.flatMap(p=>Array.isArray(p.sourceSnapshot)?p.sourceSnapshot:[p.sourceSnapshot])])]
 }
}
const coverage={totalReviewed:records.length,referencePointRecords:records.filter(r=>r.status==='reference-point').length,
 partialReferenceRecords:records.filter(r=>r.status==='partial-reference').length,needsReview:records.filter(r=>r.status==='needs-review').length,
 noCoordinate:records.filter(r=>r.status==='no-coordinate').length,documentedReferencePoints:records.flatMap(r=>r.points).length,
 initialPerRecordQueries:queries.size,productionMapFeatures:978,productionMapModified:false}
const results={schemaVersion:1,reviewDate:'2026-10-31',researchPeriod:{start:'2026-10-30',end:'2026-10-31'},coverage,supplementalInputs,
 meaning:'本轮为剩余80项坐标研究，未修改生产地图。reference-point是有来源的楼体/门址/建筑群参考，不是测绘验证；partial-reference只定位到保护项部分组成物；候选原值不等于可上图。',
 coordinatePolicy:'OSM使用其WGS84几何；上海图书馆保留BD-09源值并用现有转换模块转WGS84；高德保留GCJ-02源值及逆转换结果。坐标系不明的字段不强行转换。小数位数不是测量精度。',
 sourcesNote:'本轮复查跨2026-10-30—31日；原始抓取时间戳逐份保留。图书馆原件仍为2026-09-18快照，并非声称本轮刷新目录。360字段坐标系是独立控制点支持的GCJ-02推断，明确保留publisherDeclarationAvailable=false及原值，不能声称页面明示。',records}
const features=records.flatMap(r=>r.points.map((p,i)=>({type:'Feature',id:r.officialId+(r.points.length>1?'-'+(i+1):''),geometry:{type:'Point',coordinates:[p.lon,p.lat]},properties:{officialId:r.officialId,code:r.code,name:r.name,address:r.officialAddress,status:r.status,coordinateScope:p.coordinateScope,sourceUrl:p.sourceUrl,coordinateSystem:'WGS84',reason:r.reason,researchOnly:true}})))
const recursiveSources=async folder=>{let entries;try{entries=await fs.readdir(path.join(dir,folder),{withFileTypes:true})}catch(e){if(e.code==='ENOENT')return[];throw e}return(await Promise.all(entries.map(async e=>e.isDirectory()?recursiveSources(folder+'/'+e.name):[folder+'/'+e.name]))).flat()}
const extraSourceFiles=(await Promise.all(['residential/sources','outer/sources','urban/sources'].map(recursiveSources))).flat()
const manifest={date:'2026-10-31',supplementalInputs,files:await Promise.all([...sourceFiles.map(file=>'sources/'+file),...extraSourceFiles].sort().map(async file=>{const bytes=await fs.readFile(path.join(dir,file));return {file,byteLength:bytes.length,sha256:digest(bytes)}})),
 reusedInputs:baseline.files.filter(f=>f.file.includes('library/buildings.json'))}
const esc=s=>String(s??'').replaceAll('|','／').replaceAll('\n','；')
const labels={'reference-point':'有来源参考点','partial-reference':'仅部分组成物定位','needs-review':'候选仍待核','no-coordinate':'本轮未获坐标'}
let md='# 剩余80项优秀历史建筑坐标复查\n\n调查日期：2026年10月30—31日。逐条覆盖冻结的80项；生产地图仍为978项，本轮没有回填地图。\n\n'
md+=`- 有来源参考点：**${coverage.referencePointRecords}项**。\n- 部分组成物定位：**${coverage.partialReferenceRecords}项**。\n- 候选仍待核：**${coverage.needsReview}项**。\n- 本轮未获坐标：**${coverage.noCoordinate}项**。\n- 共记录${coverage.documentedReferencePoints}个有来源参考点；一项可含多个组成物/范围。所有80项均有逐条检索记录。\n\n`
md+='点位分清楼体、门址、院落/建筑群；均非现场测绘结果，不由六位小数推断精度。部分定位不代表该保护项全部建筑已定位。候选包括已知错误、范围不符及坐标系待核的值，不能自动导入。\n\n'
md+='## 文件\n\n- [完整JSON](coordinate-review.json)：逐条结论、所选点、旧候选、来源原坐标/坐标系、限制和检索证据。\n- [研究参考点GeoJSON](reference-points.geojson)：仅导出有来源参考点及已定位组成物，带researchOnly标记；未接入应用。\n- [来源清单与SHA-256](source-manifest.json)：本轮保存网页检索结果和公开OSM原始响应；图书馆使用既有快照。\n- [冻结输入](targets.json)、[本地地址补查](local-address-review.json)：可追溯原80项及来源目录匹配。\n\n'
md+='- [独立证据校验](evidence-verification.json)：核对所有来源快照哈希、重新计算OSM轮廓中心及坐标系转换，并检查推断标记。\n\n360公开字段的GCJ-02判定属于独立控制点支持的推断，发布方网页未明示。详见[坐标系对照审计](urban/coordinate-system-audit.json)；控制点吻合不等于每个POI都正确。\n\n'
md+='## 已解决的典型问题\n\n- 上海总会、国际饭店、旧跑马总会、旧龙华机场候机楼：有明确建筑或历史点，不再因机构范围或双源冲突搁置。\n- 佘山教堂：采用带1989年序号的具名教堂轮廓，不用偏离山顶的图书馆点。\n- 中山医院：复旦官方说明老保护楼为现3号楼，1号楼为后建，分开处理。\n- 华东师大办公楼、上海中学大礼堂：采用校内独立楼体，保留旧目录点为候选而不照搬。\n- 校园建筑群：能定位其中一栋或两栋即明确记录，不宣称整组全部完成。\n\n'
for(const status of ['reference-point','partial-reference','needs-review','no-coordinate']){
 md+=`## ${labels[status]}\n\n| 编号 | 名称 | 官方地址 | WGS84参考坐标（经度，纬度） | 本轮结论／限制 | 来源 |\n|---|---|---|---|---|---|\n`
 for(const r of records.filter(r=>r.status===status)){
  const pts=r.points.map(p=>`${p.sourceName??''} ${p.lon}, ${p.lat}`).join('；')||'—（候选原值见JSON，未晋级）'
  const urls=[...new Set(r.points.map(p=>p.sourceUrl))]
  const refs=urls.length?urls.map((u,i)=>`[点位来源${i+1}](${u})`).join('；'):`[检索记录](${r.queries[0].evidence})`
  md+=`| ${esc(r.code)} | ${esc(r.name)} | ${esc(r.officialAddress)} | ${esc(pts)} | ${esc(r.reason)} | ${refs} |\n`
 }
 md+='\n'
}
md+='## 复现与检查\n\n在项目根目录运行：\n\n```powershell\nnode --preserve-symlinks --preserve-symlinks-main research/rechecks/2026-10-30-heritage-missing-coordinates/build-review.mjs --check\nnode --preserve-symlinks --preserve-symlinks-main research/rechecks/2026-10-30-heritage-missing-coordinates/audit-evidence.mjs\n```\n\n检查80个ID恰好覆盖原缺口、逐条检索完整、所选点具备来源且在上海宽边界内、生成物一致。原始名录、增强名录、978点地图及两份定位输入的哈希保持不变；研究期间其他工作的外部文件变动只作记录，不覆盖或还原。没有将“未找到坐标”当作建筑不存在。OSM数据© OpenStreetMap contributors，ODbL-1.0；其他来源归属及使用条件保持原说明。\n'
const outputs={'coordinate-review.json':JSON.stringify(results,null,2)+'\n','reference-points.geojson':JSON.stringify({type:'FeatureCollection',metadata:{researchOnly:true,coverage},features},null,2)+'\n',
 'source-manifest.json':JSON.stringify(manifest,null,2)+'\n','coordinate-review.md':md,
 'validation.json':JSON.stringify({coverage,baselineObservations,checks:{exactOriginal80:true,allHavePerRecordQuery:true,allHaveIndividualReason:true,selectedPointsHaveSnapshots:true,protectedDataBaselineUnchanged:true,productionMapDataUnchanged:true}},null,2)+'\n'}
for(const [file,text] of Object.entries(outputs)){
 if(check){if(await fs.readFile(path.join(dir,file),'utf8')!==text)throw new Error('Output drift: '+file)}else await fs.writeFile(path.join(dir,file),text)
}
console.log(JSON.stringify({...coverage,checked:check},null,2))
