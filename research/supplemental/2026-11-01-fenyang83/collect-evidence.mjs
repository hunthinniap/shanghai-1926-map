import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {chromium} from '@playwright/test'
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../..'),hash=b=>createHash('sha256').update(b).digest('hex')
await fs.mkdir(path.join(dir,'sources'),{recursive:true})
for(const [from,to] of [['shtong-polish-consulate.json','polish-consulate-browser.json'],['shtong-polish-consulate.html','polish-consulate-rendered.html']])await fs.copyFile(path.join(root,'artifacts',from),path.join(dir,'sources',to))
const browser=await chromium.launch({headless:true,proxy:{server:'http://127.0.0.1:7897'}})
try{
 const context=await browser.newContext()
 for(const [id,url] of [
  ['fudan-1952','https://news.fudan.edu.cn/2023/0727/c242a135823/page.htm'],
  ['hospital-history','https://www.cn-healthcare.com/articlewm/20230130/content-1503753.html'],
  ['fudan-campus','https://shmc.fudan.edu.cn/2023/1201/c2658a138331/page.htm'],
  ['fudan-building10','https://www.fudan.edu.cn/2019/0424/c426a95979/page.htm'],
 ]){
  const response=await context.request.get(url,{timeout:20000}),bytes=await response.body()
  if(!response.ok())throw new Error('Source HTTP '+response.status()+': '+id)
  await fs.writeFile(path.join(dir,'sources',id+'.html'),bytes)
  await fs.writeFile(path.join(dir,'sources',id+'.meta.json'),JSON.stringify({id,url,status:response.status(),retrievedAt:new Date().toISOString(),byteLength:bytes.length,sha256:hash(bytes)},null,2)+'\n')
 }
}finally{await browser.close()}
const files=[]
for(const file of (await fs.readdir(path.join(dir,'sources'))).sort()){const bytes=await fs.readFile(path.join(dir,'sources',file));files.push({file:'sources/'+file,byteLength:bytes.length,sha256:hash(bytes)})}
await fs.writeFile(path.join(dir,'source-manifest.json'),JSON.stringify({reviewDate:'2026-11-01',files},null,2)+'\n')
console.log(JSON.stringify({sources:files.length,saved:true}))
