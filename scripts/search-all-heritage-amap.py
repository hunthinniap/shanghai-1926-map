"""Resume the complete heritage POI search, reusing previously searched items."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import getpass
import hashlib
import json
import os
from pathlib import Path
import queue
import subprocess
import threading
import time
import urllib.parse

ROOT = Path(__file__).resolve().parent.parent
FOLDER = ROOT / 'research/rechecks/2026-11-09-heritage-amap-pois'
CACHE = ROOT / '.cache/heritage-amap-search'
CACHE.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--workers', type=int, default=4, choices=range(1, 5))
parser.add_argument('--limit', type=int, default=0, help='Zero searches every remaining entry.')
parser.add_argument('--supplement-addresses', action='store_true', help='Only add a door-number POI lookup for unresolved newly searched entries.')
parser.add_argument('--supplement-door-text', action='store_true', help='Search unresolved addresses with the door-number type filter.')
args = parser.parse_args()
if args.supplement_addresses and args.supplement_door_text:
    parser.error('Choose one supplemental phase at a time.')
plan = json.loads((FOLDER / 'search-plan.json').read_text())
targets = {record['officialId']: record for record in plan['records']}
state_path = FOLDER / 'search-progress.json'
state = json.loads(state_path.read_text()) if state_path.exists() else {
    'startedAt': datetime.now(timezone.utc).isoformat(), 'records': {}, 'requestsThisSession': 0}
state['requestsThisSession'] = 0
state['runStatus'] = 'running'
state.pop('error', None)
lock, rate_lock, score_lock = threading.RLock(), threading.Lock(), threading.Lock()
stop = threading.Event()
request_cache = {}


def cache_key(endpoint, params):
    return hashlib.sha256(json.dumps([endpoint, params], sort_keys=True).encode()).hexdigest()


def remember(record):
    if record.get('response', {}).get('status') == '1':
        request_cache[cache_key(record['endpoint'], record['params'])] = record['response']


for filename in ['live-samples.json', 'live-detail-samples.json', 'sichuan210-live.json']:
    if not (FOLDER / filename).exists():
        continue
    data = json.loads((FOLDER / filename).read_text())
    for request in data if isinstance(data, list) else data.get('requests', [data]):
        remember(request)
ledger = CACHE / 'requests.jsonl'
if ledger.exists():
    for line in ledger.read_text().splitlines():
        try:
            remember(json.loads(line))
        except json.JSONDecodeError:
            pass


def checkpoint():
    with lock:
        counts = {}
        for record in state['records'].values():
            counts[record['status']] = counts.get(record['status'], 0) + 1
        state['summary'] = counts
        state['completed'] = len(state['records'])
        state['total'] = len(targets)
        state['updatedAt'] = datetime.now(timezone.utc).isoformat()
        temporary = state_path.with_suffix('.tmp')
        temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')
        temporary.replace(state_path)


# Honour "skip already searched": retain the existing 109 screened links and
# all seven sample searches, even if a prior sample is still unresolved.
base = json.loads((ROOT / 'src/data/heritageAmapPois.json').read_text())
for official_id, poi in base.items():
    state['records'].setdefault(official_id, {'status': 'reused-existing', 'selectedPoi': poi,
                                           'note': 'Existing screened card link; skipped as requested.'})
known = {'sh-fgj-1A001-01': 'B0015585XA', 'sh-fgj-1B007-01': 'B0G2BR8RH1',
         'sh-fgj-2A001-01': 'B0FFLE2N7F', 'sh-fgj-2A002-01': 'B00156CPZW',
         'sh-fgj-4A001-01': 'B00157HXJK', 'sh-fgj-4A016-01': 'B0FFIS2CPT',
         'sh-fgj-2A048-01': 'B0FFFWV5A6'}
known_pois = {poi['id']: poi for response in request_cache.values() for poi in response.get('pois', []) if poi.get('id')}
for official_id, poi_id in known.items():
    if official_id not in state['records'] and poi_id in known_pois:
        state['records'][official_id] = {'status': 'reused-live-confirmed', 'selectedPoi': known_pois[poi_id],
                                        'note': 'Previously searched and checked in this chat; skipped as requested.'}
state['records'].setdefault('sh-fgj-3M020-01', {'status': 'needs-review', 'selectedPoi': None,
    'note': 'Previously searched: Xinhua Road 179 returned a current hotel/police room; historical building identity remains unresolved.'})
checkpoint()
pending = [target for official_id, target in targets.items() if official_id not in state['records']]
if args.supplement_addresses:
    compiled = json.loads((FOLDER / 'search-results.json').read_text())
    pending = [targets[record['officialId']] for record in compiled['records']
               if record['status'] == 'needs-review' and record.get('referenceGcj02')
               and state['records'].get(record['officialId'], {}).get('queries')
               and not any(query['kind'] == 'door-number-poi-supplement'
                           for query in state['records'][record['officialId']]['queries'])]
if args.supplement_door_text:
    compiled = json.loads((FOLDER / 'search-results.json').read_text())
    pending = [targets[record['officialId']] for record in compiled['records']
               if record['status'] == 'needs-review'
               and any(query['kind'] in ['full-listed-address', 'source-alternative-address', 'explicit-street-component', 'range-start-door', 'range-end-door']
                       for query in targets[record['officialId']]['queries'])
               and not any(query['kind'] == 'door-text-supplement'
                           for query in state['records'][record['officialId']].get('queries', []))]
if args.limit:
    pending = pending[:args.limit]
state['phase'] = 'door-text-supplement' if args.supplement_door_text else 'door-number-supplement' if args.supplement_addresses else 'remaining-entries'
state['phaseTargets'] = len(pending)
state['phaseCompleted'] = 0
print(json.dumps({'total': len(targets), 'alreadySearched': len(state['records']), 'toSearch': len(pending),
                  'cachedRequests': len(request_cache)}, ensure_ascii=False), flush=True)
if not pending:
    state['runStatus'] = 'complete'
    checkpoint()
    raise SystemExit(0)
key = os.environ.get('AMAP_WEB_SERVICE_KEY') or getpass.getpass('AMap key (hidden): ')
if not key:
    raise SystemExit('A key is required.')
scorer = subprocess.Popen(['node', 'scripts/amap-review-worker.mjs'], cwd=ROOT,
                          stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
next_request_time = 0.0


def review(target, pois):
    with score_lock:
        scorer.stdin.write(json.dumps({'target': target, 'candidates': pois}, ensure_ascii=False) + '\n')
        scorer.stdin.flush()
        result = json.loads(scorer.stdout.readline())
        if result.get('error'):
            raise RuntimeError(result['error'])
        return result


def request(endpoint, params):
    global next_request_time
    token = cache_key(endpoint, params)
    with lock:
        if token in request_cache:
            return request_cache[token], token, True
    for attempt in range(3):
        if stop.is_set():
            raise InterruptedError('Search stopped')
        with rate_lock:
            delay = next_request_time - time.monotonic()
            if delay > 0:
                time.sleep(delay)
            next_request_time = time.monotonic() + 0.5
        url = endpoint + '?' + urllib.parse.urlencode({**params, 'key': key})
        result = subprocess.run(['curl', '--silent', '--show-error', '--max-time', '20', '--config', '-'],
                                input='url = ' + json.dumps(url) + '\n', capture_output=True, text=True)
        with lock:
            state['requestsThisSession'] += 1
        if result.returncode:
            if attempt < 2:
                time.sleep(1 + attempt)
                continue
            raise ConnectionError(f'Transport failure (curl {result.returncode})')
        try:
            response = json.loads(result.stdout)
        except json.JSONDecodeError:
            if attempt < 2:
                continue
            raise ConnectionError('Non-JSON API response')
        if response.get('status') != '1':
            info = response.get('info', 'Unknown API error').replace(key, '[REDACTED]')
            if any(value in info.upper() for value in ['QPS', 'FREQUENT', 'BUSY']) and attempt < 2:
                time.sleep(3 * (attempt + 1))
                continue
            with lock:
                state['error'] = {'info': info, 'infocode': response.get('infocode')}
            stop.set()
            raise InterruptedError(info)
        entry = {'requestId': token, 'endpoint': endpoint, 'params': params,
                 'queriedAt': datetime.now(timezone.utc).isoformat(), 'response': response}
        with lock:
            request_cache[token] = response
            with ledger.open('a') as stream:
                stream.write(json.dumps(entry, ensure_ascii=False).replace(key, '[REDACTED]') + '\n')
        return response, token, False
    raise ConnectionError('Request attempts exhausted')


def search(target):
    candidates, provenance = {}, {}
    completed_queries = []

    def collect(endpoint, params, kind):
        response, token, cached = request(endpoint, params)
        completed_queries.append({'kind': kind, 'requestId': token, 'endpoint': endpoint, 'params': params, 'cached': cached})
        for poi in response.get('pois', []):
            if not poi.get('id'):
                continue
            candidates[poi['id']] = poi
            provenance.setdefault(poi['id'], []).append(token)
            for child in poi.get('children') or []:
                if child.get('id'):
                    # Children may omit adcode; inherit only geographic fields.
                    candidates.setdefault(child['id'], {**child, 'parent': poi['id'], 'adcode': poi.get('adcode')})
                    provenance.setdefault(child['id'], []).append(token)
        return review(target, list(candidates.values()))

    result = review(target, [])
    def finished(result):
        selected = result['selected']
        return {'status': result['status'], 'selectedPoi': selected['poi'] if selected else None,
                'evidence': {field: value for field, value in selected.items() if field != 'poi'} if selected else None,
                'ambiguous': result['ambiguous'], 'queries': completed_queries,
                'candidates': [{**candidate, 'requestIds': provenance.get(candidate['poi']['id'], [])} for candidate in result['candidates'][:12]]}

    if args.supplement_addresses or args.supplement_door_text:
        previous = state['records'][target['officialId']]
        completed_queries.extend(previous.get('queries', []))
        for query in previous.get('queries', []):
            cached = request_cache.get(cache_key(query['endpoint'], query['params']), {})
            for poi in cached.get('pois', []):
                if not poi.get('id'):
                    continue
                candidates[poi['id']] = poi
                provenance.setdefault(poi['id'], []).append(query['requestId'])
                for child in poi.get('children') or []:
                    if child.get('id'):
                        candidates.setdefault(child['id'], {**child, 'parent': poi['id'], 'adcode': poi.get('adcode')})
        if args.supplement_door_text:
            variants = [query for query in target['queries'] if query['kind'] in
                        ['full-listed-address', 'source-alternative-address', 'explicit-street-component', 'range-start-door', 'range-end-door']]
            for query in variants[:4]:
                params = {field: value for field, value in query.items() if field != 'kind'}
                params['types'] = '190400'
                result = collect(plan['textEndpoint'], params, 'door-text-supplement')
                if result['selected']:
                    break
            return finished(result)
        around = target['aroundFallback']
        params = {field: value for field, value in around.items() if field not in ['endpoint', 'note']}
        params.update({'types': '190400', 'radius': '150'})
        result = collect(around['endpoint'], params, 'door-number-poi-supplement')
        return finished(result)
    for query in target['queries']:
        params = {field: value for field, value in query.items() if field != 'kind'}
        result = collect(plan['textEndpoint'], params, query['kind'])
        if result['selected']:
            break
    # A parent is a candidate, never an automatic building identity.
    def parent_candidates(result):
        return list(dict.fromkeys(item['poi']['parent'] for item in result['candidates']
            if item['poi'].get('parent') and item['poi']['parent'] != 'B0FFG7HY0E'
            and not item['wrongDistrict'] and not item['rejectedType']
            and item['distanceMetres'] is not None and item['distanceMetres'] <= 200
            and (item['addressOverlap'] or item['matchedName'])))[:3]

    parents = parent_candidates(result) if not result['selected'] else []
    if parents:
        result = collect('https://restapi.amap.com/v5/place/detail',
                         {'id': '|'.join(parents), 'show_fields': 'children,business,navi,indoor'}, 'parent-detail')
    if not result['selected'] and target.get('aroundFallback'):
        around = target['aroundFallback']
        params = {field: value for field, value in around.items() if field not in ['endpoint', 'note']}
        params['types'] = '120000|110000|140000|090100|130000'
        result = collect(around['endpoint'], params, 'nearby-building-reference')
        more_parents = [parent for parent in parent_candidates(result) if parent not in parents]
        if more_parents:
            result = collect('https://restapi.amap.com/v5/place/detail',
                             {'id': '|'.join(more_parents), 'show_fields': 'children,business,navi,indoor'}, 'nearby-parent-detail')
    return finished(result)


work = queue.Queue()
for target in pending:
    work.put(target)


def worker():
    while not stop.is_set():
        try:
            target = work.get_nowait()
        except queue.Empty:
            return
        try:
            result = search(target)
            with lock:
                state['records'][target['officialId']] = result
                state.get('transportFailures', {}).pop(target['officialId'], None)
                state['phaseCompleted'] += 1
                checkpoint()
                if state['phaseCompleted'] % 10 == 0:
                    print(json.dumps({'completed': len(state['records']), 'total': len(targets),
                                      'phase': state['phase'], 'phaseCompleted': state['phaseCompleted'], 'phaseTargets': state['phaseTargets'],
                                      'requests': state['requestsThisSession'], 'summary': state['summary']}, ensure_ascii=False), flush=True)
        except InterruptedError:
            checkpoint()
            return
        except Exception as error:
            with lock:
                state.setdefault('transportFailures', {})[target['officialId']] = type(error).__name__
                checkpoint()
            print(json.dumps({'retryOnResume': target['officialId'], 'error': type(error).__name__}), flush=True)
        finally:
            work.task_done()


try:
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(worker) for _ in range(args.workers)]
        for future in futures:
            future.result()
finally:
    state['runStatus'] = 'api-stopped' if stop.is_set() else 'complete' if len(state['records']) == len(targets) and state['phaseCompleted'] == state['phaseTargets'] else 'partial'
    checkpoint()
    scorer.stdin.close()
    scorer.wait(timeout=10)
print(json.dumps({'runStatus': state['runStatus'], 'completed': state['completed'], 'total': state['total'],
                  'requests': state['requestsThisSession'], 'summary': state['summary'], 'error': state.get('error')}, ensure_ascii=False), flush=True)
