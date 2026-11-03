import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {gcj02ToWgs84} from '../../../../scripts/lib/coordinate-systems.mjs'

const dir=path.dirname(fileURLToPath(import.meta.url)), parent=path.dirname(dir)
const read=async f=>JSON.parse(await fs.readFile(path.join(dir,f),'utf8'))
const osm=await read('osm-features.json'), maps=await read('map360-candidates.json')
const audit=JSON.parse(await fs.readFile(path.join(parent,'urban/coordinate-system-audit.json'),'utf8'))
const auditPath='urban/coordinate-system-audit.json'
const entry=file=>maps.records.find(r=>r.sourceFile===file)
const queryUrl=q=>'https://m.map.360.cn/?city='+encodeURIComponent('上海市')+'&k='+encodeURIComponent(q)+'&src=bendibao&t=map'
const coordinateControlFiles=['urban/sources/360-hamilton.raw','urban/sources/control-hamilton.raw','urban/sources/richemont-correct.raw']
const as360Point=(p,file,reason)=>{
 const w=gcj02ToWgs84(p.lon,p.lat)
 return {lon:w.longitude,lat:w.latitude,coordinateSystem:'WGS84',coordinateScope:'address-reference-point',origin:'360-public-map',
  sourceName:p.name,sourceAddress:p.address,sourceUrl:queryUrl(entry(file).keyword),sourceSnapshot:file,
  sourceCoordinates:{lon:p.lon,lat:p.lat,coordinateSystem:'GCJ-02-inferred'},
  sourceCoordinateSystemEvidence:'empirical-control-comparison',publisherDeclarationAvailable:false,coordinateSystemAudit:auditPath,
  derivation:'360公开页STATE的x/y；同一服务的两个具名控制点支持GCJ-02解释，经现有迭代逆转换为WGS84。该坐标系为实测对照推断，页面未明示。',
  limitation:reason,measuredAccuracyMetres:null,historicalGeometryVerified:false}
}
const liang=osm.records.find(r=>r.id==='way/495669844')
if(!liang||liang.tags['heritage:ref']!=='4H005')throw Error('Missing exact Liang heritage code')
const qianSource=entry('outer/sources/qianhuian-map360.json')
const qian=qianSource.points.find(p=>p.name==='钱慧安纪念馆'&&p.address.includes('173弄3号'))
if(!qian)throw Error('Missing exact Qian Hui-an POI address')
const donghuSource=entry('outer/sources/donghu209-map360.json'), donghu=donghuSource.points[0]
const records=[
 {code:'4H005',status:'reference-point',reason:'OSM独立建筑轮廓的保护编号为4H005，虽然门牌仍错写山西北路452弄61号，独立Commons原拍摄者照片题名明确457弄61号梁氏大宅，WGS84摄影位置距轮廓中心约16m，支持同一楼体。采用带保护编号的楼体范围参考；保留457/452的源地址差异，不改官方地址。',
  points:[{lon:liang.point.lon,lat:liang.point.lat,coordinateSystem:'WGS84',coordinateScope:'building-reference-point',origin:'openstreetmap',sourceName:'梁氏民宅（4H005保护编号轮廓）',sourceAddress:liang.address,
    sourceUrl:liang.sourceUrl,sourceSnapshot:'outer/sources/liang-neighborhood.json',sourceVersion:liang.version,
    sourceCoordinates:{coordinateSystem:'WGS84',bbox:liang.bbox},derivation:'OSM完整建筑轮廓的包围框中心。旁证摄影点只用于邻近核对，不作为楼心。',measuredAccuracyMetres:null,historicalGeometryVerified:false}],
  sourceUrls:[liang.sourceUrl,'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent('上海闸北区山西北路457路61号梁氏大宅山墙 - panoramio.jpg')],
  evidenceFiles:['outer/sources/liang-neighborhood.json','outer/sources/liang-neighborhood.source.json','outer/sources/commons-metadata.json','outer/sources/commons-metadata.source.json'],
  candidates:[{lon:121.474221,lat:31.249589,coordinateSystem:'WGS84',sourceName:'梁氏大宅山墙独立照片的摄影位置',sourceSnapshot:'outer/sources/commons-metadata.json',adopted:false,reason:'距所选建筑轮廓中心约16m；摄影者站位不是建筑中心。'}]},
 {code:'5W014',status:'partial-reference',reason:'新增360具名钱慧安纪念馆POI，完整地址为高桥西街173弄3号；浦东官方2023年高桥报道将馆址列173弄1—3号，采购保护清单亦将5W014列为钱慧安纪念馆/高桥书画院、173弄1—3及175—181号。该点可定位173弄3号这一组成物；175—181号其他保护建筑尚未逐栋核定。采用经两个控制点推断GCJ-02后转换的门址参考，不用旧图书馆185号点。',
  points:[as360Point(qian,qianSource.sourceFile,'仅173弄3号组成物门址参考，不代表该名录项其余175—181号建筑全部定位。')],
  sourceUrls:[queryUrl(qianSource.keyword),'https://www.pudong.gov.cn/016019007/20231220/771993/e63bced4da304d9a845893e47adbb9a3.pdf','https://sh-gov-open-doc.oss-cn-shanghai.aliyuncs.com/1108QZ/794a7383-2f8b-426c-91b5-d316e6906fd1.pdf'],
  evidenceFiles:['outer/search-01.txt','outer/sources/qianhuian-map360.json','outer/sources/qianhuian-map360.source.json',auditPath,...coordinateControlFiles],candidates:[]},
 {code:'5W035',status:'no-coordinate',reason:'上海规划资源局航头镇规划资料明确保护住宅门牌为下沙街西段452号，补齐了官网缺失门牌。本轮分别查询“航头镇下沙街452号”和“上海市浦东新区下沙街452号”，360两次只退回“下沙”地区点，未返回452号门址或住宅实体；已有OSM及图书馆也未提供该住宅有据点位，未将地区中心冒作住宅位置。',points:[],
  sourceUrls:['https://ghzyj.sh.gov.cn/cmsres/a6/a688f7e8f2ac41e8a1c8d0efa459f245/befef57ef16f07bbd51e96fe3f5447ce.pdf',queryUrl('航头镇下沙街452号'),queryUrl('上海市浦东新区下沙街452号')],
  evidenceFiles:['outer/search-05.txt','outer/sources/xiasha452-map360.json','outer/sources/xiasha452-full-map360.json'],candidates:[],rejectedSearchResults:[{sourceName:'上海市航头镇下沙',lon:121.589233,lat:31.0519489,coordinateSystem:'GCJ-02-inferred',reason:'地区级回退，未命中452号，不能采用。'}]},
 {code:'5W046',status:'needs-review',reason:'2024年浦东官方公示为拟将小湾区公所由小湾村北街11号迁至唐镇G13-0101-1地块绿地，不等于迁移已完成。本轮继续检索未取得迁移完成及具体新建筑坐标；360同名检索只匹配到重庆的区公所，明确排除。图书馆旧址点继续只能作旧来源候选，不能标成现址。',points:[],
  sourceUrls:['https://www.pudong.gov.cn/zwgk/14483.gkml_zhzw_ghjh/2024/299/333473.html',queryUrl('小湾区公所')],
  evidenceFiles:['outer/search-01.txt','outer/sources/xiaowan-map360.json'],candidates:[],rejectedSearchResults:[{reason:'360只返回重庆市江津区、开州区同名区公所，超出上海并且身份不同，不记录为有效候选。'}]},
 {code:'5X003',status:'needs-review',reason:'本轮用练塘镇东风街109号/110号及完整青浦区地址补检；109号仅退回练塘镇中心，110号匹配到盘锦同号门牌，均排除。旧图书馆111号与官方109、110号的身份关系仍未解决，不能拿相邻门号补保护楼位置。',points:[],
  sourceUrls:[queryUrl('练塘镇东风街109号'),queryUrl('练塘镇东风街110号'),queryUrl('上海市青浦区练塘镇东风街109号')],
  evidenceFiles:['outer/search-02.txt','outer/search-05.txt','outer/sources/dongfeng109-map360.json','outer/sources/dongfeng110-map360.json','outer/sources/dongfeng109-full-map360.json'],candidates:[],rejectedSearchResults:[{reason:'练塘镇地区中心和盘锦市东风街110号均非受保护住宅，未转换成可上图点。'}]},
 {code:'5X004',status:'needs-review',reason:'新取得青浦文旅官方身份桥接：练塘下塘街街廊的地址为下塘街44弄19—33号，与本名录19—38号及北侧构筑物范围相交。Commons有具名街廊现场照片及WGS84摄影位置，可作为位置线索；OSM本轮未发现明确廊棚轮廓。完整44弄19号检索仍退回镇中心，因此不把摄影者站位或陈云故居中心充作受保护住宅/廊棚楼体点。',points:[],
  sourceUrls:['https://www.shqp.gov.cn/tv/wlzwgk/ml/qt/20190829/556356.html','https://www.shqp.gov.cn/tv/tv/upload/202407/0712_083619_917.pdf','https://commons.wikimedia.org/wiki/File:Riverside_Veranda_at_Xiatang_Street,_Liantang_Town.jpg',queryUrl('上海市青浦区练塘镇下塘街44弄19号')],
  evidenceFiles:['outer/search-02.txt','outer/search-05.txt','outer/sources/commons-metadata.json','outer/sources/liantang-corridor.json','outer/sources/xiatang19-full-map360.json'],
  candidates:[{lon:121.041472,lat:31.009628,coordinateSystem:'WGS84',coordinateScope:'photographer-location-only',sourceName:'练塘下塘街街廊2020年照片的摄影位置',sourceUrl:'https://commons.wikimedia.org/wiki/File:Riverside_Veranda_at_Xiatang_Street,_Liantang_Town.jpg',sourceSnapshot:'outer/sources/commons-metadata.json',adopted:false,reason:'已由官方地址桥接具名街廊，但该GPS是摄影站位，未作为建筑或完整保护范围点。'}]},
 {code:'5X005',status:'needs-review',reason:'新增官方地址清单和Commons照片仍支持东湖街209弄，图书馆却记东湖里209号。360本轮回显完整“朱家角镇东湖街209弄”及原坐标，但没有POI实体ID或定位精度/层级声明，且转换后与图书馆点相距约600m。双源冲突未解决，不能只按数字209就自动采用其中一点。',points:[],
  sourceUrls:['https://commons.wikimedia.org/wiki/File:Donghujie_209_Long_Minzhai.JPG',queryUrl(donghuSource.keyword)],
  evidenceFiles:['outer/search-02.txt','outer/search-05.txt','outer/sources/commons-metadata.json','outer/sources/donghu209-map360.json','outer/sources/donghu209-neighborhood.json',auditPath],
  candidates:[{...as360Point(donghu,donghuSource.sourceFile,'无POI实体ID，定位层级未声明，与旧目录点显著不一致，未采用。'),adopted:false,providerEntityId:null,sourceIdentityLevelUnspecified:true}]},
 {code:'5X012',status:'needs-review',reason:'青浦文旅2024年官方名录把鹤江路369号明确命名为薛家宅（310118-0159），2026年修缮招标线索亦同址。按薛家宅搜索返回多个外区同名村，完整369号检索只给鹤江路/路口和444号商店，不返回369号住宅；旧图书馆344号仍无换号/同院桥接，故不拿道路或邻楼坐标晋级。',points:[],
  sourceUrls:['https://www.shqp.gov.cn/tv/tv/upload/202407/0712_083619_917.pdf','https://www.qianlima.com/bid-638347320.html',queryUrl('白鹤镇薛家宅'),queryUrl('上海市青浦区鹤江路369号')],
  evidenceFiles:['outer/search-04.txt','outer/search-05.txt','outer/sources/xuejia-map360.json','outer/sources/xuejia369-map360.json','outer/sources/xuejia-neighborhood.json'],candidates:[],
  rejectedSearchResults:[{reason:'嘉定、浦东、金山同名薛家宅均非白鹤镇对象；鹤江路、路口和444号商店亦不是369号住宅。'}]},
]
const expected=['4H005','5W014','5W035','5W046','5X003','5X004','5X005','5X012']
if(records.map(r=>r.code).join()!==expected.join())throw Error('Wrong scope')
const referenced=new Set(records.flatMap(r=>[...r.evidenceFiles,...r.points.flatMap(p=>Array.isArray(p.sourceSnapshot)?p.sourceSnapshot:[p.sourceSnapshot])]))
const manifest=[]
for(const f of referenced){const b=await fs.readFile(path.join(parent,f));manifest.push({file:f,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')})}
const output={schemaVersion:1,date:'2026-10-31',scope:'4H005与浦东/青浦七项；只作研究提案，不改地图',coverage:{total:8,referencePointRecords:1,partialReferenceRecords:1,needsReview:5,noCoordinate:1},coordinateSystemPolicy:'360原字段未声明；按urban的两个独立具名控制点对照推断GCJ-02，保留推断标记，不声称发布方明示。OSM和Commons GPS各保留原声明。',records,manifest}
await fs.writeFile(path.join(dir,'proposals.json'),JSON.stringify(output,null,2)+'\n')
let md='# 外围及梁氏民宅8项续查\n\n2026年10月31日。结果：1项具名/编号建筑参考点、1项部分组成物参考点、5项待核、1项未获坐标。没有改动生产地图。\n\n'
md+='| 编号 | 状态 | 采用的WGS84参考坐标（经度，纬度） | 本轮结论 |\n|---|---|---|---|\n'
for(const r of records)md+=`| ${r.code} | ${r.status} | ${r.points.map(p=>p.lon+', '+p.lat).join('；')||'—'} | ${r.reason} |\n`
md+='\n逐条URL、原坐标/坐标系、来源快照、候选和SHA-256见[proposals.json](proposals.json)。360坐标系按[控制点审计](../urban/coordinate-system-audit.json)推断；没有将镇/地区中心、异地同名村、邻号店铺或摄影者站位直接当成受保护楼体。\n'
await fs.writeFile(path.join(dir,'README.md'),md)
console.log(JSON.stringify({coverage:output.coverage,points:records.flatMap(r=>r.points).map(p=>({name:p.sourceName,lon:p.lon,lat:p.lat})),audited:audit?.method??true},null,2))
