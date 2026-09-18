from pathlib import Path
from collections import Counter
import json,subprocess,math,hashlib
D=Path(__file__).resolve().parent;ROOT=D.parents[2]
c=json.loads((D/'context.json').read_text());rs=c['records'];by={r['IDBAT']:r for r in rs}
def read(p):return json.loads((ROOT/p).read_text())
def rows(j):return j if isinstance(j,list) else j['records']
node="import proj4 from 'proj4';import fs from 'node:fs';const a=JSON.parse(fs.readFileSync(0,'utf8'));console.log(JSON.stringify(a.map(r=>({id:r.id,w:(Math.abs(r.x)<=180&&Math.abs(r.y)<=90)?[r.x,r.y]:proj4('+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs','EPSG:4326',[r.x,r.y])}))));"
xy=[dict(id=r['IDBAT'],x=r['liveRecord']['x'],y=r['liveRecord']['y']) for r in rs]
calc=subprocess.run(['node','--input-type=module','-e',node],cwd=ROOT,input=json.dumps(xy),text=True,capture_output=True,check=True);correct={r['id']:r['w'] for r in json.loads(calc.stdout)}
def dist(a,b):
 dlon=math.radians(a[0]-b[0]);dlat=math.radians(a[1]-b[1]);m=math.sin(dlat/2)**2+math.cos(math.radians(a[1]))*math.cos(math.radians(b[1]))*math.sin(dlon/2)**2
 return round(12742000*math.asin(min(1,math.sqrt(m))),3)
findings=[];individual=[];batchchecks=[]
for b in c['batches']:
 j=read(b['workflowPath']); n=b['batch']; wf=j['records']; counts=Counter(r['resolutionStatus'] for r in wf);expected={'total':len(wf),**{k.replace('history-only','historyOnly').replace('location-only','locationOnly'):v for k,v in counts.items()}}
 summarymismatch=[dict(field=k,declared=j['summary'].get(k),actual=v) for k,v in expected.items() if k in j['summary'] and j['summary'][k]!=v]
 path=j['input'];rawnow=read(path) if (ROOT/path).exists() else None;idsnow={r['IDBAT'] for r in rows(rawnow)} if rawnow is not None else set();ids={r['IDBAT'] for r in wf}
 batchchecks.append(dict(batch=n,records=len(wf),uniqueIds=len(ids),summaryMismatch=summarymismatch,declaredInput=path,declaredInputCurrentlyExists=rawnow is not None,declaredInputIdOverlap=len(idsnow&ids),declaredInputSetMatches=ids==idsnow,frozenInput=b['frozenInputPath'],frozenInputSetMatches=(set(b['inputIds'])==ids) if b['frozenInputPath'] else None))
 if idsnow!=ids:findings.append(dict(key=f'input-pointer-{n}',severity='P2',batch=n,IDBAT=None,kind='stale-input-reference',finding=f'工作流input={path}当前只与原研究集合重叠{len(idsnow&ids)}/50条，不能据同号现导出重建研究输入。',recommendation='已有固定input的批次改引用固定路径；002—006按原50个ID追溯提交时源输入并另存有来源说明的快照，不把现public同号文件冒充原输入。'))
for x in rs:
 i=x['IDBAT']; w=x['workflow']; flags=[];p=correct[i];delta=dist(p,w['coordinates']['wgs84']);resolution=w['resolutionStatus'];rec=w.get('mapWriteRecommendation');frozen=x['frozenInput'];r=x['result']
 if delta>.15:flags.append(dict(kind='coordinate-difference',severity='P1' if delta>5 else 'P2',finding=f'旧工作流WGS84与最新live原XY独立换算差{delta}m',expected=p,actual=w['coordinates']['wgs84'],recommendation='核对当时源XY与转换过程；不要自动移动地图。'))
 if frozen and r:
  changed=[k for k in ['IDBAT','NAME','F_ADDRESS','FUNCTION','XC','YC'] if r.get(k)!=frozen.get(k)]
  if changed:flags.append(dict(kind='original-input-difference',severity='P1',fields=changed))
  mapped={'verified':'resolved','likely':'probable','unresolved':'unresolved'}
  differences=[k for k,v in [('currentNameZh',r.get('currentNameZh')),('currentAddress',r.get('currentAddress')),('currentUse',r.get('currentUse')),('currentUseRelationship',r.get('relationship') or 'coordinate-only'),('evidence',r.get('notes')),('resolutionStatus',mapped[r['verificationStatus']])] if w.get(k)!=v]
  if differences:flags.append(dict(kind='result-workflow-difference',severity='P2',fields=differences))
 urls=w.get('sourceUrls',[]);bad=[u for u in urls if not isinstance(u,str) or not u.startswith(('http://','https://'))]
 if bad:flags.append(dict(kind='malformed-source',severity='P2',urls=bad))
 if not urls:flags.append(dict(kind='missing-source',severity='P2'))
 map_props=[f['properties'] for f in x['features']];mapped_use=any(f.get('currentUse') for f in map_props)
 own_group_member_ids=sorted({mid for f in map_props for mid in f.get('sourceRecordIds',[])})
 guarded=[]
 for o in x['matchedOverrides']:
  approved=o.get('sourceRecordIds',[]);extra=[mid for mid in own_group_member_ids if approved and mid not in approved]
  if extra:guarded.append(dict(overrideGroup=o['featureGroupId'],guardedIds=approved,additionalGroupIds=extra))
 if guarded:flags.append(dict(kind='override-subset-scope',severity='P2',details=guarded,finding='当前整组显示使用含子集ID guard的覆盖；guard检查仅确认包含，并不限制显示到被批准实体。',recommendation='逐成员核对是否同址同用途；未获独立证据者应分离或单独hold，不凭子集同意扩展。'))
 own_use=dict(batch=x['batch'],IDBAT=i,resolutionStatus=resolution,mapWriteRecommendation=rec,coordinateDeltaMeters=delta,currentMapHasUse=mapped_use,currentMapGroups=[f['featureGroupId'] for f in map_props],groupMembers=own_group_member_ids,matchedOverrideCount=len(x['matchedOverrides']),flags=flags)
 individual.append(own_use)
 for f in flags:findings.append(dict(key=f'{x["batch"]}-{i}-{f["kind"]}',batch=x['batch'],IDBAT=i,**f))
out=dict(scope='001–010现有500条结构、原字段/坐标、当前地图采用及输入指针检查；语义与外部来源另见分片审阅。',batches=batchchecks,recordCount=len(rs),uniqueIdCount=len(by),statusCounts=dict(Counter(r['workflow']['resolutionStatus'] for r in rs)),recommendationCounts=dict(Counter(r['workflow'].get('mapWriteRecommendation','absent') for r in rs)),currentlyOnMapCount=sum(r['currentMapHasUse'] for r in individual),directlyMatchedOverrideCount=sum(bool(r['matchedOverrideCount']) for r in individual),coordinateCheckCount=len(correct),maxCoordinateDeltaMeters=max(r['coordinateDeltaMeters'] for r in individual),findings=findings,records=individual)
(D/'structural-audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in out.items() if k not in ['records','batches','findings']},ensure_ascii=False,indent=2));print('Findings by type',Counter(f['kind'] for f in findings));print('Summary errors',[b for b in batchchecks if b['summaryMismatch']]);print('Coordinate issues',[(f['batch'],f['IDBAT'],f['finding']) for f in findings if f['kind']=='coordinate-difference']);print('Subset guard findings',[(f['batch'],f['IDBAT'],f['details']) for f in findings if f['kind']=='override-subset-scope'])
