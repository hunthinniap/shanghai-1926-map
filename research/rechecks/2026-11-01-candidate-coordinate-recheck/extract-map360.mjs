import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const dir=path.dirname(fileURLToPath(import.meta.url))
function state(html){
 const marker=html.indexOf('window.__STATE__');if(marker<0)return null
 const start=html.indexOf('{',marker);let depth=0,quoted=false,escaped=false
 for(let i=start;i<html.length;i++){const c=html[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}if(c==='"'){quoted=true;continue}if(c==='{')depth++;if(c==='}'&&--depth===0)return JSON.parse(html.slice(start,i+1))}
 throw new Error('Incomplete state')
}
const records=[]
for(const file of (await fs.readdir(path.join(dir,'sources'))).filter(f=>f.endsWith('.raw'))){
 const parsed=state(await fs.readFile(path.join(dir,'sources',file),'utf8'));if(!parsed)continue
 const points=[],seen=new Set(),aggregations=[]
 const walk=o=>{if(!o||typeof o!=='object')return
  if(o.address_aggregation)aggregations.push(o.address_aggregation)
  if(Number.isFinite(o.x)&&Number.isFinite(o.y)&&o.name&&o.x&&o.y){const key=o.name+'@'+o.x+','+o.y;if(!seen.has(key)){seen.add(key);points.push({name:o.name,address:o.address??null,x:o.x,y:o.y,id:o.primaryid??o.id??null,coordinateSystem:'not-declared'})}}
  for(const v of Object.values(o))if(v&&typeof v==='object')walk(v)
 };walk(parsed);records.push({sourceFile:'sources/'+file,points,aggregations})
}
await fs.writeFile(path.join(dir,'map360-candidates.json'),JSON.stringify({reviewDate:'2026-11-01',note:'原始候选与回退结果；不自动晋级，不将分店编号当成门牌。',records},null,2)+'\n')
for(const r of records)console.log(JSON.stringify({...r,points:r.points.slice(0,5)}))
