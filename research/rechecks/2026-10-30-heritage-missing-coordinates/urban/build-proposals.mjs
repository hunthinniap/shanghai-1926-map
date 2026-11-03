import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { gcj02ToWgs84, bd09ToWgs84 } from '../../../../scripts/lib/coordinate-systems.mjs'

const dir=path.dirname(fileURLToPath(import.meta.url))
const check=process.argv.includes('--check')
const read=async file=>JSON.parse(await fs.readFile(path.join(dir,file),'utf8'))
const hash=b=>createHash('sha256').update(b).digest('hex')
const distance=(a,b)=>6371000*2*Math.asin(Math.sqrt(Math.sin((a[1]-b[1])*Math.PI/360)**2+Math.cos(a[1]*Math.PI/180)*Math.cos(b[1]*Math.PI/180)*Math.sin((a[0]-b[0])*Math.PI/360)**2))
const rounded=n=>Number(n.toFixed(7))

async function feature(file,type,id){
 const d=await read('sources/'+file+'.raw')
 const e=d.elements.find(e=>e.type===type&&e.id===id)
 if(!e)throw new Error('Feature not found: '+file+' '+type+'/'+id)
 const nodes=new Map(d.elements.filter(e=>e.type==='node').map(e=>[e.id,e]))
 const p=type==='node'?[[e.lon,e.lat]]:e.nodes.map(id=>nodes.get(id)).map(n=>[n.lon,n.lat])
 const bbox=[Math.min(...p.map(p=>p[0])),Math.min(...p.map(p=>p[1])),Math.max(...p.map(p=>p[0])),Math.max(...p.map(p=>p[1]))]
 return {e,bbox,lon:rounded((bbox[0]+bbox[2])/2),lat:rounded((bbox[1]+bbox[3])/2)}
}
const hamilton=await feature('control-hamilton','way',380340010)
const richemont=await feature('richemont-correct','way',494405859)
const dance=await feature('dance-correct','node',4933513840)
if(richemont.e.tags['heritage:ref']!=='4C023'||richemont.e.tags['addr:housenumber']!=='796'||dance.e.tags['ref:zh']!=='4M047')throw new Error('Chosen heritage identity changed')
const controls=[
 {name:'汉弥尔登大楼/福州大楼',raw:[121.487655,31.23484],osm:hamilton,sourceSnapshot:'urban/sources/360-hamilton.raw',osmSnapshot:'urban/sources/control-hamilton.raw'},
 {name:'淮海中路796号历峰双墅',raw:[121.462556,31.218735],osm:richemont,sourceSnapshot:'sources/map360-richemont.json',osmSnapshot:'urban/sources/richemont-correct.raw'},
].map(c=>{
 const g=gcj02ToWgs84(...c.raw),b=bd09ToWgs84(...c.raw)
 return {name:c.name,sourceCoordinates:c.raw,sourceSnapshot:c.sourceSnapshot,osmSnapshot:c.osmSnapshot,osmId:c.osm.e.type+'/'+c.osm.e.id,
   independentWgs84:[c.osm.lon,c.osm.lat],gcjInverseWgs84:[g.longitude,g.latitude],
   residualMetres:{rawAsWgs84:distance(c.raw,[c.osm.lon,c.osm.lat]),gcj02Inverse:distance([g.longitude,g.latitude],[c.osm.lon,c.osm.lat]),bd09Inverse:distance([b.longitude,b.latitude],[c.osm.lon,c.osm.lat])}}
})
if(controls.some(c=>c.residualMetres.gcj02Inverse>30||c.residualMetres.rawAsWgs84<400||c.residualMetres.bd09Inverse<700))throw new Error('Coordinate inference controls no longer discriminate')
const audit={reviewDate:'2026-10-31',publisherDeclarationAvailable:false,determination:'GCJ-02 inferred from independent controls',
 conclusion:'360公开网页window.__STATE__的x/y没有在页面明示坐标系；两处具名、同址的独立OSM建筑控制点均与GCJ-02逆转换吻合（约7米/21米），与原值直接当WGS84或按BD-09转换明显不合。故本轮按经控制点检验的GCJ-02推断处理，明确保留推断性质和原值。',
 limitations:['控制点检验支持坐标系判定，不等于所查全部POI位置都正确。','POI可能表示门址、庭院或范围参考；不由小数位推断测量精度。','本轮仅用于坐标研究提案，未写入生产地图。'],controls}

