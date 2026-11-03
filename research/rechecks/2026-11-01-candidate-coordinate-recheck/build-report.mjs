import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../..'),check=process.argv.includes('--check')
const previousPath='research/rechecks/2026-10-30-heritage-missing-coordinates/coordinate-review.json'
const previousBytes=await fs.readFile(path.join(root,previousPath)),previous=JSON.parse(previousBytes)
const sha=b=>createHash('sha256').update(b).digest('hex')
const decisions={
 '2B008':{files:['search-01.json','yanan955-1.raw'],finding:'精确查955弄1号，返回“延安中路1号分店”，但地址只写955弄小区；另一个机构在55-1号。分店编号不能作为1号门牌证据，均不足以确认保护的1—11号。',need:'保护号段内明确门牌的楼栋图或独立POI。'},
 '2G001':{files:['search-06.json'],finding:'杨浦官方清单继续限定2800号铁皮车间；文物部门出品的口述史说明铁皮车间就是汽机房，且厂内尚有办公楼、水滤房等多幢遗存。身份别名得到支持，未获汽机房单体坐标，整厂点仍不能替代。',need:'标明汽机房的厂区平面图及可配准控制点，或具名楼体几何。'},
 '4F028':{files:['search-01.json','changyang15.raw'],finding:'再次精确查50弄15号，公开地图无POI结果，只回退至长阳路50弄（type=3、无实体ID）；修缮检索仍指15—31号范围。没有缩小到保护子范围。',need:'15—31号楼栋分布、门牌点或保护范围附图。'},
 '4G001':{files:['search-06.json','fangsan-special.raw','fangsan-fang.raw'],finding:'官方清单确认纺三小区在227弄；精确查227弄特号仍无POI，只回退至整弄。环保报告另列纺三小区经纬度，但对象是环境敏感目标，坐标系和保护楼栋未声明；不能用来裁决旧图书馆230弄差异。',need:'227弄特号或保护号段内楼栋的独立位置，及227／230弄关系说明。'},
 '4M012':{files:['search-05.json','cn-museum.raw','zhou-fohai.raw'],finding:'长宁区革命文物陈列馆的分组名单直接将周佛海旧居列为749弄65号，支持官方门牌；公开地图按别名搜索却回传其他旧居，未取得65号实体。旧目录745弄65号与749弄入口两候选仍未闭合。',need:'65号住宅独立门牌点／轮廓，或旧目录地址勘误。'},
 '5D039':{files:['search-07.json','gaoan77.raw'],finding:'地图重复取得同一个短租POI，地址写77号（77弄），精确地址聚合也复用这一坐标；这不是两个独立来源。仍缺把此点与1924年保护住宅对应的建筑／院落证据。',need:'77号与77弄的权威桥接及具体保护住宅位置。'},
 '5D100':{files:['search-06.json','open-02.json','shaanxi214.raw'],finding:'纪实人文频道原发图文明确214号是一幢带小花园的独栋洋房，但没有坐标。公开地图同号两个民宿点仍相差约190米；地址聚合复用其中一个民宿点，不能用作独立裁决。',need:'带门牌的建筑位置或第二个独立位置来源，以排除同号房源误标。'},
 '5D103':{files:['search-02.json','xiangyang313.raw','xiangyang-lianjia.raw'],finding:'官方监测采购清单列313号一处住宅；地图仍有“南院”“慎成里”“乔家栅楼上”等不同房源点，最远相隔约400米。房产介绍可以确认地址存在，未给足以裁决的独立坐标。',need:'313号被保护的单体楼栋位置，不能只按住宿房源选点。'},
 '5W046':{files:['search-03.json','open-02.json'],finding:'重新读取浦东2024年10月25日原公示，措辞仍为拟迁至唐镇G13-0101-1地块绿地。追加完成／验收检索未取得可核实的竣工迁移证据；不能把规划目标地块当作已迁现址。',need:'迁移实施完成或验收记录、新址门牌／平面图及源坐标。'},
 '5X003':{files:['search-01.json','search-03.json','search-04.json'],finding:'用练塘、109、110号及完整保护门牌再次检索，取得的仍是官方名录，未发现将图书馆111号与109、110号解释为同一保护住宅的独立证据，也未取得新门址点。',need:'109／110号门牌位置或111号换号、同院关系证据。'},
 '5X004':{files:['search-03.json','open-03.json'],finding:'青浦原公布名录再次明确练塘下塘街街廊在44弄19—33号，与保护项范围相交。身份关系成立，但未取得该街廊单体几何；原Commons摄影站位仍不能升级成保护住宅／廊棚点。',need:'街廊楼体或至少一个受保护门牌的位置，而非摄影者站位。'},
 '5X005':{files:['search-01.json','search-03.json'],finding:'朱家角景区官网同号另列“东湖街209弄水桥”，对象为水桥而非本项住宅；不能因同门牌名称就合并。两处相差约600米的旧候选仍缺独立住宅几何裁决。',need:'209弄保护住宅的明确楼栋／门牌位置；区分同号水桥。'},
 '5X012':{files:['search-04.json','xuejia.raw'],finding:'青浦官方名录将369号命名为薛家宅，修缮采购线索也指此址；精确按白鹤镇薛家宅搜索仍回传嘉定、浦东等同名村点，均排除。图书馆344号与369号尚无换号桥接。',need:'修缮工程附图／现场门牌定位，或344／369号关系证据。'},
}
const targets=previous.records.filter(r=>r.status==='needs-review')
if(targets.length!==13||targets.some(r=>!decisions[r.code])||Object.keys(decisions).length!==13)throw new Error('Expected exactly the original 13 candidates')
const records=targets.map(r=>({officialId:r.officialId,code:r.code,name:r.name,address:r.officialAddress,previousStatus:r.status,status:'needs-review',
 previousCandidateCount:r.candidates.length,acceptedPoints:[],finding:decisions[r.code].finding,evidenceNeeded:decisions[r.code].need,
 newEvidenceFiles:decisions[r.code].files.map(f=>'sources/'+f),previousEvidence:r.evidenceFiles,previousSourceUrls:r.sourceUrls}))
