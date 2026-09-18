"""Check the 39-record supplement without changing map or earlier research files."""
from pathlib import Path
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import subprocess
import sys

D = Path(__file__).resolve().parent
ROOT = D.parents[2]
errors = []


def check(condition, message):
    if not condition:
        errors.append(message)


def read(name):
    return json.loads((D / name).read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def counts(rows, key):
    return dict(Counter(key(row) for row in rows))


context = read('context.json')
raw = read('input.json')
results = read('results.json')
evidence = read('evidence.json')
rows = evidence['records']
ids = context['inputIds']
check(len(ids) == len(set(ids)) == 39, 'scope must contain 39 unique IDs')
check(sha(D / 'input.json') == context['inputSha256'], 'fixed input hash')
for label, collection in [('input', raw), ('results', results), ('evidence', rows), ('context', context['records'])]:
    check([r['IDBAT'] for r in collection] == ids, label + ' ID/order')
check(evidence['inputIds'] == ids and evidence['recordCount'] == 39, 'evidence scope')
check(evidence['inputSha256'] == context['inputSha256'], 'evidence input hash')
expected_result = {'IDBAT', 'currentNameZh', 'currentAddress', 'currentUse', 'relationship', 'verificationStatus', 'notes', 'sources'}
required = {'IDBAT', 'originalInput', 'historicalContext', 'researchProgress', 'queries', 'sourceReviews', 'identityEvidence', 'addressEvidence', 'buildingFateEvidence', 'currentUseEvidence', 'fieldFindings', 'spatialReview', 'relatedRecords', 'conflicts', 'remainingQuestions', 'nextResearchActions', 'verificationStatus', 'mapWriteRecommendation', 'mapWriteScope', 'mapWriteReason', 'conclusion', 'historicalCorroboration'}
dimensions = {'identity', 'address', 'buildingFate', 'currentUse', 'spatial', 'temporal'}
relations = {None, 'same-building', 'same-building-repurposed', 'same-site-repurposed', 'same-site-continuing-use', 'demolished-site-redeveloped', 'site-redeveloped-partially-preserved'}
combos = {('verified', 'review'), ('likely', 'review'), ('unresolved', 'no')}
source_keys = {'title', 'url', 'publisher', 'publishedAt', 'accessMethod', 'locator', 'supports', 'limitations', 'accessedAt', 'readThisRound', 'sourceFamily'}
for r, e, original, c in zip(results, rows, raw, context['records']):
    tag = '#' + str(r['IDBAT']) + ' '
    check(set(r) == expected_result, tag + 'strict eight result keys')
    check(required <= set(e), tag + 'required evidence keys')
    check(e['originalInput'] == original == c['originalInput'], tag + 'original fields preserved')
    check(e['conclusion'] == r['notes'], tag + 'notes/conclusion')
    check(e['verificationStatus'] == r['verificationStatus'], tag + 'status consistency')
    check((r['verificationStatus'], e['mapWriteRecommendation']) in combos, tag + 'status/map recommendation')
    check(r['relationship'] in relations, tag + 'relationship enum')
    if r['verificationStatus'] == 'unresolved':
        check(all(r[k] is None for k in ['currentNameZh', 'currentAddress', 'currentUse', 'relationship']), tag + 'unresolved modern fields must be null')
    if e['mapWriteRecommendation'] == 'review':
        check('待核' in r['notes'], tag + 'review limits in notes')
    check(e['researchProgress']['status'] in {'completed', 'partial'}, tag + 'research actually started')
    check(bool(e['researchProgress'].get('delta')), tag + 'actual research delta')
    check(len(set(e['queries'])) >= 2 and all(isinstance(q, str) and q.strip() for q in e['queries']), tag + 'actual queries')
    check(set(e['fieldFindings']) == dimensions, tag + 'six dimensions')
    reviewed = {s['url'] for s in e['sourceReviews']}
    for s in e['sourceReviews']:
        check(source_keys <= set(s), tag + 'source review schema')
        check(s['accessMethod'] in {'full-text', 'pdf', 'search-snippet', 'reprint', 'inaccessible'}, tag + 'source access method')
        check(isinstance(s['readThisRound'], bool), tag + 'source actual read flag')
    for s in r['sources']:
        check(set(s) == {'title', 'url'} and s['url'] in reviewed, tag + 'result source reviewed')
    for k, f in e['fieldFindings'].items():
        check({'status', 'finding', 'sourceUrls', 'gap'} <= set(f), tag + k + ' shape')
        check(f['status'] in {'confirmed', 'candidate', 'unknown', 'conflicting'}, tag + k + ' enum')
        check(set(f['sourceUrls']) <= reviewed, tag + k + ' source coverage')
    h = e['historicalCorroboration']
    check({'status', 'finding', 'sourceUrls'} <= set(h), tag + 'historical corroboration schema')
    check(h['status'] in {'direct', 'candidate', 'context-only', 'none', 'conflicting'}, tag + 'historical enum')
    check(set(h['sourceUrls']) <= reviewed, tag + 'historical source coverage')
    if h['status'] == 'direct':
        check(any(s['url'] in h['sourceUrls'] and s['readThisRound'] and s['accessMethod'] in {'full-text', 'pdf', 'reprint'} and 'virtualshanghai' not in s['url'] and 'histoire-chine' not in s['url'] for s in e['sourceReviews']), tag + 'direct requires independent read material')
    sp = e['spatialReview']
    check(sp['originalWgs84'] == c['coordinates']['wgs84'], tag + 'original point')
    check(sp['assessmentMethod'] == 'not-checked' and sp['containment'] == 'not-checked' and sp['distanceMeters'] is None, tag + 'no unperformed spatial claim')
    members = e.get('fullGroupMembers') or e['relatedRecords']
    member_ids = {m['IDBAT'] for m in members} | {r['IDBAT']}
    check(member_ids == {m['IDBAT'] for m in c['fullGroupMembers']}, tag + 'complete group membership')
    check(bool(e['nextResearchActions']), tag + 'next actions')
    for action in e['nextResearchActions']:
        check({'targetGap', 'action', 'targetSource', 'acceptanceCriterion'} <= set(action), tag + 'next action schema')

vs = read('vs-details.json')['records']
check([r['IDBAT'] for r in vs] == ids, '39 fresh exact-ID pages')
for v, c in zip(vs, context['records']):
    check(v['status'] == 'success' and v['httpStatus'] == 200, str(v['IDBAT']) + ' exact-ID page read')
    check(v['cells'].get('Building ID') == str(v['IDBAT']), 'exact-ID response identity')
    check(v['cells'].get('Chinese Name') == c['liveRecord']['nameZh'], str(v['IDBAT']) + ' Chinese name preservation')

members = {m['IDBAT']: m for c in context['records'] for m in c['fullGroupMembers']}
node_code = "import proj4 from 'proj4';import fs from 'node:fs';const a=JSON.parse(fs.readFileSync(0,'utf8'));console.log(JSON.stringify(a.map(r=>({id:r.id,w:(Math.abs(r.x)<=180&&Math.abs(r.y)<=90)?[r.x,r.y]:proj4('+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs','EPSG:4326',[r.x,r.y])}))));"
xy = [dict(id=i, x=m['liveRecord']['x'], y=m['liveRecord']['y']) for i, m in members.items()]
calc = subprocess.run(['node', '--input-type=module', '-e', node_code], cwd=ROOT, input=json.dumps(xy), text=True, capture_output=True)
check(calc.returncode == 0, 'independent proj4 invocation')
if calc.returncode == 0:
    for p in json.loads(calc.stdout):
        w = members[p['id']]['coordinates']['wgs84']
        check(abs(w['longitude'] - p['w'][0]) <= .00000051 and abs(w['latitude'] - p['w'][1]) <= .00000051, str(p['id']) + ' independent conversion')

baseline = read('baseline.json')
changed = [name for name, digest in baseline['files'].items() if not (ROOT / name).exists() or sha(ROOT / name) != digest]
check(not changed, 'protected file changes: ' + str(changed))
features = json.loads((ROOT / 'public/data/historical-features.geojson').read_text())['features']
road_count = sum(f['properties'].get('kind') == 'road' for f in features)
check(len(features) == 5507 and road_count == 3832, 'unchanged map counts')
diff = subprocess.run(['git', 'diff', '--check'], cwd=ROOT, text=True, capture_output=True)
check(diff.returncode == 0, 'git diff whitespace: ' + diff.stdout + diff.stderr)
report = dict(executedAt=datetime.now(timezone.utc).isoformat(), executionStatus='executed', result='failed' if errors else 'passed', recordCount=len(rows), queryCount=sum(len(e['queries']) for e in rows), historicalCorroboration=counts(rows, lambda e: e['historicalCorroboration']['status']), verification=counts(rows, lambda e: e['verificationStatus']), recommendation=counts(rows, lambda e: e['mapWriteRecommendation']), progress=counts(rows, lambda e: e['researchProgress']['status']), partialIds=[e['IDBAT'] for e in rows if e['researchProgress']['status'] == 'partial'], exactVsPages=len(vs), independentlyConvertedMembers=len(members), preservedFiles=len(baseline['files']), publicFeatureCount=len(features), roadCount=road_count, checks=['fixed 39 inputs and ID order', 'strict results and evidence schema', 'source references and actual-read metadata', 'historical support separate from modern verification', 'no unperformed spatial measurement claims', '39 fresh exact VS pages', 'independent per-member proj4 conversion', 'protected map, source and earlier research SHA-256', 'git diff --check'], failures=errors)
(D / 'validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
if not errors:
    evidence['validation'] = {k: report[k] for k in ['executedAt', 'executionStatus', 'result', 'checks', 'failures']}
    evidence['validation']['report'] = 'validation.json'
    (D / 'evidence.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(bool(errors))
