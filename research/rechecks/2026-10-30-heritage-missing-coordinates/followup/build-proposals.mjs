import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {gcj02ToWgs84} from '../../../../scripts/lib/coordinate-systems.mjs'
const dir=path.dirname(fileURLToPath(import.meta.url)),parent=path.resolve(dir,'..')
const osm=JSON.parse(await fs.readFile(path.join(parent,'osm-features.json'),'utf8')).records
function mapPoint(name,x,y,sourceFile,query){const p=gcj02ToWgs84(x,y);return{lon:p.longitude,lat:p.latitude,coordinateScope:'address-reference-point',sourceName:name,
 sourceUrl:'https://m.map.360.cn/?city=上海市&k='+encodeURIComponent(query)+'&src=bendibao&t=map',sourceSnapshot:sourceFile,
 sourceCoordinates:{lon:x,lat:y,coordinateSystem:'GCJ-02-inferred'},sourceCoordinateSystemEvidence:'empirical-control-comparison',publisherDeclarationAvailable:false,
 coordinateSystemAudit:'urban/coordinate-system-audit.json',derivation:'精确门牌/具名建筑的公开网页点；按独立控制点支持的GCJ-02推断逆转换，非现场测绘'} }
const code='2M006', ids=[494666670,494666671,494666672,494666673,494666675]
const oldPoints=ids.map(id=>{const f=osm.find(f=>f.type==='way'&&f.id===id);if(!f)throw new Error('Missing protected OSM feature');return{lon:f.point.lon,lat:f.point.lat,
 coordinateScope:'building-reference-point',sourceName:f.name,sourceUrl:f.sourceUrl,sourceSnapshot:f.sourceFile,sourceVersion:f.version,sourceTimestamp:f.timestamp,
 sourceCoordinates:{...f.point,coordinateSystem:'WGS84'},derivation:'带旧保护编号M-Ⅲ-006的完整OSM建筑轮廓包围框中心（范围参考）'}})
const records=[{
 code,status:'reference-point',reason:'六栋分别取得位置：科学馆、西门堂、思颜堂、校政厅、思孟堂均有旧保护编号M-Ⅲ-006的OSM独立轮廓；怀施堂通过华政官方资料确认1951年改名韬奋楼，另取具名韬奋楼公开地图点，转换后落入同校园OSM大楼轮廓范围。六点各自保留，不共用校园中心；官方1175号与现校园1575号差异不改写。',
 points:[...oldPoints,mapPoint('怀施堂／韬奋楼',121.417879,31.22583,'sources/map360-ecupl-taofen.json','华东政法大学韬奋楼')],
 sourceUrls:['https://www.ecupl.edu.cn/2022/1101/c13514a193944/page.htm','https://news.ecupl.edu.cn/2026/1027/c675a228746/page.htm'],
 evidenceFiles:['sources/web-focus-27.txt','sources/osm-ecupl-historic.json','sources/map360-ecupl-taofen.json','urban/coordinate-system-audit.json']
},{
 code:'3F004',status:'partial-reference',reason:'精确查询分别返回武进路206号及296号的门牌解析点，两端均位于官方保护号段。记录两个现代门址参考，未取得中间各住宅的独立轮廓，不把两端坐标当作整排保护边界。图书馆跨道路复制点继续拒用。',
 points:[mapPoint('武进路206号门址解析点',121.486555,31.2527139,'sources/map360-wujin-206.json','武进路206号'),mapPoint('武进路296号门址解析点',121.48497,31.2521011,'sources/map360-wujin-296.json','武进路296号')],
 evidenceFiles:['sources/map360-wujin-206.json','sources/map360-wujin-296.json','urban/coordinate-system-audit.json'],sourceUrls:[]
},{
 code:'3F006',status:'partial-reference',reason:'精确查询取得昆山路227号、277号两栋对应门址解析点，分别记录；昆山花园路1—10号其余组成物未完成定位。两点不是实测楼心，图书馆误复制到江苏路的原点不采用。',
 points:[mapPoint('昆山路227号门址解析点',121.486181,31.2492619,'sources/map360-kunshan-227.json','昆山路227号'),mapPoint('昆山路277号门址解析点',121.485153,31.2491481,'sources/map360-kunshan-277.json','昆山路277号')],
 evidenceFiles:['sources/map360-kunshan-227.json','sources/map360-kunshan-277.json','urban/coordinate-system-audit.json'],sourceUrls:['https://www.dylhad.com/item.html']
}]
await fs.writeFile(path.join(dir,'proposals.json'),JSON.stringify({reviewDate:'2026-10-31',records},null,2)+'\n')
console.log(JSON.stringify({records:records.length,points:records.flatMap(r=>r.points).length}))
