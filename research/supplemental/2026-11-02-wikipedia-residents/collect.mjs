import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))
const run = promisify(execFile)
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const stringify = value => JSON.stringify(value, null, 2) + '\n'
const queue = JSON.parse(await fs.readFile(path.join(directory, 'queue.json'), 'utf8'))
const check = process.argv.includes('--check')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const keyword = /居住|住在|住[于於]|寓居|寓所|旧居|舊居|故居|迁居|遷居|入住|居所|居宅|住宅|住[过過]|住[户戶]|居民|租住|寓[沪滬]|寓邸|居[沪滬]|定居|旅居|下榻|住[进進]|曾[住居]|[住居]此|[迁遷]入|搬入|搬[进進]|卜居|客居|寄寓|居留|寓此|私宅|私邸|府邸|住所|家住|租居|居[于於]|公[馆館]|家宅|安家|栖身/u

// A reading aid only. The full source is retained and claims require manual review.
function readableText(wikitext) {
  return wikitext.replace(/<!--[\s\S]*?-->/gu, '')
    .replace(/<ref\b[^>]*\/\s*>/gu, '').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gu, '')
    .replace(/\[\[(?:File|Image|文件|檔案|图像|圖像|Category|分类|分類):[^\n]*?\]\]/giu, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/gu, '$2').replace(/\[\[([^\]]+)\]\]/gu, '$1')
    .replace(/\[(https?:\/\/\S+)(?:\s+([^\]]+))?\]/gu, (_, url, label) => label || url)
    .replace(/'{2,5}/gu, '').replace(/<\/?(?:small|big|span|br|div|center|nowiki)\b[^>]*>/gu, '')
    .replace(/\n{3,}/gu, '\n\n').trim()
}

await fs.mkdir(path.join(directory, 'raw'), { recursive: true })
await fs.mkdir(path.join(directory, 'pages'), { recursive: true })
let previous
try { previous = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8')) } catch (e) { if (e.code !== 'ENOENT') throw e }
const sources = previous?.sources ?? []
const pages = []
const errors = []
let lastRequestAt = 0
const midpoint = Math.floor(queue.pages.length / 2)
const batches = []
for (let offset = 0; offset < midpoint; offset += 20) {
  batches.push({ key: `a-${String(offset).padStart(4, '0')}`, indices: Array.from({length: Math.min(20, midpoint - offset)}, (_, n) => offset + n) })
  const start = midpoint + offset
  if (start < queue.pages.length) batches.push({ key: `b-${String(start).padStart(4, '0')}`, indices: Array.from({length: Math.min(20, queue.pages.length - start)}, (_, n) => start + n) })
}
const manifest = () => ({ schemaVersion: 1, reviewedOn: queue.reviewedOn, queueSha256: queueHash,
  scope: queue.scope, policy: { maxTitlesPerRequest:20, maxConcurrentRequests:1, minimumRequestIntervalMs:2200,
    attempts:3, candidateKeywords:keyword.source, textLicense:'CC BY-SA 4.0',
    claimAcceptance:'Manual review only; keyword hits are not residence claims.' },
  coverage: { requested:queue.pages.length, collected:pages.filter(p => p.status==='collected').length,
    missing:pages.filter(p => p.status==='missing').length, failed:pages.filter(p => p.status==='failed').length,
    pagesWithKeywords:pages.filter(p => p.candidateParagraphs.length).length }, sources, pages, errors })
const queueHash = sha256(await fs.readFile(path.join(directory,'queue.json')))
async function save() {
  if (check) return
  await fs.writeFile(path.join(directory, 'manifest.json'), stringify(manifest()))
  await fs.writeFile(path.join(directory, 'candidates.json'), stringify({ reviewedOn:queue.reviewedOn,
    disclaimer:'Unreviewed keyword candidates only; see full page sources before accepting people, periods or identity.',
    pages:pages.filter(p => p.candidateParagraphs.length) }))
}
async function request(batch) {
  const url = new URL('https://zh.wikipedia.org/w/api.php')
  const requestedTitles = batch.indices.map(index => queue.pages[index].title)
  for (const [k,v] of Object.entries({ action:'query',format:'json',formatversion:'2',redirects:'1',
    prop:'revisions',rvslots:'main',rvprop:'ids|timestamp|content',titles:requestedTitles.join('|') })) url.searchParams.set(k,v)
  const cached = sources.find(s => s.requestedUrl===url.href && s.ok)
  if (cached) {
    const bytes = await fs.readFile(path.join(directory,cached.localPath))
    if (sha256(bytes)!==cached.sha256) throw Error(`Snapshot hash mismatch ${cached.localPath}`)
    return { source:cached,data:JSON.parse(bytes) }
  }
  if (check) throw Error(`Missing source batch ${batch.key}`)
  for (let attempt=1; attempt<=3; attempt++) {
    await sleep(Math.max(0,lastRequestAt+2200-Date.now()))
    lastRequestAt=Date.now()
    const localPath=`raw/${batch.key}-${attempt}.json`
    const source={ id:`batch-${batch.key}-${attempt}`,requestedUrl:url.href,requestedTitles,
      retrievedAt:new Date().toISOString(),localPath,ok:false,byteLength:0,sha256:null }
    try {
      const script="$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $r=Invoke-WebRequest -Uri '"+url.href.replaceAll("'","''")+"' -UseBasicParsing -TimeoutSec 45; $r.Content"
      const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{encoding:'utf8',maxBuffer:64*1024*1024,timeout:55000})
      const bytes=Buffer.from(stdout.trimEnd(),'utf8')
      await fs.writeFile(path.join(directory,localPath),bytes)
      source.byteLength=bytes.length; source.sha256=sha256(bytes)
      const data=JSON.parse(bytes.toString('utf8'))
      if (!data.query?.pages || data.error || data.continue) throw Error(`Unexpected API response ${JSON.stringify(data.error??data.continue??data).slice(0,200)}`)
      source.ok=true; sources.push(source)
      return {source,data}
    } catch(e) {
      source.error=String(e.message).slice(0,700); sources.push(source)
      await save()
      if (attempt===3) { errors.push({batch:batch.key,message:source.error}); return {source,data:null} }
      await sleep(/429|Too Many/i.test(source.error)?attempt*30000:attempt*3000)
    }
  }
}

