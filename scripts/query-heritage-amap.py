"""Fetch bounded AMap candidate samples. Credentials never enter saved files."""
import argparse
import datetime
import getpass
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.parse

ROOT = Path(__file__).resolve().parent.parent
FOLDER = ROOT / 'research/rechecks/2026-11-09-heritage-amap-pois'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--ids', required=True, help='Comma-separated official IDs; no implicit full-dataset run.')
parser.add_argument('--max-queries-per-building', type=int, default=3)
parser.add_argument('--max-requests', type=int, default=20)
parser.add_argument('--output', type=Path, default=FOLDER / 'live-samples.json')
parser.add_argument('--resume', action='store_true', help='Reuse completed requests from the output file.')
args = parser.parse_args()
if not 1 <= args.max_requests <= 100 or not 1 <= args.max_queries_per_building <= 20:
    parser.error('Use a bounded request limit (1–100) and query limit (1–20).')
plan = json.loads((FOLDER / 'search-plan.json').read_text())
ids = set(args.ids.split(','))
targets = [record for record in plan['records'] if record['officialId'] in ids]
if {record['officialId'] for record in targets} != ids:
    parser.error('Unknown official ID in --ids.')
key = os.environ.get('AMAP_WEB_SERVICE_KEY') or getpass.getpass('AMap key (hidden): ')
if not key:
    parser.error('An AMap Web Service key is required.')
responses = []
output = {'queriedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'method': 'Separate names/aliases/addresses; retain all returned candidates, no automatic assignment.',
          'requests': responses}
if args.resume and args.output.exists():
    output = json.loads(args.output.read_text())
    responses = output['requests']
completed = {(record['officialId'], json.dumps(record['params'], sort_keys=True)) for record in responses
             if record['response'].get('status') == '1'}
new_requests = 0


def save():
    args.output.parent.mkdir(parents=True, exist_ok=True)
    # API responses are data, but still redact unexpected credential echoes.
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2).replace(key, '[REDACTED]') + '\n')


for target in targets:
    for query in target['queries'][:args.max_queries_per_building]:
        if new_requests >= args.max_requests:
            break
        params = {field: value for field, value in query.items() if field != 'kind'}
        if (target['officialId'], json.dumps(params, sort_keys=True)) in completed:
            continue
        url = plan['textEndpoint'] + '?' + urllib.parse.urlencode({**params, 'key': key})
        result = subprocess.run(['curl', '--silent', '--show-error', '--max-time', '25', '--retry', '1',
                                 '--retry-all-errors', '--retry-delay', '1', '--config', '-'],
                                input='url = ' + json.dumps(url) + '\n', capture_output=True, text=True)
        if result.returncode:
            print(f"{target['code']}: transport error (curl {result.returncode}); saved completed requests", flush=True)
            save()
            raise SystemExit(1)
        try:
            response = json.loads(result.stdout)
        except json.JSONDecodeError:
            print(f"{target['code']}: non-JSON response; saved completed requests", flush=True)
            save()
            raise SystemExit(1)
        responses.append({'officialId': target['officialId'], 'queryKind': query['kind'],
                          'endpoint': plan['textEndpoint'], 'params': params, 'response': response})
        new_requests += 1
        save()
        print(json.dumps({'code': target['code'], 'query': params['keywords'], 'info': response.get('info'),
                          'count': len(response.get('pois', [])),
                          'top': [{field: poi.get(field) for field in ['id', 'name', 'address', 'adcode', 'parent']}
                                  for poi in response.get('pois', [])[:3]]}, ensure_ascii=False).replace(key, '[REDACTED]'), flush=True)
        if response.get('status') != '1':
            raise SystemExit('API rejected the request; stopped without retrying the batch.')
        time.sleep(0.35)
    if new_requests >= args.max_requests:
        break
print(f'Saved {len(responses)} requests to {args.output}', flush=True)
