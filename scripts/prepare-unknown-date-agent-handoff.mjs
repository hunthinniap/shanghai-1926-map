import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import * as OpenCC from 'opencc-js'
import AdmZip from 'adm-zip'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const relative='research/agent-handoff/2026-11-02-unknown-dates'
const output=path.join(root,relative)
const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'))
const hash=value=>createHash('sha256').update(value).digest('hex')
const write=async(file,value)=>fs.writeFile(path.join(output,file),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n')
try{await fs.access(path.join(output,'manifest.json'));throw new Error('A completed handoff already exists; preserve that snapshot and returned research.')}catch(error){if(error.code!=='ENOENT')throw error}
await fs.mkdir(path.join(output,'batches'),{recursive:true})
await fs.mkdir(path.join(output,'templates'),{recursive:true})
await fs.mkdir(path.join(output,'prompts'),{recursive:true})
const inventoryFile='research/rechecks/2026-11-01-shtong-unknown-dates/inventory-for-agent-handoff.json'
const inventoryBytes=await fs.readFile(path.join(root,inventoryFile))
const inventory=JSON.parse(inventoryBytes)
const previous=await read('research/rechecks/2026-11-02-shtong-full-date-search/review-queue.json')
const coverage=new Map(previous.records.map(row=>[row.key,row]))
const heritage=await read('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson')
const byOfficial=new Map(heritage.features.map(feature=>[feature.properties.officialId,feature.properties]))
const virtual=await read('scripts/data/virtual-shanghai-buildings-live.json')
const byRecord=new Map(virtual.records.map(record=>[record.id,record]))
const cn=OpenCC.Converter({from:'tw',to:'cn'})
const normalize=value=>cn(String(value??'')).replace(/\s+/g,' ').trim()
const generic=/^(?:住宅|花园住宅|公寓|小学校|小学|中学|中学校|学校|幼稚园|医院|银行|商店|教堂|礼拜堂|工厂|兵营|难民营|难民收容所|办公楼|花园|公园|墓地|公墓|球场|网球场|宿舍|仓库|住宅区|宅|住宅群|里弄住宅|浴室|里弄|小学及幼稚园|Apartments?|Residence|School|Hospital|Factory|Bank|Offices?|Primary School|Junior High School|Military Camp)$/i
const parent=new Map()
const find=x=>{if(!parent.has(x))parent.set(x,x);if(parent.get(x)!==x)parent.set(x,find(parent.get(x)));return parent.get(x)}
const union=(a,b)=>parent.set(find(b),find(a))
const anchors=row=>row.cards.map(card=>card.officialId?`heritage:${card.officialId}`:`landmark:${card.featureId}`)
for(const row of inventory.records){const keys=anchors(row);keys.forEach(find);keys.slice(1).forEach(key=>union(keys[0],key))}
const groups=new Map()
const dateTypes={
  '建造年代':['construction','completion','reconstruction','alteration'],
  '名录公布时名称':['move_in','rename','documented_use'],
  '名录原名称':['historical_name','documented_use'],
  '史料记录':['documented_use','move_in','rename','opening'],
  '名录记录':['documented_use','historical_name'],
}
const questions={
  '建造年代':'核实该登记范围内具体建筑的建造、竣工或重建年代；分别说明后期加层、改厅和修缮，不能用机构成立年替代。',
  '名录公布时名称':'核实所列单位或名称何时开始用于这个具体门址；可找迁入、改名或该年在此使用的记录，不能用单位成立年或名录公布年替代。',
  '名录原名称':'核实这个原名称在该门址的有据使用年代；名录所谓原名称也可能是后期用途，不必然是建造时名称。',
  '史料记录':'为这个原始史料条目寻找独立的有据用址年代；区分机构前身、同名异址及新旧楼栋，说明是启用、迁入、改名还是某年观察记录。',
  '名录记录':'查明该登记建筑的历史名称与用址年代，不能仅凭名录发布时间补年。',
}
const cautions=row=>{
 const out=['现有卡片关联仅用于分派和查资料，不是同栋、同址沿用或新旧门牌转换的新增证据。','现有查询命中和摘要均未逐条核实；须阅读完整来源并核对该条目门牌。']
 if(/[\n/、&]|；/.test(row.name))out.push('名称含多个单位或组成部分：分别提出 findings；不可把某一个单位的年份填给整组。')
 if(row.kind==='建造年代')out.push('原年代可能已含区间、设计年或改建信息。可保留范围或多个单体年份，不强行压成单一年份。')
 if(generic.test(normalize(row.name))||row.name.startsWith('Virtual Shanghai'))out.push('名称泛化或缺失；先核身份，只有路名／邻近位置命中时应保留不足，不能选一家同类机构代替。')
 if(row.sourceRecordId===551)out.push('已知疑点：原条目旧4 BUND ROAD与现关联外滩3号卡片须独立复核；买产权年也不一定是首次使用年。')
 if(row.sourceRecordId===581)out.push('同仁医院机构创建与九江路219号临时用址不能混为同一年代。')
 if(row.cards.some(card=>card.code==='1M002'))out.push('勿将附近罗别根花园1956年转用史套给沙逊别墅／龙柏饭店楼栋。')
 return out
}
const tasks=[]
for(const row of inventory.records){
 const old=coverage.get(row.key)
 if(!old)throw new Error(`No saved search coverage for ${row.key}`)
 const sourceRecord=byRecord.get(row.sourceRecordId)
 const identities=row.cards.filter(card=>card.officialId).map(card=>byOfficial.get(card.officialId)).filter(Boolean)
 const identity={source_record_id:row.sourceRecordId??null,
   original_record:sourceRecord?{id:sourceRecord.id,name:sourceRecord.name,name_zh:sourceRecord.nameZh,address:sourceRecord.address,
     start_year:sourceRecord.startYear,end_year:sourceRecord.endYear,url:sourceRecord.sourceUrl,types:sourceRecord.types}:null,
   catalogue_records:identities.map(p=>({official_id:p.officialId,code:p.officialCodeRaw,original_name:p.officialName,listed_name:p.listedName,
     address:p.address,original_construction_text:p.constructionDate,official_source_url:p.officialSourceUrl,wikipedia_url:p.wikipediaUrl,location_source_url:p.sourceUrl})),
   display_cards:row.cards}
 const core={task_id:row.key,event_kind:row.kind,target_name:row.name,record_address:row.address??null,identity}
 const fingerprint=hash(Buffer.from(JSON.stringify(core)))
 const name=normalize(row.name),specific=!generic.test(name)&&!name.startsWith('Virtual Shanghai')&&!/建筑$/.test(name)
 const uniqueLeads=new Map()
 for(const query of old.queries)for(const lead of query.candidates??[]){
   if(!lead.url)continue
   const score=(normalize(lead.title).includes(name)&&specific?10:0)+(lead.book==='上海名建筑志'?2:0)
   const previous=uniqueLeads.get(lead.url)
   if(!previous||score>previous.score)uniqueLeads.set(lead.url,{...lead,score,from_query:query.keyword})
 }
 const allLeads=[...uniqueLeads.values()].sort((a,b)=>b.score-a.score)
 const priority=specific&&allLeads.some(lead=>lead.score>=10)?1:specific||row.kind==='建造年代'?2:3
 const key=find(anchors(row)[0]??row.key)
 const groupId='date-group-'+hash(Buffer.from(key)).slice(0,12)
 const task={...core,task_fingerprint:fingerprint,dispatch_group_id:groupId,priority,
   research_question:questions[row.kind]??questions['史料记录'],date_types_to_check:dateTypes[row.kind]??['documented_use'],
   original_event_note:row.description??null,original_event_url:row.url??null,
   suggested_queries:[...new Set([name,...old.queries.map(query=>query.keyword),...(old.supplementaryStreetQueries??[]).map(query=>query.keyword)])].filter(Boolean),
   previous_search:{status:old.reviewStatus,queries:old.queries.map(query=>({id:query.id,keyword:query.keyword,total_hits:query.count,
     retained_results:query.returned,additional_results_not_reviewed:query.additionalResultsNotYetReviewed})),
     street_context_queries:(old.supplementaryStreetQueries??[]).map(query=>({keyword:query.keyword,scope:'street-context-only'})),
     candidate_count_retained_in_archive:allLeads.length,candidates_included:Math.min(3,allLeads.length)},
   leads:allLeads.slice(0,3).map(({score,...lead})=>({...lead,excerpt:lead.excerpt?.slice(0,240),verified:false,
     alternate_url:lead.url.startsWith('https://www.shtong.gov.cn/')?lead.url.replace('https://www.shtong.gov.cn/','https://szfz.shtong.gov.cn/'):undefined})),
   cautions:cautions(row)}
 tasks.push(task)
 const group=groups.get(groupId)??{group_id:groupId,priority,scope:'dispatch-only-not-a-building-identity-conclusion',tasks:[]}
 group.priority=Math.min(group.priority,priority);group.tasks.push(task);groups.set(groupId,group)
}
if(new Set(tasks.map(task=>task.task_id)).size!==inventory.total)throw new Error('Duplicate event IDs')
const ordered=[...groups.values()].sort((a,b)=>a.priority-b.priority||a.tasks[0].target_name.localeCompare(b.tasks[0].target_name,'zh-CN'))
const batches=[];let current=[];let size=0
for(const group of ordered){if(size&&size+group.tasks.length>50){batches.push(current);current=[];size=0}current.push(group);size+=group.tasks.length}
if(current.length)batches.push(current)
const prompt=await fs.readFile(path.join(root,'scripts/templates/unknown-date-agent-prompt.md'),'utf8')
const schema=JSON.parse(await fs.readFile(path.join(root,'scripts/templates/unknown-date-agent-result.schema.json'),'utf8'))
const metadata={schema_version:1,snapshot_id:'shanghai-unknown-dates-2026-11-02',prepared_on:'2026-11-02',
  scope:'Remaining undated events in current all-years map cards; event counts are not building counts. Only research and report. No direct map edits.',
  inventory_source:inventoryFile,inventory_sha256:hash(inventoryBytes),total_events:tasks.length,total_dispatch_groups:groups.size,
  database_entry:'https://szfz.shtong.gov.cn/difangzhi-front/book/index?oneId=1'}
await write('all-tasks.json',{...metadata,groups:ordered})
await write('PROMPT.md',prompt)
await write('result-schema.json',schema)
const manifest=[]
for(let index=0;index<batches.length;index++){
 const batchId=`date-agent-${String(index+1).padStart(3,'0')}`
 const selected=batches[index],selectedTasks=selected.flatMap(group=>group.tasks)
 const content={...metadata,batch_id:batchId,batch_event_count:selectedTasks.length,batch_group_count:selected.length,
   result_schema:'result-schema.json',groups:selected}
 const bytes=Buffer.from(JSON.stringify(content,null,2)+'\n'),sha256=hash(bytes)
 const file=`batches/${batchId}.json`,promptFile=`prompts/${batchId}.md`,templateFile=`templates/${batchId}.result.json`
 await fs.writeFile(path.join(output,file),bytes)
 await write(promptFile,`本次分配：${batchId}。输入文件：${batchId}.json；共${selectedTasks.length}条事件，${selected.length}组。\n输入文件SHA-256：${sha256}\n请逐项返回结果，输出文件名：${batchId}.result.json。\n\n${prompt}`)
 await write(templateFile,{schema_version:1,snapshot_id:metadata.snapshot_id,batch_id:batchId,input_sha256:sha256,
   researcher:'',completed_on:null,results:selectedTasks.map(task=>({task_id:task.task_id,task_fingerprint:task.task_fingerprint,
     status:'not_researched',summary:'模板占位：尚未检索。',recommended_action:'retain_unknown',findings:[],sources:[],searches:[],remaining_questions:[]}))})
 manifest.push({batch_id:batchId,input_file:file,prompt_file:promptFile,result_template:templateFile,sha256,
   events:selectedTasks.length,groups:selected.length,priority_range:[Math.min(...selectedTasks.map(task=>task.priority)),Math.max(...selectedTasks.map(task=>task.priority))],
   sample_names:selectedTasks.slice(0,4).map(task=>task.target_name),task_ids:selectedTasks.map(task=>task.task_id),group_ids:selected.map(group=>group.group_id)})
}
await write('manifest.json',{...metadata,batch_count:manifest.length,batches:manifest})
const validator=await fs.readFile(path.join(root,'scripts/templates/validate-unknown-date-agent-result.mjs'),'utf8')
await write('validate-results.mjs',validator)
const first=manifest[0]
await write('README.md',`# 交给外部 agent 的年代检索包\n\n快照：2026年11月2日。共 **${tasks.length} 条未解决时间线事件、${groups.size} 组派发对象，${manifest.length} 个独立分包**。每包不超过50条事件，同一组不拆到多个包。分组仅为避免重复调查，不代表同栋或同址身份已经核定。\n\n## 最快用法\n\n把一个分包的 JSON 和同编号 prompt 发给一个 agent。例如：\n\n- 输入：\`${first.input_file}\`\n- 指令：\`${first.prompt_file}\`\n- 回传：\`${first.batch_id}.result.json\`，可从 \`${first.result_template}\` 起填。\n\n不同 agent 领不同编号；一个 agent 可以依次处理多个包。优先级1的包排在前面；\`manifest.json\`列出每包名称样例及任务ID。\n\n## 文件\n\n- \`all-tasks.json\`：全量主清单。\n- \`batches/\`：可独立上传的分包，含身份原字段、待核问题、既有检索、最多3个未核候选。\n- \`prompts/\`：已写好分包编号、事件数及回传文件名的指令。\n- \`PROMPT.md\`：通用指令，含公开数据库检索及全文读取方式。\n- \`templates/\`：逐事件回传模板，全部初始状态为not_researched。\n- \`result-schema.json\`：回传结构约定。\n- \`validate-results.mjs\`：只检查回传结构、ID、输入指纹及证据字段，不验证史实。\n\n分包可在不读取项目代码的情况下独立调查。候选摘要仅为线索，完整查询响应仍保存在项目\`research/rechecks/2026-11-02-shtong-full-date-search/\`中；不共享该文件夹也可以根据分包内链接重新打开来源。\n\n## 回传检查\n\n在本包根目录运行：\n\n\`\`\`powershell\nnode validate-results.mjs batches/${first.batch_id}.json returned/${first.batch_id}.result.json\n\`\`\`\n\n返回格式检查通过不代表年代已确认，不会自动改地图。拿到各agent的结果后再逐条对照证据回填。\n\n本包只含当前仍无年份的事件；此前已补入的日期已排除。无专名、同名异址、机构成立与具体门址迁入不一致、复杂楼栋和年代区间均须如实保留不确定性。\n`)
const zip=new AdmZip()
zip.addLocalFolder(output,'unknown-date-handoff')
const archive=path.join(root,'research/agent-handoff/2026-11-02-unknown-dates.zip')
zip.writeZip(archive)
console.log(JSON.stringify({directory:relative,archive:path.relative(root,archive),events:tasks.length,groups:groups.size,batches:manifest.length,
  firstBatch:{input:first.input_file,prompt:first.prompt_file,events:first.events},archiveBytes:(await fs.stat(archive)).size},null,2))
