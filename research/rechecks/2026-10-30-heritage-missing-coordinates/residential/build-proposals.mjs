import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {bd09ToWgs84,gcj02ToWgs84} from '../../../../scripts/lib/coordinate-systems.mjs'
const dir=path.dirname(fileURLToPath(import.meta.url))
const webUrl=id=>'https://m.map.360.cn/?pid='+id
function gcj(name,lon,lat,file,url,scope='address-reference-point'){
 const p=gcj02ToWgs84(lon,lat)
 return {lon:p.longitude,lat:p.latitude,coordinateScope:scope,sourceName:name,sourceUrl:url,sourceSnapshot:file,
  sourceCoordinates:{lon,lat,coordinateSystem:'GCJ-02-inferred'},sourceCoordinateSystemEvidence:'empirical-control-comparison',publisherDeclarationAvailable:false,
  coordinateSystemAudit:'urban/coordinate-system-audit.json',derivation:'公开地图STATE x/y按GCJ-02推断，结合汉弥尔登、历峰双墅独立OSM控制点核验后逆转换；为门址参考，不是测绘楼心'}
}
function bd(name,lon,lat,file,url,scope='address-reference-point'){
 const p=bd09ToWgs84(lon,lat)
 return {lon:p.longitude,lat:p.latitude,coordinateScope:scope,sourceName:name,sourceUrl:url,sourceSnapshot:file,
  sourceCoordinates:{lon,lat,coordinateSystem:'BD-09'},sourceCoordinateSystemEvidence:'publisher-BMapGL-code-or-explicit-Bd-fields',publisherDeclarationAvailable:true,
  derivation:'页面明确使用百度BMapGL.Point或longitudeBd/latitudeBd字段，按BD-09→GCJ-02→WGS84转换；原值保留'}
}
const record=(code,status,reason,points=[],candidates=[],evidenceFiles=[])=>({code,status,reason,points,candidates,evidenceFiles,sourceUrls:[...new Set([...points,...candidates].map(p=>p.sourceUrl).filter(Boolean))]})
const records=[
 record('5D003','reference-point','独立住宅资料页明确首长公寓为高安路60、62号，BMapGL点与图书馆原60弄点接近；采用60/62号共用院址范围参考，未单独核定60号楼体中心。',[
  bd('首长公寓（60、62号共用范围）',121.452549,31.20809915,'residential/sources/shouzhang.html','https://sh.dushiquan.net/xiaoqu/41022/','building-complex-reference-point')]),
 record('5D023','reference-point','新增公开地图明确店铺荧动电脑诊所位于襄阳南路364号，点位与图书馆364弄附近相合；采用364号门址参考，未核定住宅内部或店铺持续经营状态。',[
  gcj('襄阳南路364号（荧动电脑诊所门址）',121.457784,31.207706,'residential/sources/map360-xiangyang-364.html',webUrl('9947a663a9975d39'))]),
 record('5D038','partial-reference','新增历史街区资料确认相关对象为乌鲁木齐南路180、182号；公开地图取得180号的具体门址参考，邻近178号衡复艺术中心可作位置背景。182号未取得独立点，不把178号艺术中心直接代替两栋。',[
  gcj('乌鲁木齐南路180号门址',121.449245,31.203564,'residential/sources/map360-wulumuqi-180.html',webUrl('95d613db17e22951'))],[],['sources/web-focus-03.txt','sources/map360-hengfu.json']),
 record('5D039','needs-review','新增住宿POI把高安路77号写成77号（77弄），提供号/弄对应线索，但还缺独立建筑或院落范围核验；保留这一具体门址候选，不将单个短租房源位置直接认作保护楼。',[],[
  gcj('高安路77号（77弄）住宿候选',121.446537,31.201436,'residential/sources/map360-gao-an-77.html',webUrl('d012f6d81d473b64'))]),
 record('5D061','partial-reference','新增公开地图多个具名房源明确写新乐路34弄2号，其中另有长乐路339弄28号的门址桥接；可记录保护范围内2号门址参考。1、3号及新乐路36号未逐一定位，拒用原34弄76—80号来源点。',[
  gcj('新乐路34弄2号门址',121.456739,31.218452,'residential/sources/map360-xinle-34.html',webUrl('b6f6aaebfc14719e'))]),
 record('5D095','partial-reference','徐汇官方信息变更公告确认本项为格莱勋公寓/光明公寓；新公开地图具名光明公寓并列1224—1230双号，记录这部分沿街门址参考。官方1222—1238号的其余组成范围未逐栋核定。',[
  gcj('光明公寓1224—1230号范围',121.452692,31.214342,'residential/sources/map360-huaihai-1230.html',webUrl('fa25447ec092ae3a'),'building-complex-reference-point')],[],['sources/web-focus-02.txt']),
 record('5D097','partial-reference','太平洋房屋独栋住宅页面明确estateAddress=永嘉路588号，且用longitudeBd/latitudeBd保存百度坐标，得到588号门址来源点。590号仅有地址解析点，尚未完成两栋楼的独立核验，保留为候选。',[
  bd('永嘉路588号住宅门址',121.455564,31.210657,'residential/sources/yongjia588.html','https://www.taiwu.com/zufang/TWZ2026062900210-1.html')],[
  gcj('永嘉路590号地址解析候选',121.449797,31.2050839,'residential/sources/map360-yongjia-590.html','https://m.map.360.cn/?city=上海市&k=永嘉路590号&t=map')]),
 record('5D100','needs-review','新地图两个住宿POI均列陕西南路214号，但位置相差约200米，另有住宅网站仅证实地址未给明确坐标；保留两个候选，不因其中一个与图书馆214弄点接近就选定整项。',[],[
  gcj('道哲公寓陕西南路214号候选',121.458264,31.21811,'residential/sources/map360-shaanxi-214.html',webUrl('62730963b3a89ebf')),
  gcj('闲屋民宿陕西南路214号候选',121.4576,31.219742,'residential/sources/map360-shaanxi-214.html',webUrl('aae2d92bc7415004'))]),
 record('5D103','needs-review','新公开地图多个房源明确写襄阳南路313号或乔家栅楼上，但同号房源点分散且存在明显远点；可补门址与楼上使用线索，尚缺可裁决哪一点对应受保护楼的独立几何，不强行转正。',[],[
  gcj('襄阳南路313号乔家栅楼上候选',121.457953,31.209137,'residential/sources/map360-xiangyang-313.html',webUrl('d78a871d117fe417')),
  gcj('襄阳南路313号南院候选',121.458161,31.208727,'residential/sources/map360-xiangyang-313.html',webUrl('e5bd837056e2feee')),
  gcj('襄阳南路313号另一远点（暂不采用）',121.458147,31.20555,'residential/sources/map360-xiangyang-313.html',webUrl('d54bc1113f54083d'))]),
 record('3D031','reference-point','新增明确的安亭路130号地址解析点与安亭路132号棉花酒吧门址点，分别记录两个官方门址位置；不再沿用只覆盖126、130号的西子缘宾馆范围。两点均作现代门址参考，未测绘老住宅轮廓。',[
  gcj('安亭路130号门址解析点',121.447921,31.2018411,'residential/sources/map360-anting-130.html','https://m.map.360.cn/?city=上海市&k=安亭路130号&t=map'),
  gcj('安亭路132号门址（棉花酒吧）',121.447926,31.20163,'residential/sources/map360-anting-132.html',webUrl('8a9e12e67c8b0dfa'))]),
 record('4M012','needs-review','新精确查询仍只返回愚园路749弄入口，未返回65号。政府采购资料及建筑记录继续支持749弄65号，图书馆745弄65号差异未闭合；不把弄口点当作深处住宅楼。',[],[
  gcj('愚园路749弄入口（不是65号楼）',121.434804,31.2202547,'residential/sources/map360-yuyuan-65.html','https://m.map.360.cn/?city=上海市&k=愚园路749弄65号&t=map')]),
]
await fs.writeFile(path.join(dir,'proposals.json'),JSON.stringify({date:'2026-10-31',coordinatePolicy:'360坐标系为独立控制点对照推断GCJ-02；并非来源页面明示。独立百度字段按BD-09转换。',records},null,2)+'\n')
console.log(JSON.stringify({records:records.length,statusCounts:Object.fromEntries([...new Set(records.map(r=>r.status))].map(s=>[s,records.filter(r=>r.status===s).length]))},null,2))
