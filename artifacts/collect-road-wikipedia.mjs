import fs from 'node:fs/promises'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {createHash} from 'node:crypto'
const run=promisify(execFile), dir='research/road-histories/2026-11-04'
await fs.mkdir(dir+'/raw',{recursive:true})
const data=JSON.parse(await fs.readFile('public/data/historical-features.geojson','utf8'))
const names=[...new Set(data.features.filter(f=>f.properties.kind==='road').map(f=>f.properties.modernNameZh).filter(n=>/\p{Script=Han}/u.test(n)&&!/[0-9X（(]/.test(n)))];
const pages=[],sources=[]
for(let offset=0;offset<names.length;offset+=30){
 const titles=names.slice(offset,offset+30), file=`${dir}/raw/${offset}.json`
 let text
 try{text=await fs.readFile(file,'utf8')}catch{
  const u=new URL('https://zh.wikipedia.org/w/api.php');for(const [k,v]of Object.entries({action:'query',format:'json',formatversion:'2',redirects:'1',prop:'revisions',rvslots:'main',rvprop:'ids|timestamp|content',titles:titles.join('|')}))u.searchParams.set(k,v)
  const ps="$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); (Invoke-WebRequest -Uri '"+u.href+"' -UseBasicParsing -TimeoutSec 35).Content"
  try{text=(await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],{maxBuffer:32*1024*1024,timeout:45000})).stdout;JSON.parse(text);await fs.writeFile(file,text)}catch(e){sources.push({titles,error:e.message.slice(0,150)});continue}
 }
 const d=JSON.parse(text);sources.push({titles,file,sha256:createHash('sha256').update(text).digest('hex')});
 for(const p of d.query?.pages||[])pages.push({...p,requestedTitles:titles,redirects:d.query.redirects||[],normalized:d.query.normalized||[]})
 console.log(`${offset+titles.length}/${names.length}`)
 await fs.writeFile(dir+'/inventory.json',JSON.stringify({requested:names,sources,pages},null,2))
}
console.log(JSON.stringify({requested:names.length,collected:pages.filter(p=>!p.missing).length,missing:pages.filter(p=>p.missing).length}))