for(const batch of batches) {
  const {source,data}=await request(batch)
  const aliases=new Map((data?.query?.normalized??[]).concat(data?.query?.redirects??[]).map(p=>[p.from,p.to]))
  for(const index of batch.indices) {
    const item=queue.pages[index]
    let title=item.title
    const seen=new Set()
    while(aliases.has(title)&&!seen.has(title)){seen.add(title);title=aliases.get(title)}
    const page=data?.query?.pages.find(p=>p.title===title)
    const revision=page?.revisions?.[0]
    const wikitext=revision?.slots?.main?.content
    const status=!data?'failed':page?.missing?'missing':typeof wikitext==='string'?'collected':'failed'
    if(status==='failed' && data) errors.push({queueIndex:index,title:item.title,message:'Page/revision missing in successful batch'})
    const text=typeof wikitext==='string'?readableText(wikitext):''
    const candidateParagraphs=text.split(/\n\s*\n/u).filter(p=>keyword.test(p))
    const filename=`pages/${String(index).padStart(4,'0')}-${sha256(Buffer.from(item.title)).slice(0,10)}.json`
    const record={queueIndex:index,title:item.title,resolvedTitle:page?.title??title,status,
      screeningStatus:status==='collected'?(candidateParagraphs.length?'keyword-candidate':'no-residence-keywords'):status,
      url:`https://zh.wikipedia.org/wiki/${encodeURIComponent(page?.title??title)}`,
      pageId:page?.pageid??null,revisionId:revision?.revid??null,revisionTimestamp:revision?.timestamp??null,
      revisionUrl:revision?.revid?`https://zh.wikipedia.org/w/index.php?title=${encodeURIComponent(page.title)}&oldid=${revision.revid}`:null,
      sourceId:source.id,sourceLocalPath:source.localPath,localPath:filename,
      places:item.places,candidateParagraphs}
    const full={...record,text,wikitext:wikitext??null}
    const expected=stringify(full)
    if(check) {
      const actual=await fs.readFile(path.join(directory,filename),'utf8')
      if(actual.replaceAll('\r\n','\n')!==expected) throw Error(`Page rendering changed ${filename}`)
    } else await fs.writeFile(path.join(directory,filename),expected)
    pages.push(record)
  }
  await save()
  console.log(JSON.stringify({batch:batch.key,...manifest().coverage}))
}
if(check) {
  if(JSON.stringify(manifest())!==JSON.stringify(previous)) throw Error('Manifest is stale')
  console.log('Verified every raw response hash, page rendering and manifest.')
}
