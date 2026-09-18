"""Validate audit coverage and preservation; passing does not clear research findings."""
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


def read(name):
    return json.loads((D / name).read_text())


def check(ok, message):
    if not ok:
        errors.append(message)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


context = read('context.json')
audit = read('audit.json')
expected = [(r['batch'], r['IDBAT']) for r in context['records']]
actual = [(r['batch'], r['IDBAT']) for r in audit['records']]
check(len(expected) == len(set(expected)) == 500, 'fixed 500-record scope')
check(actual == expected, 'audit ID and batch order')
for r in audit['records']:
    tag = f"{r['batch']}#{r['IDBAT']} "
    check({'reviewLevel', 'verdict', 'findings', 'sourceReviews', 'queries'} <= set(r), tag + 'audit fields')
    check(r['reviewLevel'] in {'record-review', 'source-recheck'}, tag + 'review level')
    check(r['verdict'] in {'no-issue-found', 'needs-evidence', 'correction-needed'}, tag + 'verdict')
    if r['verdict'] == 'no-issue-found':
        check(not r['findings'], tag + 'clear record has findings')
    else:
        check(bool(r['findings']), tag + 'issue needs specific finding')
    if r['reviewLevel'] == 'source-recheck':
        check(bool(r['sourceReviews']), tag + 'source recheck needs access record')
    for f in r['findings']:
        check({'severity', 'field', 'claim', 'problem', 'recommendation', 'sourceUrls'} <= set(f), tag + 'finding fields')
        check(f['severity'] in {'P1', 'P2', 'P3'}, tag + 'severity')
    for s in r['sourceReviews']:
        check({'url', 'title', 'accessMethod', 'readThisRound', 'accessedAt', 'supports', 'limitations'} <= set(s), tag + 'source review fields')
        check(isinstance(s['readThisRound'], bool), tag + 'actual read flag')
        if s['accessMethod'] == 'inaccessible':
            check(s['readThisRound'] is False, tag + 'unread source not marked read')

baseline = read('baseline.json')
changed = [name for name, digest in baseline['files'].items() if not (ROOT / name).exists() or sha(ROOT / name) != digest]
check(not changed, 'protected files changed: ' + str(changed))
for b in context['batches']:
    workflow = json.loads((ROOT / b['workflowPath']).read_text())
    check([r['IDBAT'] for r in workflow['records']] == b['workflowIds'], b['batch'] + ' source workflow scope')

recovered = read('input-provenance.json')
for r in recovered['records']:
    item = r['recoveredExactSnapshot']
    if not item:
        continue
    p = D / item['fileName']
    check(sha(p) == item['sha256'], r['batch'] + ' recovered bytes')
    check({r['IDBAT'] for r in json.loads(p.read_text())} == set(r['expectedIds']), r['batch'] + ' recovered ID set')
    original = subprocess.run(['git', 'show', item['sourceCommit'] + ':' + item['sourcePath']], cwd=ROOT, capture_output=True)
    check(original.returncode == 0 and original.stdout == p.read_bytes(), r['batch'] + ' exact Git provenance')

structural = read('structural-audit.json')
check(structural['recordCount'] == structural['coordinateCheckCount'] == 500, 'all 500 coordinates checked')
check(structural['maxCoordinateDeltaMeters'] <= .15, 'coordinate precision agreement')
check(not any(b['summaryMismatch'] for b in structural['batches']), 'original count summaries')
features = json.loads((ROOT / 'public/data/historical-features.geojson').read_text())['features']
road_count = sum(f['properties'].get('kind') == 'road' for f in features)
check(len(features) == 5507 and road_count == 3832, 'unchanged map count')
diff = subprocess.run(['git', 'diff', '--check'], cwd=ROOT, capture_output=True, text=True)
check(diff.returncode == 0, 'git diff whitespace')
source_records = [r for r in audit['records'] if r['reviewLevel'] == 'source-recheck']
read_records = [r for r in source_records if any(s['readThisRound'] and s['accessMethod'] not in {'inaccessible', 'search-snippet'} for s in r['sourceReviews'])]
report = dict(executedAt=datetime.now(timezone.utc).isoformat(), executionStatus='executed', result='failed' if errors else 'passed', meaning='Audit artifact consistency and data preservation only; this does not mean the original research has no issues.', recordCount=len(actual), reviewLevels=dict(Counter(r['reviewLevel'] for r in audit['records'])), recordsWithFreshReadableSources=len(read_records), verdictCounts=dict(Counter(r['verdict'] for r in audit['records'])), findingsBySeverity=dict(Counter(f['severity'] for r in audit['records'] for f in r['findings'])), preservedFiles=len(baseline['files']), coordinateChecks=500, maxCoordinateDifferenceMeters=structural['maxCoordinateDeltaMeters'], recoveredExactInputBatches=[r['batch'] for r in recovered['records'] if r['recoveredExactSnapshot']], publicFeatureCount=len(features), roadCount=road_count, failures=errors)
(D / 'validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(bool(errors))
