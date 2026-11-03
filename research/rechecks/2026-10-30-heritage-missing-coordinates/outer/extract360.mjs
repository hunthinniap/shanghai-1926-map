import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
function extract(html){const p=html.indexOf('window.__STATE__');if(p<0)return null;const start=html.indexOf('{',p);let depth=0,quoted=false,escape=false;for(let i=start;i<html.length;i++){const c=html[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue}if(c==='"'){quoted=true;continue}if(c==='{')depth++;if(c==='}'&&--depth===0)return JSON.parse(html.slice(start,i+1))}throw Error('Truncated JSON state')}
const records=[];
for(const file of(await fs.readdir(path.join(dir,'sources'))).filter(f=>f.endsWith('-map360.json'))){const state=extract(await fs.readFile(path.join(dir,'sources',file),'utf8'));if(!state)continue;const points=[],seen=new Set();const walk=o=>{if(!o||typeof o!=='object')return;if(o.name&&Number.isFinite(Number(o.x))&&Number.isFinite(Number(o.y))&&o.x&&o.y){const key=o.name+'@'+o.x+','+o.y;if(!seen.has(key)){seen.add(key);points.push({name:o.name,address:o.address??null,lon:Number(o.x),lat:Number(o.y),coordinateSystem:'not-declared',id:o.primaryid??o.id??null})}}for(const v of Object.values(o))if(v&&typeof v==='object')walk(v)};walk(state);records.push({sourceFile:'outer/sources/'+file,keyword:state.searchList?.params?.keyword??null,points})}
await fs.writeFile(path.join(dir,'map360-candidates.json'),JSON.stringify({date:'2026-10-31',records},null,2)+'\n');
for(const r of records)console.log(JSON.stringify(r));
