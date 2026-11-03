// Read-only public HTTP research; writes snapshots only inside this research folder.
import fs from 'node:fs/promises'
import path from 'node:path'
import https from 'node:https'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { HttpsProxyAgent } from 'https-proxy-agent'
const dir = path.dirname(fileURLToPath(import.meta.url))
const [label,urlText] = process.argv.slice(2)
if(!/^[a-z0-9-]+$/.test(label??'')) throw new Error('Invalid source label')
const url = new URL(urlText)
if(url.protocol!=='https:' || !['api.openstreetmap.org','overpass-api.de','overpass.kumi.systems','zh.wikipedia.org','www.wikidata.org','data.library.sh.cn','www.supdri.com','m.map.360.cn','artguide.artforum.com'].includes(url.hostname)) throw new Error('Not an allowed public research source')
const agent=new HttpsProxyAgent('http://127.0.0.1:7897')
const response = await new Promise((resolve,reject)=>{
 const req=https.get(url,{agent,headers:{'User-Agent':'ShanghaiHistoricMapCoordinateResearch/1.0 (read-only research)','Accept':'application/json'},timeout:55000},res=>{
   const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,contentType:res.headers['content-type'],bytes:Buffer.concat(chunks)}));res.on('error',reject)
 });req.on('timeout',()=>req.destroy(new Error('HTTP request timed out')));req.on('error',reject)
})
await fs.mkdir(path.join(dir,'sources'),{recursive:true})
const file=`sources/${label}.json`
await fs.writeFile(path.join(dir,file),response.bytes)
const entry={id:label,url:url.href,retrievedAt:new Date().toISOString(),httpStatus:response.status,contentType:response.contentType,file,byteLength:response.bytes.length,sha256:createHash('sha256').update(response.bytes).digest('hex')}
await fs.writeFile(path.join(dir,`sources/${label}.source.json`),JSON.stringify(entry,null,2)+'\n')
let parsed;try{parsed=JSON.parse(response.bytes)}catch{}
console.log(JSON.stringify({...entry,elements:parsed?.elements?.length,remark:parsed?.remark},null,2))
if(response.status!==200)process.exitCode=1
