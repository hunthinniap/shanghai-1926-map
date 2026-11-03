import fs from 'node:fs/promises'
import path from 'node:path'
import https from 'node:https'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { HttpsProxyAgent } from 'https-proxy-agent'
const dir=path.dirname(fileURLToPath(import.meta.url))
const [id,value]=process.argv.slice(2)
if(!/^[a-z0-9-]+$/.test(id??''))throw new Error('Invalid source id')
const url=new URL(value)
if(url.protocol!=='https:'||url.username||url.password)throw new Error('Only public HTTPS')
const agent=new HttpsProxyAgent('http://127.0.0.1:7897')
const response=await new Promise((resolve,reject)=>{
const req=https.get(url,{agent,headers:{'User-Agent':'ShanghaiHeritageCoordinateResearch/1.0'},timeout:20000},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,bytes:Buffer.concat(chunks)}));res.on('error',reject)})
const total=setTimeout(()=>req.destroy(new Error('Total request timeout')),25000)
req.on('close',()=>clearTimeout(total));req.on('timeout',()=>req.destroy(new Error('Request timeout')));req.on('error',reject)
})
await fs.mkdir(path.join(dir,'sources'),{recursive:true})
await fs.writeFile(path.join(dir,`sources/${id}.html`),response.bytes)
await fs.writeFile(path.join(dir,`sources/${id}.source.json`),JSON.stringify({id,url:url.href,retrievedAt:new Date().toISOString(),status:response.status,file:`sources/${id}.html`,sha256:createHash('sha256').update(response.bytes).digest('hex'),contentType:response.headers['content-type'],location:response.headers.location},null,2)+'\n')
const s=response.bytes.toString('utf8')
console.log(JSON.stringify({id,status:response.status,size:response.bytes.length,location:response.headers.location,coordinates:[...s.matchAll(/.{0,90}(?:121\.\d{3,}|31\.\d{3,}|\x22longitude\x22|\x22latitude\x22|coord_type|coordType|BMap|AMap|TMap).{0,110}/g)].slice(0,25).map(m=>m[0])},null,2))
