"""Continue unresolved heritage POI research through the user-selected MCP.

The persisted user-authorized ceiling includes six initial pilot calls (five
had invalid Chinese transport and are excluded from evidence). No API key is stored.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import re
from pathlib import Path
import subprocess
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from heritage_amap_mcp import ConfiguredMcpClient

ROOT = Path(__file__).resolve().parent.parent
FOLDER = ROOT / 'research/rechecks/2026-11-09-heritage-amap-pois'
CACHE = ROOT / '.cache/heritage-amap-search'
CACHE.mkdir(parents=True, exist_ok=True)
SERVER = 'market-cmgjmcp00074909'
TOOLS = {'amap_poi_search', 'amap_poi_detail'}
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--limit', type=int, default=0, help='Optional small-batch building limit; zero continues every pending item within budget.')
parser.add_argument('--supplement', action='store_true', help='Only new precise component, alternative-address and range-end queries for unresolved records.')
parser.add_argument('--dry-run', action='store_true', help='List the planned batch without changing state or calling the service.')
args = parser.parse_args()
read = lambda path: json.loads(path.read_text())
report = read(FOLDER / 'search-results.json')
plan = {r['officialId']: r for r in read(FOLDER / 'search-plan.json')['records']}
web_state = read(FOLDER / 'search-progress.json')['records']
state_path = FOLDER / 'market-progress.json'
state = read(state_path) if state_path.exists() else {
    'server': SERVER, 'maxCredits': 500, 'creditsSpent': 6, 'uncertainCredits': 0,
    'calls': 6, 'invalidPilotCalls': 5, 'records': {}, 'transportFailures': {},
    'note': '500积分为用户明确上限；消耗包含初始6次试查，前5次中文传输错误不作为地点证据。'}
state['runStatus'] = 'running'
state.pop('error', None)


def now():
    return datetime.now(timezone.utc).isoformat()


def checkpoint():
    state['updatedAt'] = now()
    state['completed'] = len(state['records'])
    state['creditsConfirmed'] = state['creditsSpent'] - state['uncertainCredits']
    tmp = state_path.with_suffix('.tmp')
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')
    tmp.replace(state_path)


def token(tool, params):
    endpoint = 'mcp://' + SERVER + '/' + tool
    return hashlib.sha256(json.dumps([endpoint, params], sort_keys=True).encode()).hexdigest()


districts = read(FOLDER / 'search-plan.json')['districtCodes']


def normalize_poi(poi):
    normalized = {key: value if isinstance(value, str) else '' for key, value in poi.items()
                  if key in ['id', 'name', 'address', 'location', 'parent', 'type', 'typecode',
                             'adcode', 'adname', 'cityname', 'pname', 'pcode']}
    if not normalized.get('adcode') and normalized.get('pname') == '上海市':
        normalized['adcode'] = districts.get(normalized.get('adname'), '')
        normalized['adcodeSource'] = 'MCP返回的上海市区县名称对照现行区县代码'
    return normalized


def unpack(result):
    payload, charges = None, []
    if not isinstance(result, dict):
        raise RuntimeError('MCP returned no tool result.')
    for block in result.get('content', []):
        if block.get('type') != 'text':
            continue
        try:
            value = json.loads(block['text'])
        except (ValueError, KeyError):
            continue
        if isinstance(value, dict) and 'amount' in value:
            charges.append({key: value.get(key) for key in ['amount', 'unit', 'estimated']})
        elif isinstance(value, dict) and ('pois' in value or 'status' in value):
            payload = value
    return payload, charges


ledger = CACHE / 'requests.jsonl'
responses = {}
if ledger.exists():
    for line in ledger.read_text().splitlines():
        try:
            entry = json.loads(line)
            responses[entry['requestId']] = entry['response']
        except (ValueError, KeyError):
            pass
# Import the sixth pilot's correctly transmitted response without another call.
sample_path = ROOT / '.cache/market-mcp-valid-sample.json'
if sample_path.exists():
    sample = read(sample_path)
    payload, charges = unpack(sample['result'])
    request_id = token(sample['tool'], sample['arguments'])
    if payload and payload.get('status') == '1' and request_id not in responses:
        response = {'status': '1', 'pois': [normalize_poi(poi) for poi in payload.get('pois', [])]}
        with ledger.open('a') as stream:
            stream.write(json.dumps({'requestId': request_id, 'endpoint': 'mcp://' + SERVER + '/' + sample['tool'],
                'params': sample['arguments'], 'queriedAt': sample['queriedAt'], 'response': response, 'charges': charges}, ensure_ascii=False) + '\n')
        responses[request_id] = response

linked = {'reused-existing', 'reused-live-confirmed', 'reviewed-match', 'matched-building', 'matched-address', 'matched-name-reference'}
unresolved = [r for r in report['records'] if r['status'] not in linked]
priority = {'insufficient-evidence': 0, 'tenant-only-evidence': 1, 'name-address-discrepancy': 2,
            'multiple-candidates': 3, 'protected-component': 4, 'reference-position-conflict': 5,
            'shared-poi': 6, 'missing-reference': 7}
unresolved.sort(key=lambda r: (priority.get(r.get('reviewReasonCode'), 8), r['batch'], r['code']))


def supplemental_variants(target):
    queries = target['queries']
    components = [q['keywords'] for q in queries if q['kind'] == 'listed-use-name'
                  and re.search(r'\d+\s*号楼|主楼|水塔|[东西南北]楼', q['keywords'])]
    doors = [q['keywords'] for kind in ['range-start-door', 'range-end-door', 'source-alternative-address']
             for q in queries if q['kind'] == kind]
    # Use a distinct historical/building alias when the earlier first pass
    # searched a whole institution's article title instead.
    aliases = [q['keywords'] for kind in ['wikipedia-name', 'historic-name']
               for q in queries if q['kind'] == kind and len(q['keywords']) >= 3]
    return [keyword for keyword in dict.fromkeys(components + doors + aliases)
            if token('amap_poi_search', {'keywords': keyword, 'city': '上海', 'citylimit': True}) not in responses][:3]


if args.supplement:
    pending = [r for r in unresolved if r['officialId'] not in state.get('supplementRecords', {})
               and supplemental_variants(plan[r['officialId']])]
    state['totalTargets'] = max(state.get('totalTargets', 0), len(set(state['records']) | {r['officialId'] for r in pending}))
else:
    pending = [r for r in unresolved if r['officialId'] not in state['records']]
    state['totalTargets'] = len(pending) + len(state['records'])
if args.limit:
    pending = pending[:args.limit]
state['phaseMode'] = 'supplement' if args.supplement else 'first-pass'
state['phaseTargets'] = len(pending)
state['phaseCompleted'] = 0
if args.dry_run:
    print(json.dumps({'mode': state['phaseMode'], 'pending': len(pending),
                      'remainingBudget': state['maxCredits'] - state['creditsSpent'],
                      'examples': [{'code': r['code'], 'keywords': supplemental_variants(plan[r['officialId']])}
                                   for r in pending[:8]]}, ensure_ascii=False), flush=True)
    raise SystemExit(0)
checkpoint()
print(json.dumps({'pendingThisBatch': len(pending), 'creditsSpent': state['creditsSpent'],
                  'ceiling': state['maxCredits'], 'cachedRequests': len(responses)}, ensure_ascii=False), flush=True)
if not pending:
    state['runStatus'] = 'complete'
    checkpoint()
    raise SystemExit(0)
client = ConfiguredMcpClient(SERVER)
client.initialize()
scorer = subprocess.Popen(['node', 'scripts/amap-review-worker.mjs'], cwd=ROOT,
                          stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)


def review(target, candidates):
    scorer.stdin.write(json.dumps({'target': target, 'candidates': list(candidates.values())}, ensure_ascii=False) + '\n')
    scorer.stdin.flush()
    result = json.loads(scorer.stdout.readline())
    if result.get('error'):
        raise RuntimeError(result['error'])
    return result


def request(tool, params):
    request_id = token(tool, params)
    if request_id in responses:
        return responses[request_id], request_id, True
    if state['creditsSpent'] + 1 > state['maxCredits']:
        raise InterruptedError('budget-exhausted')
    # Reserve the possible one-credit charge before sending a billed call.
    state['creditsSpent'] += 1
    state['uncertainCredits'] += 1
    state['calls'] += 1
    checkpoint()
    result = client.call_read_tool(tool, params, TOOLS)
    payload, charges = unpack(result)
    if charges:
        if any(c['unit'] != '积分' or not isinstance(c['amount'], (int, float)) for c in charges):
            raise InterruptedError('unexpected-charge-unit')
        amount = sum(c['amount'] for c in charges)
        state['creditsSpent'] += amount - 1
        if not any(c.get('estimated') for c in charges):
            state['uncertainCredits'] -= 1
    if result.get('isError') or not payload or payload.get('status') != '1':
        state['error'] = {'tool': tool, 'info': payload.get('info') if payload else 'MCP tool error',
                          'infocode': payload.get('infocode') if payload else None}
        checkpoint()
        raise InterruptedError('service-stopped')
    response = {'status': '1', 'pois': [normalize_poi(poi) for poi in payload.get('pois', []) if poi.get('id')]}
    entry = {'requestId': request_id, 'endpoint': 'mcp://' + SERVER + '/' + tool,
             'params': params, 'queriedAt': now(), 'response': response, 'charges': charges}
    with ledger.open('a') as stream:
        stream.write(json.dumps(entry, ensure_ascii=False) + '\n')
    responses[request_id] = response
    checkpoint()
    time.sleep(0.35)
    return response, request_id, False


def search(record):
    target = plan[record['officialId']]
    candidates = {candidate['poi']['id']: candidate['poi'] for candidate in record.get('candidates', [])}
    queries = []
    for query in web_state.get(target['officialId'], {}).get('queries', []):
        for poi in responses.get(query['requestId'], {}).get('pois', []):
            if poi.get('id'):
                candidates[poi['id']] = poi
    def collect(tool, params):
        response, request_id, cached = request(tool, params)
        queries.append({'kind': 'market-mcp-' + tool, 'requestId': request_id,
                        'endpoint': 'mcp://' + SERVER + '/' + tool, 'params': params, 'cached': cached})
        for poi in response['pois']:
            candidates[poi['id']] = poi
        return review(target, candidates)

    # Prefer a full official door; add one distinct physical/alias query when
    # the address search is inconclusive. Previous queries remain evidence.
    variants = []
    address = next((q['keywords'] for q in target['queries'] if q['kind'] == 'full-listed-address'), None)
    if address:
        variants.append(address)
    names = [q['keywords'] for kind in ['article-name', 'wikipedia-name', 'historic-name']
             for q in target['queries'] if q['kind'] == kind and len(q['keywords']) >= 3]
    if names:
        variants.append(names[0])
    if len(variants) < 2:
        variants.extend(q['keywords'] for q in target['queries'] if q['kind'] == 'source-alternative-address')
    variants = supplemental_variants(target) if args.supplement else list(dict.fromkeys(variants))[:2]
    result = review(target, candidates)
    for keyword in variants:
        result = collect('amap_poi_search', {'keywords': keyword, 'city': '上海', 'citylimit': True})
        if result['selected']:
            break
    if not result['selected']:
        parents = [c['poi'].get('parent') for c in result['candidates']
                   if c['poi'].get('parent') and c['poi']['parent'] != 'B0FFG7HY0E'
                   and c['poi']['parent'] not in candidates and not c['wrongDistrict']
                   and c['distanceMetres'] is not None and c['distanceMetres'] <= 160
                   and (c['addressOverlap'] or c['matchedName'])]
        if parents:
            result = collect('amap_poi_detail', {'id': parents[0]})
    selected = result['selected']
    return {'status': result['status'], 'selectedPoi': selected['poi'] if selected else None,
            'evidence': {k: v for k, v in selected.items() if k != 'poi'} if selected else None,
            'queries': queries, 'ambiguous': result['ambiguous'], 'checkedAt': now(),
            'candidates': result['candidates'][:12]}


failures = 0
try:
    for record in pending:
        try:
            result = search(record)
            previous = state['records'].get(record['officialId'], {})
            result['queries'] = list({q['requestId']: q for q in previous.get('queries', []) + result['queries']}.values())
            state['records'][record['officialId']] = result
            if args.supplement:
                state.setdefault('supplementRecords', {})[record['officialId']] = {'checkedAt': now(), 'status': result['status']}
            state['transportFailures'].pop(record['officialId'], None)
            state['phaseCompleted'] += 1
            failures = 0
            checkpoint()
            if state['phaseCompleted'] % 5 == 0:
                print(json.dumps({'completed': state['phaseCompleted'], 'batch': len(pending),
                    'creditsSpent': state['creditsSpent'], 'uncertainCredits': state['uncertainCredits'],
                    'acceptedBeforeSharedPoiCheck': sum(r['status'].startswith('matched-') for r in state['records'].values())}, ensure_ascii=False), flush=True)
        except ConnectionError as error:
            failures += 1
            state['transportFailures'][record['officialId']] = str(error)
            checkpoint()
            if failures >= 3:
                raise InterruptedError('transport-stopped')
    state['runStatus'] = ('supplement-complete' if state['phaseCompleted'] == len(pending) else 'partial') if args.supplement else ('complete' if len(state['records']) >= state['totalTargets'] else 'partial')
except InterruptedError as error:
    state['runStatus'] = str(error)
except Exception as error:
    state['runStatus'] = 'tool-error'
    state['error'] = {'info': client.redact(str(error)), 'type': type(error).__name__}
finally:
    checkpoint()
    scorer.stdin.close()
    scorer.wait(timeout=10)
print(json.dumps({'runStatus': state['runStatus'], 'completed': state['completed'],
                  'creditsSpent': state['creditsSpent'], 'uncertainCredits': state['uncertainCredits'],
                  'error': state.get('error')}, ensure_ascii=False), flush=True)
