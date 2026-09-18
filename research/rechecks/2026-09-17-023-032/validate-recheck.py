"""Validate fixed input preservation and the dated research deliverables, without map writes."""
from pathlib import Path
import collections, hashlib, json, math, subprocess, sys
D=Path(__file__).resolve().parent
ROOT=D.parents[2]
strict='--available' not in sys.argv
errors=[];warnings=[];batches=[];allids=[];allrecords=[]
def check(ok,msg):
    if not ok: errors.append(msg)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def count(rows,key):
    return dict(collections.Counter(key(r) if callable(key) else r[key] for r in rows))
expectedResult={'IDBAT','currentNameZh','currentAddress','currentUse','relationship','verificationStatus','notes','sources'}
dims={'identity','address','buildingFate','currentUse','spatial','temporal'}
relations={None,'same-building','same-building-repurposed','same-site-repurposed','same-site-continuing-use','demolished-site-redeveloped','site-redeveloped-partially-preserved'}
combos={('verified','yes'),('verified','review'),('likely','review'),('unresolved','no')}
required={'IDBAT','originalInput','historicalContext','researchProgress','queries','sourceReviews','identityEvidence','addressEvidence','buildingFateEvidence','currentUseEvidence','fieldFindings','spatialReview','relatedRecords','conflicts','remainingQuestions','nextResearchActions','verificationStatus','mapWriteRecommendation','mapWriteScope','mapWriteReason','conclusion'}
allcontexts=[]
for n in range(23,33):
    b=f'{n:03d}';c=json.loads((D/(b+'-context.json')).read_text());allcontexts+=c['records']
    inp=ROOT/c['inputFileName'];raw=json.loads(inp.read_text())
    if isinstance(raw,dict):raw=raw.get('records',raw.get('items'))
    check(sha(inp)==c['inputSha256'],b+' raw input bytes changed')
    check([r['IDBAT'] for r in raw]==c['inputIds'],b+' input order changed')
    fs=[D/(b+s) for s in ['-results.json','-evidence.json','-review.md']]
    if not all(f.exists() for f in fs):
        if strict:errors.append(b+' missing deliverables')
        else:warnings.append(b+' not yet delivered')
        continue
    result=json.loads(fs[0].read_text());ev=json.loads(fs[1].read_text());rows=ev['records']
    expected=c['inputIds']
    check([r['IDBAT'] for r in result]==expected,b+' results ID/order')
    check([r['IDBAT'] for r in rows]==expected,b+' evidence ID/order')
    check(ev['recordCount']==len(expected),b+' recordCount')
    check(ev['inputSha256']==c['inputSha256'],b+' inputSha256')
    check(ev['inputIds']==expected,b+' inputIds')
    byid={r['IDBAT']:r for r in rows}
    for r,original,context in zip(result,raw,c['records']):
        i=r['IDBAT'];label=f'{b}#{i}';e=byid.get(i,{})
        check(set(r)==expectedResult,label+' exact eight result fields')
        check(required<=set(e),label+' evidence required fields '+str(sorted(required-set(e))))
        check(e.get('originalInput')==original,label+' originalInput changed')
        check(e.get('verificationStatus')==r['verificationStatus'],label+' result/evidence status')
        check(e.get('conclusion')==r['notes'],label+' notes/conclusion mismatch')
        check((r['verificationStatus'],e.get('mapWriteRecommendation')) in combos,label+' illegal status combination')
        check(r['relationship'] in relations,label+' relationship enum')
        for s in r['sources']:
            check(set(s)=={'title','url'},label+' source fields')
            check(isinstance(s['url'],str) and s['url'].startswith(('https://','http://')),label+' concrete source URL')
        fields=e.get('fieldFindings',{})
        check(set(fields)==dims,label+' six dimensions')
        for field,f in fields.items():
            check(f.get('status') in {'confirmed','candidate','unknown','conflicting'},label+' dimension status '+field)
            check({'status','finding','sourceUrls','gap'}<=set(f),label+' dimension shape '+field)
        progress=e.get('researchProgress',{})
        check(progress.get('status') in {'completed','partial','not-started'},label+' progress enum')
        check(bool(progress.get('delta')),label+' actual delta missing')
        queries=e.get('queries',[])
        check(isinstance(queries,list) and all(isinstance(q,str) and q.strip() for q in queries),label+' query strings')
        if progress.get('status')!='not-started':check(len(set(queries))>=2,label+' less than 2 recorded actual queries')
        if strict:check(progress.get('status')!='not-started',label+' still not started')
        if e.get('mapWriteRecommendation')!='yes':check(bool(e.get('nextResearchActions')),label+' actionable next source missing')
        for a in e.get('nextResearchActions',[]):check({'targetGap','action','targetSource','acceptanceCriterion'}<=set(a),label+' next action schema')
        reviews=e.get('sourceReviews',[])
        check(bool(reviews),label+' missing source reviews')
        for s in reviews:
            check({'url','title','publisher','publishedAt','accessMethod','locator','supports','limitations','accessedAt','readThisRound','sourceFamily'}<=set(s),label+' source review schema')
            check(s.get('accessMethod') in {'full-text','pdf','search-snippet','reprint','inaccessible'},label+' access method '+str(s.get('accessMethod')))
        reviewed={s['url'] for s in reviews}
        for s in r['sources']:check(s['url'] in reviewed,label+' result source missing sourceReview '+s['url'])
        modern=e.get('mapWriteRecommendation')
        if modern=='review':check('待核' in r['notes'],label+' review notes lack 待核')
        if modern=='yes':
            for k in ['currentNameZh','currentAddress','currentUse','relationship']:
                check(bool(r[k]) and not any(w in r[k] for w in ['候选','待核','未知']),label+' yes field '+k)
            check(e['spatialReview'].get('compatibility')=='supported',label+' yes spatial unsupported')
            check(e['spatialReview'].get('assessmentMethod')!='poi-only',label+' yes POI-only')
            check(bool(e['mapWriteScope'].get('useEvidenceDate')),label+' yes use date')
            check(e['mapWriteScope'].get('level') in {'site','building','part-of-building'},label+' yes scope')
        sp=e.get('spatialReview',{})
        check(sp.get('originalWgs84')==context['coordinates']['wgs84'],label+' original point mismatch')
        check(sp.get('assessmentMethod') in {'geometry','georeferenced-map','manual-cross-check','poi-only','not-checked'},label+' spatial method')
        check(sp.get('compatibility') in {'supported','uncertain','conflicting','not-checked'},label+' compatibility')
        if sp.get('containment') in {'inside','outside','boundary-near'}:
            check(sp.get('assessmentMethod') in {'geometry','georeferenced-map'},label+' containment without actual geometry')
            check(bool(sp.get('comparisonCrs')) and bool(sp.get('comparisonSourceUrl')),label+' containment CRS/source')
        if sp.get('distanceMeters') is not None:
            check(isinstance(sp['distanceMeters'],(int,float)) and math.isfinite(sp['distanceMeters']) and sp['distanceMeters']>=0,label+' invalid distance')
            check(bool(sp.get('measurementTarget')),label+' distance no target')
        full=e.get('fullGroupMembers') or e.get('relatedRecords',[])
        memberids={m.get('IDBAT') if isinstance(m,dict) else m for m in full}
        if i not in memberids:memberids.add(i)
        check(memberids=={m['IDBAT'] for m in context['fullGroupMembers']},label+' incomplete group members')
        allids.append(i);allrecords.append(e)
    batches.append(dict(batch=b,recordCount=len(rows),verification=count(rows,'verificationStatus'),recommendation=count(rows,'mapWriteRecommendation'),progress=count(rows,lambda r:r['researchProgress']['status']),queryCount=sum(len(r['queries']) for r in rows),partialIds=[r['IDBAT'] for r in rows if r['researchProgress']['status']=='partial'],yesIds=[r['IDBAT'] for r in rows if r['mapWriteRecommendation']=='yes']))