const sourceFiles=(await fs.readdir(path.join(dir,'sources'))).sort()
const sources=[]
for(const file of sourceFiles){const b=await fs.readFile(path.join(dir,'sources',file));sources.push({file:'sources/'+file,byteLength:b.length,sha256:sha(b)})}
for(const record of records)for(const file of record.newEvidenceFiles)if(!sources.some(s=>s.file===file))throw new Error('Missing evidence '+file)
for(const file of sourceFiles.filter(f=>f.endsWith('.meta.json'))){const m=JSON.parse(await fs.readFile(path.join(dir,'sources',file),'utf8')),b=await fs.readFile(path.join(dir,m.file));if(m.status!==200||b.length!==m.byteLength||sha(b)!==m.sha256)throw new Error('Source checksum mismatch '+file)}
const mapBytes=await fs.readFile(path.join(root,'public/data/shanghai-excellent-historical-buildings/map-buildings.geojson')),map=JSON.parse(mapBytes)
if(map.features.length!==1044||records.some(r=>map.features.some(f=>f.properties.officialId===r.officialId)))throw new Error('Unexpected map candidate import')
const result={schemaVersion:1,reviewDate:'2026-11-01',previousReport:previousPath,previousReportSha256:sha(previousBytes),
 coverage:{targetCandidates:13,rechecked:records.length,newlyAccepted:0,stillNeedsReview:13,sourceSnapshots:sources.length,productionMapRecords:1044,productionMapChangedByThisRecheck:false},
 method:'逐条复读原候选、保护门牌与范围；新检索官方／机构资料和独立公开地图。地址聚合与其复用的POI不计两个独立来源，分店编号不当门牌，规划迁移不当迁移完成，同号水桥不当住宅。',
 productionMapSha256:sha(mapBytes),records,
 additionalNoCoordinateRecord:{code:'5W035',status:'no-coordinate',finding:'额外复查下沙街西段452号，仍仅获规划地址，无该住宅坐标。',evidence:['sources/search-04.json']}}
let md='# 13条候选坐标再核查\n\n复查日期：2026年11月1日。13条逐项复核完成，本轮**0条晋级，13条继续待核**。这是证据不足的定位结论，不表示建筑不存在。\n\n'
md+='此前获准的50条有来源参考点和16条部分定位已回填，历史建筑图层现为**1044／1058条**。本轮没有把剩余候选加入地图；另1条下沙住宅仍无可用坐标。\n\n'
md+='新增依据包括长宁区革命文物陈列馆对749弄65号的命名、纪实人文频道对陕西南路214号独栋洋房的记录、青浦街廊名录和东湖街同号水桥清单。它们改善身份说明，尚未给出可裁决的保护楼栋位置。\n\n'
md+='| 编号 | 官方地址 | 再核查结论 | 尚缺的证据 |\n|---|---|---|---|\n'
for(const r of records)md+=`| ${r.code} | ${r.address} | ${r.finding} | ${r.evidenceNeeded} |\n`
md+='\n[逐条JSON与证据文件](results.json) · [来源哈希清单](source-manifest.json) · [公开地图原字段](map360-candidates.json)\n\n'
md+='主要原文：[长宁区革命文物陈列馆](https://changning.museum.chaoxing.com/265/1568.html)、[纪实人文频道](https://m.thepaper.cn/newsDetail_forward_24280585)、[小湾迁移公示](https://www.pudong.gov.cn/zwgk/14483.gkml_zhzw_ghjh/2024/299/333473.html)、[青浦文保点原名录](https://www.shqp.gov.cn/tv/wlzwgk/ml/qt/20190829/556356.html)、[朱家角景区文物清单](https://www.zhujiajiao.com/cn/culture/cultural_relic/)。检索结果、成功网页快照及读取失败分别保存，不把网页读取失败解释为无此建筑。\n\n'
md+='复现：先运行 `extract-map360.mjs` 解析已保存原件，再运行 `build-report.mjs --check`。`fetch-sources.mjs` 只负责公开来源抓取，默认复用已有快照。原获准研究JSON和其来源清单保持冻结。\n'
const outputs={'results.json':JSON.stringify(result,null,2)+'\n','source-manifest.json':JSON.stringify({reviewDate:result.reviewDate,files:sources},null,2)+'\n','README.md':md}
for(const [file,text]of Object.entries(outputs)){if(check){if(await fs.readFile(path.join(dir,file),'utf8')!==text)throw new Error('Output drift '+file)}else await fs.writeFile(path.join(dir,file),text)}
console.log(JSON.stringify({...result.coverage,checked:check}))