const meta=async id=>read('sources/'+id+'.meta.json')
const selectedPoi=async(id,name)=>{const p=(await read('sources/'+id+'.parsed.json')).points.find(p=>p.name===name);if(!p)throw new Error('Missing named POI '+id+' '+name);return p}
async function point360(id,name,scope,extra={}){
 const p=await selectedPoi(id,name),m=await meta(id),w=gcj02ToWgs84(p.x,p.y)
 return {lon:w.longitude,lat:w.latitude,coordinateSystem:'WGS84',coordinateScope:scope,origin:'360-public-map',sourceName:p.name,sourceAddress:p.address??null,
   sourceUrl:m.url,sourceSnapshot:'urban/'+m.file,sourceSnapshotSha256:m.sha256,sourceCoordinates:{lon:p.x,lat:p.y,coordinateSystem:'GCJ-02-inferred'},
   sourceCoordinateSystemEvidence:'empirical-control-comparison',publisherDeclarationAvailable:false,coordinateSystemAudit:'urban/coordinate-system-audit.json',
   derivation:'解析公开网页STATE原值；经两处独立控制点判别为GCJ-02后，用项目既有gcj02ToWgs84迭代逆转换。',measuredAccuracyMetres:null,historicalGeometryVerified:false,...extra}
}
async function pointOsm(file,f,scope,sourceName){
 const m=await meta(file)
 return {lon:f.lon,lat:f.lat,coordinateSystem:'WGS84',coordinateScope:scope,origin:'openstreetmap',sourceName,sourceUrl:'https://www.openstreetmap.org/'+f.e.type+'/'+f.e.id,
   sourceSnapshot:'urban/'+m.file,sourceSnapshotSha256:m.sha256,sourceVersion:f.e.version,sourceTimestamp:f.e.timestamp,
   sourceCoordinates:{lon:f.lon,lat:f.lat,coordinateSystem:'WGS84'},sourceTags:f.e.tags,bbox:f.bbox,
   derivation:f.e.type==='node'?'OSM原始具保护编号点':'完整OSM建筑轮廓包围框中心（参考点，非实测楼心）',measuredAccuracyMetres:null,historicalGeometryVerified:false}
}
const pCixiu=await point360('360-cixiu','慈修庵','address-reference-point')
const pHuoshan=await point360('360-huoshan','远东反战大会旧址','address-reference-point')
const pYanqing=await point360('360-yanqing','百联集团时尚产业(衍庆里)','address-reference-point')
const p979=await point360('360-nansuzhou979','上海市南苏州路979号','address-reference-point',{positionType:'public-address-geocoding-result',sourcePoiId:null})
const pLong50=await point360('360-changyang','长阳路50弄小区','building-complex-reference-point')
const pLongHotel=await point360('360-changyang31','上海公寓直租(霍山路分店)','building-complex-reference-point')
const records=[
 {code:'2A056',status:'reference-point',reason:'找到独立公开具名慈修庵POI，完整地址写榛岭街15号、方浜中路593号；保护名录秦岭街15号的原文差异保留。采用具名寺院门址参考，原图书馆复制异常点和偏离的维基候选均不沿用。360坐标系系经独立控制点推断为GCJ-02，原值及判定依据已保存；尚未测定寺院保护建筑轮廓。',points:[pCixiu],sourceUrls:[pCixiu.sourceUrl,'https://fgj.sh.gov.cn/yxlsjz/20210922/8f72fa07617c4828a25ef948cd1c5da7.html'],evidenceFiles:['urban/sources/360-cixiu.raw','urban/coordinate-system-audit.json']},
 {code:'4C023',status:'reference-point',reason:'OSM way494405859完整建筑轮廓同时标淮海中路796号、优秀历史建筑编号4C023，与历峰双墅保护项一致。直接采用WGS84轮廓包围框中心；公开360导航点仅作为独立交叉核对，不再依赖未知坐标系假设定位本楼。',points:[await pointOsm('richemont-correct',richemont,'building-reference-point','淮海中路796号花园住宅/历峰双墅')],sourceUrls:['https://www.openstreetmap.org/way/494405859','https://m.map.360.cn/?new=1&pid=13f12c1e57ecc860&src=pc_shenbian'],evidenceFiles:['urban/sources/richemont-correct.raw','urban/coordinate-system-audit.json']},
 {code:'4F026',status:'partial-reference',reason:'公开地图独立具名远东反战大会旧址的完整门址为霍山路85号，位于官方71—95号保护号段内，取得该号门址参考。只确认这一处门址；舟山路21—81号及霍山路整排各楼的范围仍未逐一测定，不以85号点覆盖整组住宅。',points:[pHuoshan],sourceUrls:[pHuoshan.sourceUrl,'https://fgj.sh.gov.cn/yxlsjz/20200331/e3b99cf457ae48cab87ad5c02aa0fee3.html'],evidenceFiles:['urban/sources/360-huoshan.raw','urban/coordinate-system-audit.json']},
 {code:'4F028',status:'needs-review',reason:'新增公开地图具名长阳路50弄小区（5号）、北门和索纳特酒店公寓（1—31号）点。精确检索15号只回退至整弄，31号也返回1—31号整体公寓；未找到15—31号这一受保护子范围的独立点。因此保留候选，不把5号、北门或整弄中心晋级为保护子范围位置。',points:[],candidates:[{...pLong50,adopted:false,reason:'来源写5号，超出保护15—31号子范围'},{...pLongHotel,adopted:false,reason:'来源仅写1—31号整体，未分保护15—31号'}],sourceUrls:[pLong50.sourceUrl,pLongHotel.sourceUrl],evidenceFiles:['urban/sources/360-changyang.raw','urban/sources/360-changyang15.raw','urban/sources/360-changyang31.raw','urban/coordinate-system-audit.json']},
 {code:'4M047',status:'partial-reference',reason:'OSM node4933513840明确标虹桥路1590号住宅，ref:zh=4M047，取得该保护项一处组成物的WGS84参考点。官方同项还列1648、1650、1652、1674号及若干楼号，未逐栋完成；本点不代表新建舞蹈中心剧场或整项住宅群已定位。',points:[await pointOsm('dance-correct',dance,'building-reference-point','虹桥路1590号住宅（4M047组成物）')],sourceUrls:['https://www.openstreetmap.org/node/4933513840'],evidenceFiles:['urban/sources/dance-correct.raw']},
 {code:'5A049',status:'reference-point',reason:'官方同一条目现名称明确为南苏州路979号仓库，而地址栏列991号。本轮获得979号公开门址地理编码参考；以官方现名称建立对应，991/979差异原样保留，不能宣称已单独核定991号楼体。精确检索991号时来源未返回991，故未借用另一个999号结果。该点只作“979号仓库”门址参考，非仓库轮廓或保护范围。',points:[p979],sourceUrls:[p979.sourceUrl,'https://fgj.sh.gov.cn/yxlsjz/20200414/b9946bf8508e4b9689671fcd4146bb86.html'],evidenceFiles:['urban/sources/360-nansuzhou979.raw','urban/sources/360-nansuzhou991.raw','urban/coordinate-system-audit.json']},
 {code:'5A050',status:'reference-point',reason:'公开具名百联集团时尚产业（衍庆里）POI完整地址为南苏州路955号，与保护条目现名称及地址一致，可作955号旧货栈改造园区门址参考。区别于厦门路230弄另一个衍庆里住宅POI，亦未采用Artguide页面可能沿用旧址的Geo字段；未测定该仓库单体保护轮廓。',points:[pYanqing],sourceUrls:[pYanqing.sourceUrl,'https://fgj.sh.gov.cn/yxlsjz/20200414/b9946bf8508e4b9689671fcd4146bb86.html'],evidenceFiles:['urban/sources/360-yanqing.raw','urban/coordinate-system-audit.json']},
]
for(const r of records)for(const p of r.points)if(!Number.isFinite(p.lon)||!Number.isFinite(p.lat)||p.lon<120.7||p.lon>122.3||p.lat<30.6||p.lat>32)throw new Error('Invalid Shanghai point: '+r.code)
const files=(await fs.readdir(path.join(dir,'sources'))).sort()
const manifest={date:'2026-10-31',files:await Promise.all(files.map(async file=>{const b=await fs.readFile(path.join(dir,'sources',file));return {file:'urban/sources/'+file,byteLength:b.length,sha256:hash(b)}}))}
const summary={reviewed:records.length,referencePointRecords:records.filter(r=>r.status==='reference-point').length,partialReferenceRecords:records.filter(r=>r.status==='partial-reference').length,needsReview:records.filter(r=>r.status==='needs-review').length,points:records.flatMap(r=>r.points).length,productionMapModified:false}
const outputs={
 'coordinate-system-audit.json':JSON.stringify(audit,null,2)+'\n',
 'proposals.json':JSON.stringify({schemaVersion:1,reviewDate:'2026-10-31',summary,coordinateSystemCaveat:'360原值的GCJ-02判定是两处独立控制点支持的推断，不是发布方页面明示。',records},null,2)+'\n',
 'source-manifest.json':JSON.stringify(manifest,null,2)+'\n',
 'README.md':'# 城区七项坐标复查提案\n\n复查日期：2026年10月31日。全部结果只写研究目录，未修改地图。\n\n'+
 '| 编号 | 结果 | WGS84参考点（经度，纬度） | 限制 |\n|---|---|---|---|\n'+records.map(r=>'| '+r.code+' | '+r.status+' | '+(r.points.map(p=>p.lon+', '+p.lat).join('；')||'—')+' | '+r.reason+' |').join('\n')+'\n\n'+
 '360坐标系判定参见[控制点审计](coordinate-system-audit.json)：汉弥尔登大楼与历峰双墅两处独立OSM建筑轮廓对照，GCJ-02逆转换后残差分别约7米及21米；直接当WGS84偏约486/492米，按BD-09转换偏约903/945米。该判断明确为推断，不能把POI小数位数当作测绘精度。\n\n完整可合并字段见[proposals.json](proposals.json)，原始来源及哈希见[source-manifest.json](source-manifest.json)。长阳路50弄的候选原坐标保留，但不自动晋级保护子范围。\n'
}
for(const[file,text]of Object.entries(outputs)){if(check){if(await fs.readFile(path.join(dir,file),'utf8')!==text)throw new Error('Output drift: '+file)}else await fs.writeFile(path.join(dir,file),text)}
console.log(JSON.stringify({...summary,checked:check},null,2))