check(len(allids)==len(set(allids)),'duplicate ID across batches')
if strict:check(len(allids)==460,'expected 460 researched records')
baseline=json.loads((D/'baseline.json').read_text())
preservationFailures=[name for name,digest in baseline['files'].items() if not (ROOT/name).exists() or sha(ROOT/name)!=digest]
check(not preservationFailures,'baseline protected data changed: '+str(preservationFailures))
# A separate direct proj4 invocation checks every original group member, including mixed CRS values.
members={m['IDBAT']:m for c in allcontexts for m in c['fullGroupMembers']}
nodecode="import proj4 from 'proj4'; import fs from 'node:fs'; const a=JSON.parse(fs.readFileSync(0,'utf8')); console.log(JSON.stringify(a.map(r=>({id:r.id,w:(Math.abs(r.x)<=180&&Math.abs(r.y)<=90)?[r.x,r.y]:proj4('+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs','EPSG:4326',[r.x,r.y])}))));"
data=[dict(id=i,x=m['liveRecord']['x'],y=m['liveRecord']['y']) for i,m in members.items()]
calc=subprocess.run(['node','--input-type=module','-e',nodecode],cwd=ROOT,input=json.dumps(data),text=True,capture_output=True)
check(calc.returncode==0,'independent proj4 invocation failed '+calc.stderr[:300])
if calc.returncode==0:
    for x in json.loads(calc.stdout):
        p=members[x['id']]['coordinates']['wgs84']
        check(abs(p['longitude']-x['w'][0])<=.00000051 and abs(p['latitude']-x['w'][1])<=.00000051,'group coordinate conversion '+str(x['id']))
geojson=json.loads((ROOT/'public/data/historical-features.geojson').read_text())
check(len(geojson['features'])==baseline['publicFeatureCount'],'public feature count changed')
roads=sum(f.get('properties',{}).get('kind')=='road' for f in geojson['features'])
check(roads==baseline['roadCount'],'road count changed')
summary=dict(executedAt=__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),mode='complete' if strict else 'available-only',executionStatus='executed',result='passed' if not errors else 'failed',recordCount=len(allrecords),uniqueGroupMemberCount=len(members),batches=batches,verification=count(allrecords,'verificationStatus'),recommendation=count(allrecords,'mapWriteRecommendation'),progress=count(allrecords,lambda r:r['researchProgress']['status']),checks=['fixed input SHA-256/order and complete originalInput','strict eight fields; evidence schema; status combinations','six dimensions; source reviews; recorded queries; conclusions aligned','complete group membership and direct independent proj4 conversions','all baseline research/source/map bytes unchanged','public feature count and road count unchanged'],preservedFiles=len(baseline['files']),publicFeatureCount=len(geojson['features']),roadCount=roads,failures=errors,warnings=warnings)
if strict:(D/'validation.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k not in ['checks','batches']},ensure_ascii=False,indent=2))
if strict and not errors:
    for b in batches:
        p=D/(b['batch']+'-evidence.json');ev=json.loads(p.read_text());ev['validation']={k:summary[k] for k in ['executionStatus','result','checks','failures']};ev['validation']['executedAt']=summary['executedAt'];ev['validation']['report']='validation.json';p.write_text(json.dumps(ev,ensure_ascii=False,indent=2)+'\n')
sys.exit(bool(errors))
