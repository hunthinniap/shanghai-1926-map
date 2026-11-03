import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {createHash} from 'node:crypto'
const dir=path.dirname(fileURLToPath(import.meta.url)),run=promisify(execFile)
const queries=[['zhou-fohai','周佛海旧居 愚园路'],['gaoan77','上海市高安路77号'],['fangsan-special','许昌路227弄特号'],['xuejia','白鹤镇薛家宅'],['xiangyang313','上海市襄阳南路313号'],['shaanxi214','上海市陕西南路214号'],['changyang15','长阳路50弄15号'],['yanan955-1','延安中路955弄1号']]
const urls=[...queries.map(([id,q])=>[id,'https://m.map.360.cn/?city='+encodeURIComponent('上海市')+'&k='+encodeURIComponent(q)+'&src=bendibao&t=map']),['fangsan-fang','https://www.fang.com/xiaoqu/sh-1210831340/'],['xiangyang-lianjia','https://news.lianjia.com/sh/xiaoqu/5011000000088.html'],['cn-museum','https://changning.museum.chaoxing.com/265/1568.html']]
await fs.mkdir(path.join(dir,'sources'),{recursive:true})
for(const [id,url] of urls){
 const local=path.join(dir,'sources',id+'.raw'),meta=path.join(dir,'sources',id+'.meta.json')
 try{await fs.access(meta);console.log(id+': cached');continue}catch{}
 try{
  const args=['--silent','--show-error','--location','--max-time','45','--retry','1',...(process.env.HTTPS_PROXY?['--proxy',process.env.HTTPS_PROXY]:[]),'--user-agent','Mozilla/5.0','--output',local,'--write-out','%{http_code}',url]
  const {stdout}=await run('curl.exe',args,{timeout:100000}),bytes=await fs.readFile(local)
  await fs.writeFile(meta,JSON.stringify({id,url,retrievedAt:new Date().toISOString(),status:Number(stdout),file:'sources/'+id+'.raw',byteLength:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')},null,2)+'\n')
  const html=bytes.toString('utf8'),matches=[...html.matchAll(/.{0,80}(?:longitude|latitude|baidux|baiduy|mapx|mapy|"x"\s*:|"y"\s*:).{0,90}/g)].slice(0,10).map(m=>m[0])
  console.log(JSON.stringify({id,status:Number(stdout),bytes:bytes.length,coordinateFields:matches}))
 }catch(error){console.log(id+': fetch failed ('+(error.code??'unknown')+')')}
}
