import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const dir=path.dirname(fileURLToPath(import.meta.url))
const files=(await fs.readdir(path.join(dir,'sources'))).filter(f=>f.endsWith('.json')&&!f.endsWith('.source.json'))
const features=new Map()
for(const file of files){
 let data;try{data=JSON.parse(await fs.readFile(path.join(dir,'sources',file),'utf8'))}catch{continue}
 if(!data.elements)continue
 const nodes=new Map(data.elements.filter(e=>e.type==='node').map(e=>[e.id,e]))
 for(const e of data.elements){
  const t=e.tags??{}
  if(e.type==='relation'||t.route||t.route_master||t.highway||t.railway||t.public_transport)continue
  if(!t.name&&!t['addr:housenumber']&&!t['heritage:ref'])continue
  const pts=e.type==='node'?[[e.lon,e.lat]]:(e.nodes??[]).map(id=>nodes.get(id)).filter(Boolean).map(n=>[n.lon,n.lat])
  const complete=e.type==='node'||pts.length===(e.nodes??[]).length
  if(!pts.length||!complete)continue
  const bbox=[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))]
  features.set(e.type+'/'+e.id,{type:e.type,id:e.id,name:t.name??null,address:[t['addr:street'],t['addr:housenumber']].filter(Boolean).join(''),
   point:{lon:Number(((bbox[0]+bbox[2])/2).toFixed(7)),lat:Number(((bbox[1]+bbox[3])/2).toFixed(7))},bbox,complete,
   sourceFile:'sources/'+file,sourceUrl:'https://www.openstreetmap.org/'+e.type+'/'+e.id,version:e.version,timestamp:e.timestamp,tags:t})
 }
}
await fs.writeFile(path.join(dir,'osm-features.json'),JSON.stringify({recordCount:features.size,records:[...features.values()]},null,2)+'\n')
const pattern=new RegExp(process.argv[2]??'国际饭店|跑马|瑞金|中山医院|上海医学院|震旦|历史博物馆|1号楼|一号楼|东一号')
for(const f of features.values())if(pattern.test(f.name+' '+f.address+' '+JSON.stringify(f.tags)))console.log(JSON.stringify({type:f.type,id:f.id,name:f.name,address:f.address,point:f.point,heritage:f.tags['heritage:ref'],other:f.tags.old_name,building:f.tags.building}))
console.log(JSON.stringify({total:features.size}))
