import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const dir=path.dirname(fileURLToPath(import.meta.url))
function state(html){
 const marker=html.indexOf('window.__STATE__')
 if(marker<0)return null
 const start=html.indexOf('{',marker);let depth=0,quoted=false,escaped=false
 for(let i=start;i<html.length;i++){
  const c=html[i]
  if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}
  if(c==='"'){quoted=true;continue}
  if(c==='{')depth++
  if(c==='}'&&--depth===0)return JSON.parse(html.slice(start,i+1))
 }
 throw new Error('Incomplete public page state')
}
const results=[]
for(const file of (await fs.readdir(path.join(dir,'sources'))).filter(f=>f.startsWith('map360-')&&f.endsWith('.json')&&!f.endsWith('.source.json'))){
 const source=state(await fs.readFile(path.join(dir,'sources',file),'utf8'))
 if(!source)continue
 const points=[],seen=new Set()
 const walk=o=>{
  if(!o||typeof o!=='object')return
  if(Number.isFinite(Number(o.x))&&Number.isFinite(Number(o.y))&&o.name&&o.x&&o.y){
   const key=o.name+'@'+o.x+','+o.y
   if(!seen.has(key)){seen.add(key);points.push({name:o.name,address:o.address??null,x:o.x,y:o.y,coordinateSystem:'not-declared',id:o.primaryid??o.id??null})}
  }
  for(const v of Object.values(o))if(v&&typeof v==='object')walk(v)
 }
 walk(source)
 results.push({sourceFile:'sources/'+file,keyword:source.searchList?.params?.keyword??null,points})
}
await fs.writeFile(path.join(dir,'map360-candidates.json'),JSON.stringify({note:'公开网页STATE字段的原坐标，不猜测坐标系，不自动晋级。',results},null,2)+'\n')
for(const r of results)console.log(JSON.stringify({source:r.sourceFile,keyword:r.keyword,points:r.points.slice(0,12)}))
