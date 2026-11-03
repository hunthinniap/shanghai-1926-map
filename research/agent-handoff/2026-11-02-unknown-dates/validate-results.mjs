import fs from 'node:fs/promises'
import {createHash} from 'node:crypto'

const [inputPath,resultPath]=process.argv.slice(2)
if(!inputPath||!resultPath)throw new Error('Usage: node validate-results.mjs INPUT_BATCH.json RETURNED_RESULT.json')
const bytes=await fs.readFile(inputPath),input=JSON.parse(bytes),result=JSON.parse(await fs.readFile(resultPath,'utf8'))
const expected=new Map(input.groups.flatMap(group=>group.tasks).map(task=>[task.task_id,task]))
const errors=[],warnings=[],seen=new Set()
const fail=message=>errors.push(message)
const string=(value)=>typeof value==='string'&&value.trim().length>0
const statuses=new Set(['verified','range_only','partial','candidate','conflict','not_found','insufficient_identity','access_blocked','not_researched'])
const actions=new Set(['add_dated_use_event','set_construction_date','add_range_note','retain_unknown'])
if(result.schema_version!==1||result.snapshot_id!==input.snapshot_id||result.batch_id!==input.batch_id)fail('Wrong schema, snapshot or batch ID')
if(result.input_sha256!==createHash('sha256').update(bytes).digest('hex'))fail('Input SHA-256 mismatch')
if(!Array.isArray(result.results))fail('results must be an array')
for(const row of result.results??[]){
 const prefix=row.task_id??'<missing-id>',task=expected.get(row.task_id)
 if(!task)fail(`${prefix}: unknown or out-of-batch task ID`)
 if(seen.has(row.task_id))fail(`${prefix}: duplicate result`)
 seen.add(row.task_id)
 if(task&&row.task_fingerprint!==task.task_fingerprint)fail(`${prefix}: task fingerprint mismatch`)
 if(!statuses.has(row.status)||!actions.has(row.recommended_action)||!string(row.summary))fail(`${prefix}: invalid status, action or summary`)
 for(const field of ['findings','sources','searches','remaining_questions'])if(!Array.isArray(row[field]))fail(`${prefix}: ${field} must be an array`)
 const sources=new Map()
 for(const source of row.sources??[]){
  if(sources.has(source.source_id))fail(`${prefix}: duplicate source ID`)
  sources.set(source.source_id,source)
  for(const field of ['source_id','title','url','accessed_on','supports'])if(!string(source[field]))fail(`${prefix}: missing source.${field}`)
  if(!/^https?:\/\//.test(source.url??'')||typeof source.read_full_text!=='boolean')fail(`${prefix}: invalid source URL or full-text flag`)
 }
 for(const finding of row.findings??[]){
  if(!string(finding.name)||!string(finding.address)||!string(finding.identity_evidence)||!string(finding.date?.text))fail(`${prefix}: incomplete finding identity or date`)
  if(!Array.isArray(finding.source_ids)||!finding.source_ids.length||finding.source_ids.some(id=>!sources.has(id)))fail(`${prefix}: finding references missing source IDs`)
  for(const field of ['year','end_year'])if(finding.date?.[field]!==null&&(!Number.isInteger(finding.date?.[field])||finding.date[field]<1000||finding.date[field]>2100))fail(`${prefix}: invalid date.${field}`)
  if(finding.date?.end_year!==null&&finding.date?.year!==null&&finding.date.end_year<finding.date.year)fail(`${prefix}: reversed date range`)
  if(row.status==='verified'){
   if(['institution_only','unverified'].includes(finding.identity_scope)||finding.address_match==='not_established')fail(`${prefix}: verified claim lacks site identity`)
   if(!(finding.source_ids??[]).some(id=>sources.get(id)?.read_full_text===true))fail(`${prefix}: verified claim lacks a full-text source`)
   if(['construction','completion','reconstruction','alteration'].includes(finding.date_type)&&!['same_building','building_component'].includes(finding.identity_scope))fail(`${prefix}: construction claim is not scoped to the building`)
  }
 }
 if(row.status==='verified'&&!(row.findings?.length))fail(`${prefix}: verified result has no finding`)
 if(row.status!=='not_researched'&&!(row.searches?.length))fail(`${prefix}: researched result has no search log`)
 if(row.status==='not_researched')warnings.push(`${prefix}: not researched`)
}
for(const id of expected.keys())if(!seen.has(id))fail(`${id}: missing result`)
const counts={};for(const row of result.results??[])counts[row.status]=(counts[row.status]??0)+1
const report={format_and_id_checks_passed:errors.length===0,all_tasks_have_research_status:errors.length===0&&!warnings.length,
 expected_events:expected.size,returned_events:result.results?.length??0,status_counts:counts,errors,warnings,
 note:'These are structural and evidence-field checks, not historical fact verification or permission to update the map.'}
console.log(JSON.stringify(report,null,2))
if(errors.length)process.exitCode=1
