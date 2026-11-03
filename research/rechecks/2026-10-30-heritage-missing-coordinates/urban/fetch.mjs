import fs from 'node:fs/promises'
import path from 'node:path'
import https from 'node:https'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { HttpsProxyAgent } from 'https-proxy-agent'
const dir=path.dirname(fileURLToPath(import.meta.url))
const [id,address]=process.argv.slice(2)
if(!/^[a-z0-9-]+$/.test(id??''))throw new Error('Invalid ID')
const url=new URL(address)
if(url.protocol!=='https:')throw new Error('HTTPS read-only source required')
const r=await new Promise((resolve,reject)=>{const req=https.get(url,{agent:new HttpsProxyAgent('http://127.0.0.1:7897'),headers:{'User-Agent':'ShanghaiHistoricalMap/1.0 coordinate research','Accept':'*/*'},timeout:35000},res=>{const a=[];res.on('data',b=>a.push(b));res.on('end',()=>resolve({status:res.statusCode,bytes:Buffer.concat(a),type:res.headers['content-type']}));res.on('error',reject)});const timer=setTimeout(()=>req.destroy(new Error('Total timeout')),45000);req.on('close',()=>clearTimeout(timer));req.on('timeout',()=>req.destroy(new Error('Timeout')));req.on('error',reject)})
await fs.mkdir(path.join(dir,'sources'),{recursive:true})
const file=`sources/${id}.raw`
await fs.writeFile(path.join(dir,file),r.bytes)
const meta={id,url:address,file,status:r.status,contentType:r.type,retrievedAt:new Date().toISOString(),byteLength:r.bytes.length,sha256:createHash('sha256').update(r.bytes).digest('hex')}
await fs.writeFile(path.join(dir,`sources/${id}.meta.json`),JSON.stringify(meta,null,2)+'\n')
let data;try{data=JSON.parse(r.bytes)}catch{}
console.log(JSON.stringify({...meta,elements:data?.elements?.length},null,2))
