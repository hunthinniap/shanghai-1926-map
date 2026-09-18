#!/usr/bin/env python3
"""Validate 001–010 corrections against immutable git data. Writes only validation.json.

Run after application: python3 research/corrections/2026-09-18-001-010/validate-corrections.py
Patch keys must match the plans. Additional nonhistorical record changes are reported,
not rejected merely because they were not enumerated in a plan. Geometry, historical
fields, protected files and untargeted map groups are always immutable.
"""
from __future__ import annotations
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from collections import Counter

HERE = Path(__file__).resolve().parent
ROOT = next(p for p in HERE.parents if (p / 'package.json').exists() and (p / 'scripts').is_dir())
AUDIT_DIR = 'research/rechecks/2026-09-18-001-010'
FEATURE_PATH = 'public/data/historical-features.geojson'
OVERRIDE_PATH = 'scripts/data/landmark-current-use-overrides.json'
MAP_AUDIT_PATH = 'public/data/landmark-current-use-audit.json'
HOLD_PATH = 'scripts/data/landmark-current-use-holds.json'
MISSING = object()
RAW_FIELDS = ('IDBAT', 'NAME', 'F_ADDRESS', 'FUNCTION', 'XC', 'YC')
RESULT_HISTORY = RAW_FIELDS + ('historicalNameZh', 'historicalStartYear', 'historicalEndYear', 'coordinates', 'historicalRoadMappings')
WORKFLOW_HISTORY = ('IDBAT', 'historicalName', 'historicalStartYear', 'historicalEndYear', 'coordinates')
RELATIONSHIP_MAP = {
    'same-building': 'same-building', 'same-building-repurposed': 'same-building',
    'same-site-repurposed': 'same-site-repurposed', 'same-site-rebuilt': 'same-site-continuing-use',
    'same-site-continuing-use': 'same-site-continuing-use',
    'same-site-institutional-continuity': 'same-site-continuing-use',
    'demolished-site-redeveloped': 'site-redeveloped',
    'site-redeveloped-partially-preserved': 'partial-remains-on-original-site',
}


def serial(value):
    return '<absent>' if value is MISSING else value


def records(document):
    if isinstance(document, list):
        return document
    return document.get('records', [])


def changed_keys(old, new):
    return sorted(k for k in set(old) | set(new) if old.get(k, MISSING) != new.get(k, MISSING))


class Validator:
    def __init__(self):
        self.errors = []
        self.extra_changes = []
        self.changed = {'workflow': [], 'result': [], 'part': []}
        self.file_metadata_changes = []
        self.derived_research_changes = []
        self.map_representation_differences = []
        self.report = {}
        self.cache = {}
        self.synchronization_ids = set()
        self.baseline = json.loads((HERE / 'baseline.json').read_text())
        self.base = self.baseline['baseCommit']

    def check(self, condition, code, **details):
        if not condition:
            self.errors.append({'code': code, **details})
        return condition

    def current(self, path):
        return json.loads((ROOT / path).read_text())

    def original(self, path, optional=False):
        if path not in self.cache:
            proc = subprocess.run(['git', 'show', f'{self.base}:{path}'], cwd=ROOT, capture_output=True)
            if proc.returncode:
                if optional:
                    self.cache[path] = None
                else:
                    raise RuntimeError(f'git show failed for {path}: {proc.stderr.decode().strip()}')
            else:
                self.cache[path] = json.loads(proc.stdout)
        return self.cache[path]

    def index(self, rows, key, label):
        values = [r[key] for r in rows]
        self.check(len(values) == len(set(values)), 'duplicate-records', layer=label, key=key)
        return {r[key]: r for r in rows}

    def immutable_fields(self, old, new, fields, label, id):
        for key in fields:
            self.check(old.get(key, MISSING) == new.get(key, MISSING), 'historical-field-changed', layer=label,
                       IDBAT=id, field=key, before=serial(old.get(key, MISSING)), after=serial(new.get(key, MISSING)))

    def check_patch(self, actual, patch, label, id):
        for key, value in patch.items():
            self.check(key in actual and actual[key] == value, 'plan-patch-not-applied', layer=label,
                       IDBAT=id, field=key, expected=value, actual=serial(actual.get(key, MISSING)))

    def compare_layer(self, old_doc, new_doc, layer, path, plans, protected):
        old = self.index(records(old_doc), 'IDBAT', path + ':base')
        new = self.index(records(new_doc), 'IDBAT', path + ':current')
        self.check(set(old) == set(new), 'record-ids-changed', layer=layer, path=path,
                   removed=sorted(set(old)-set(new)), added=sorted(set(new)-set(old)))
        patch_name = {'workflow': 'workflowPatch', 'result': 'resultPatch', 'part': 'partPatch'}[layer]
        for id in old.keys() & new.keys():
            # #460 has one explicitly authorized derived road-name synchronization, never a raw-address edit.
            fields = tuple(k for k in protected if not (id == 460 and id in self.synchronization_ids
                           and layer == 'result' and k == 'historicalRoadMappings'))
            self.immutable_fields(old[id], new[id], fields, layer, id)
            patch = plans.get(id, {}).get(patch_name, {})
            self.check_patch(new[id], patch, layer, id)
            keys = changed_keys(old[id], new[id])
            if layer == 'workflow':
                for key in ('historicalNameCorrectionZh', 'modernRoadAddress'):
                    if key in keys:
                        self.derived_research_changes.append({'IDBAT':id,'field':key,'planned':key in patch,
                            'before':serial(old[id].get(key,MISSING)),'after':serial(new[id].get(key,MISSING))})
            if id not in plans:
                self.check(not keys, 'untargeted-research-record-changed', layer=layer, path=path, IDBAT=id, fields=keys)
            if keys:
                self.changed[layer].append({'IDBAT': id, 'path': path, 'fields': keys})
            extra = [k for k in keys if k not in patch]
            if extra:
                self.extra_changes.append({'layer': layer, 'path': path, 'IDBAT': id,
                    'changes': [{'field': k, 'before': serial(old[id].get(k, MISSING)),
                                 'after': serial(new[id].get(k, MISSING))} for k in extra]})
            if id == 569:
                self.check(old[id] == new[id], '569-record-changed', layer=layer, path=path)
        if isinstance(old_doc, dict) and isinstance(new_doc, dict):
            keys = changed_keys({k:v for k,v in old_doc.items() if k != 'records'},
                                {k:v for k,v in new_doc.items() if k != 'records'})
            if keys:
                self.file_metadata_changes.append({'path': path, 'fields': keys})
        return old, new

    def run(self):
        self.check(self.base.startswith('3381150'), 'unexpected-base-commit', actual=self.base)
        plans_list = []
        for name in ('a-plan.json', 'b-plan.json', 'c-plan.json'):
            plans_list.extend(records(json.loads((HERE / name).read_text())))
        finding_plans_list = list(plans_list)
        finding_plans = self.index(finding_plans_list, 'IDBAT', 'finding-plans')
        finding_rows = records(self.original(f'{AUDIT_DIR}/audit.json'))
        findings = {r['IDBAT'] for r in finding_rows if r.get('findings')}
        self.check(len(findings) == 100, 'unexpected-finding-count', actual=len(findings))
        self.check(len(finding_plans_list) == 100 and set(finding_plans) == findings, 'finding-plan-coverage',
                   planCount=len(finding_plans_list), missing=sorted(findings-set(finding_plans)),
                   unexpected=sorted(set(finding_plans)-findings))
        synchronization_list=records(json.loads((HERE/'synchronization-plan.json').read_text()))
        sync=self.index(synchronization_list,'IDBAT','synchronization-plans')
        self.synchronization_ids=set(sync)
        self.check(len(synchronization_list)==2 and set(sync)=={242,460},'synchronization-plan-coverage',actual=sorted(sync))
        self.check(not set(sync)&set(finding_plans),'synchronization-overlaps-findings',IDs=sorted(set(sync)&set(finding_plans)))
        allowed={242:{'workflowPatch':{'sourceUrls'},'resultPatch':{'references'},
                      'partPatch':{'currentNameZh','currentAddress','currentUse','relationship','verificationStatus','notes','sources'}},
                 460:{'workflowPatch':{'modernRoadAddress'},'resultPatch':{'historicalRoadMappings'},'partPatch':set()}}
        for id,plan in sync.items():
            self.check(plan.get('mapAction')=='retain' and not plan.get('mapPatch'),'synchronization-must-retain-map',IDBAT=id)
            for layer,fields in allowed.get(id,{}).items():
                self.check(set(plan.get(layer,{}))<=fields,'synchronization-scope-exceeded',IDBAT=id,layer=layer,
                           unexpected=sorted(set(plan.get(layer,{}))-fields))
        plans_list.extend(synchronization_list)
        plans = self.index(plans_list, 'IDBAT', 'all-plans')
        self.check(569 not in plans, '569-unexpected-plan')
        for row in plans_list:
            self.check(row.get('mapAction') in ('retain', 'update', 'hold'), 'invalid-map-action', IDBAT=row['IDBAT'])
            source = next((r for r in finding_rows if r['IDBAT'] == row['IDBAT']), None)
            self.check(source is not None and row['batch'] == source['batch'], 'plan-batch-mismatch', IDBAT=row['IDBAT'])
        # Hashes are checked before any data comparisons; old audits are read, never rewritten.
        for path, expected in self.baseline['protectedFiles'].items():
            f = ROOT / path
            actual = hashlib.sha256(f.read_bytes()).hexdigest() if f.is_file() else None
            self.check(actual == expected, 'protected-file-hash-changed', path=path, expected=expected, actual=actual)
        old_workflows = {}; workflows = {}; result_rows = {}; part_rows = {}
        for num in range(1, 11):
            batch = f'{num:03d}'
            wf_path = f'scripts/data/unresolved-landmarks-{batch}-research.json'
            ow, nw = self.compare_layer(self.original(wf_path), self.current(wf_path), 'workflow', wf_path, plans, WORKFLOW_HISTORY)
            self.check(len(ow) == len(nw) == 50, 'batch-size', batch=batch, before=len(ow), after=len(nw))
            old_workflows.update(ow); workflows.update(nw)
            self.check(not str(self.current(wf_path).get('input', '')).startswith('public/data/unresolved-landmarks/'),
                       'mutable-public-input-pointer', batch=batch)
            result_path = f'research/unresolved-landmarks/{batch}-results.json'
            old_doc = self.original(result_path, optional=True)
            if old_doc is not None:
                _, nr = self.compare_layer(old_doc, self.current(result_path), 'result', result_path, plans, RESULT_HISTORY)
                result_rows.update(nr)
            else:
                for plan in plans_list:
                    if plan['batch'] == batch:
                        self.check(not plan.get('resultPatch'), 'patch-for-missing-result', IDBAT=plan['IDBAT'], path=result_path)
            for part in 'abc':
                part_path = f'research/unresolved-landmarks/{batch}-{part}.json'
                old_part = self.original(part_path, optional=True)
                if old_part is None:
                    continue
                _, nr = self.compare_layer(old_part, self.current(part_path), 'part', part_path, plans, ('IDBAT',))
                for id, row in nr.items():
                    self.check(id not in part_rows, 'part-id-duplicate', IDBAT=id)
                    part_rows[id] = row
        self.check(len(old_workflows) == len(workflows) == 500, '500-record-coverage', before=len(old_workflows), after=len(workflows))
        self.check(set(old_workflows) == set(workflows), '500-id-set-changed')
        for id, plan in plans.items():
            self.check(id in workflows, 'planned-workflow-missing', IDBAT=id)
            self.check(not plan.get('partPatch') or id in part_rows, 'planned-part-missing', IDBAT=id)
            wf = workflows[id]
            if id in result_rows:
                rr = result_rows[id]
                self.check(rr.get('notes') == wf.get('evidence'), 'result-workflow-notes-mismatch', IDBAT=id)
                for key in ('currentNameZh', 'currentUse', 'currentAddress'):
                    self.check(rr.get(key) == wf.get(key), 'result-workflow-current-mismatch', IDBAT=id, field=key)
                expected_status = {'verified':'resolved', 'likely':'probable', 'unresolved':'unresolved'}.get(rr.get('verificationStatus'))
                self.check(wf.get('resolutionStatus') == expected_status, 'result-workflow-status-mismatch', IDBAT=id)
                self.check(wf.get('currentUseRelationship') == (rr.get('relationship') or 'coordinate-only'),
                           'result-workflow-relation-mismatch', IDBAT=id)
                if id in part_rows:
                    pr = part_rows[id]
                    for key in ('currentNameZh','currentAddress','currentUse','relationship','verificationStatus','notes'):
                        self.check(pr.get(key) == rr.get(key), 'part-result-mismatch', IDBAT=id, field=key)
                    if 'sources' in pr:
                        expected = {s['url'] for s in pr['sources'] if 'virtualshanghai.net' not in s['url']}
                        actual = {s['url'] for s in rr.get('references',[]) if 'virtualshanghai.net' not in s['url']}
                        self.check(expected == actual, 'part-result-source-mismatch', IDBAT=id)
        # Separate semantic checks for the two pre-existing generated-data inconsistencies.
        for id in self.synchronization_ids:
            plan=plans[id];batch=plan['batch']
            old_result=next(r for r in records(self.original(f'research/unresolved-landmarks/{batch}-results.json')) if r['IDBAT']==id)
            rr=result_rows[id];wf=workflows[id]
            if id==242:
                canonical='https://www.virtualshanghai.net/data/buildings?ID=242'
                expected_refs=json.loads(json.dumps(old_result['references']))
                self.check(bool(expected_refs) and 'virtualshanghai.net' in expected_refs[0]['url'] and '242' in expected_refs[0]['url'],
                           '242-original-primary-reference-unexpected')
                expected_refs[0]['url']=canonical
                self.check(rr['references']==expected_refs,'242-reference-change-not-url-only')
                expected_urls=list(old_workflows[id]['sourceUrls']);expected_urls[0]=canonical
                self.check(wf['sourceUrls']==expected_urls,'242-workflow-reference-change-not-url-only')
                self.check(rr.get('verificationStatus')==old_result.get('verificationStatus')=='verified'
                           and wf.get('mapWriteRecommendation')=='yes','242-approved-conclusion-changed')
                for key in ('currentNameZh','currentAddress','currentUse','relationship','verificationStatus','notes'):
                    self.check(part_rows[id].get(key)==old_result.get(key),'242-part-does-not-match-approved-result',field=key)
                source_urls={x['url'] for x in part_rows[id].get('sources',[]) if 'virtualshanghai.net' not in x['url']}
                old_source_urls={x['url'] for x in old_result['references'] if 'virtualshanghai.net' not in x['url']}
                self.check(source_urls==old_source_urls,'242-part-source-synchronization-mismatch')
            elif id==460:
                expected_roads=json.loads(json.dumps(old_result['historicalRoadMappings']))
                self.check(len(expected_roads)==1,'460-original-road-mapping-unexpected')
                if expected_roads:
                    expected_roads[0]['modernNameZh']='徐家汇路／肇嘉浜路（分段）'
                self.check(rr['historicalRoadMappings']==expected_roads,'460-road-sync-exceeded-modern-translation')
                self.check(wf.get('modernRoadAddress')=='993 徐家汇路／肇嘉浜路（分段）','460-workflow-road-sync-mismatch')
                self.check(rr.get('verificationStatus')=='unresolved' and wf.get('mapWriteRecommendation')=='no',
                           '460-unresolved-status-changed')
        # New recovered canonical inputs must match the immutable recovered evidence.
        for batch in ('002', '004'):
            canonical = ROOT / f'research/unresolved-landmarks/{batch}-input.json'
            if canonical.exists():
                expected = self.original(f'{AUDIT_DIR}/{batch}-recovered-input.json')
                actual = json.loads(canonical.read_text())
                self.check(actual == expected, 'recovered-input-changed', batch=batch)
        for batch in ('003','005','006'):
            wf = self.current(f'scripts/data/unresolved-landmarks-{batch}-research.json')
            self.check(wf.get('input', MISSING) is None, 'unrecovered-input-pointer', batch=batch, actual=serial(wf.get('input', MISSING)))
        self.validate_map(plans, workflows, result_rows)
        self.report.update({
            'findingIds': sorted(findings), 'findingCorrectionRecordCount':len(finding_plans_list),
            'synchronizationIds':sorted(self.synchronization_ids),
            'preexistingGeneratedDataSynchronizationCount':len(synchronization_list),
            'plannedRecordCount':len(plans_list),
            'workflowRecordCount': len(workflows), 'protectedFileCount':len(self.baseline['protectedFiles']),
            'changedRecords': self.changed,
            'changedRecordCounts': {key:len(value) for key,value in self.changed.items()},
            'changedFindingRecordCounts':{key:sum(r['IDBAT'] in findings for r in value) for key,value in self.changed.items()},
            'changedSynchronizationRecordCounts':{key:sum(r['IDBAT'] in self.synchronization_ids for r in value) for key,value in self.changed.items()},
            'changedUniqueRecordCount':len({r['IDBAT'] for rows in self.changed.values() for r in rows}),
            'additionalRecordChanges': self.extra_changes,
            'fileMetadataChanges':self.file_metadata_changes,
            'derivedResearchFieldChanges':self.derived_research_changes,
            'mapWorkflowRepresentationDifferences':self.map_representation_differences,
            'remainingGaps':[{'batch':p['batch'],'IDBAT':p['IDBAT'],'mapAction':p['mapAction'],
                              'remainingGap':p.get('remainingGap')} for p in plans_list if p.get('remainingGap')],
        })

    def validate_map(self, plans, workflows, result_rows):
        old_features = self.original(FEATURE_PATH)['features']; new_features = self.current(FEATURE_PATH)['features']
        def feature_key(f):
            p=f.get('properties',{});return p.get('id') or p.get('featureGroupId')
        self.check(all(feature_key(f) is not None for f in old_features+new_features), 'feature-without-id')
        old_ids=[feature_key(f) for f in old_features];new_ids=[feature_key(f) for f in new_features]
        self.check(old_ids==new_ids, 'feature-id-or-order-changed')
        of={feature_key(f):f for f in old_features};nf={feature_key(f):f for f in new_features}
        self.check(len(of)==len(old_features) and len(nf)==len(new_features), 'duplicate-feature-id')
        groups={};member_group={}
        for f in old_features:
            p=f.get('properties',{});g=p.get('featureGroupId')
            if p.get('kind')!='landmark':continue
            self.check(bool(g), 'landmark-without-group', feature=feature_key(f))
            groups[g]=f
            for id in p.get('sourceRecordIds',[]):
                self.check(id not in member_group, 'duplicate-map-member', IDBAT=id)
                member_group[id]=g
        targeted={member_group[id] for id in plans if id in member_group}
        for id in plans:self.check(id in member_group,'planned-map-member-missing',IDBAT=id)
        holds={member_group[id] for id,p in plans.items() if p['mapAction']=='hold' and id in member_group}
        updates={member_group[id] for id,p in plans.items() if p['mapAction']=='update' and id in member_group}
        self.check(not (holds & updates), 'group-action-conflict', groups=sorted(holds&updates))
        retains={member_group[id] for id,p in plans.items() if p['mapAction']=='retain' and id in member_group}-holds-updates
        def without_current(f):
            return {**f,'properties':{k:v for k,v in f.get('properties',{}).items() if not k.startswith('current')}}
        changed_groups=[];removed=[]
        for key in of.keys() & nf.keys():
            old=of[key];new=nf[key];g=old.get('properties',{}).get('featureGroupId')
            self.check(without_current(old)==without_current(new), 'non-current-map-content-changed',featureId=key,featureGroupId=g)
            if old!=new:
                changed_groups.append(g or key)
                if any(k.startswith('current') for k in old.get('properties',{})) and not any(k.startswith('current') for k in new.get('properties',{})):
                    removed.append(g or key)
            if g not in targeted:self.check(old==new,'untargeted-map-feature-changed',featureId=key,featureGroupId=g)
        old_overrides=self.index(records(self.original(OVERRIDE_PATH)), 'featureGroupId','old-overrides')
        overrides=self.index(records(self.current(OVERRIDE_PATH)), 'featureGroupId','overrides')
        old_audit=self.index(records(self.original(MAP_AUDIT_PATH)), 'featureGroupId','old-map-audit')
        map_audit=self.index(records(self.current(MAP_AUDIT_PATH)), 'featureGroupId','map-audit')
        for g in (set(old_overrides)|set(overrides))-targeted:
            self.check(old_overrides.get(g,MISSING)==overrides.get(g,MISSING),'untargeted-override-changed',featureGroupId=g)
        for g in (set(old_audit)|set(map_audit))-targeted:
            self.check(old_audit.get(g,MISSING)==map_audit.get(g,MISSING),'untargeted-map-audit-changed',featureGroupId=g)
        for g in retains:
            key=feature_key(groups[g])
            self.check(of[key]==nf[key],'retain-map-feature-changed',featureGroupId=g)
            self.check(old_overrides.get(g,MISSING)==overrides.get(g,MISSING),'retain-override-changed',featureGroupId=g)
            self.check(old_audit.get(g,MISSING)==map_audit.get(g,MISSING),'retain-map-audit-changed',featureGroupId=g)
        registry=self.current(HOLD_PATH)
        self.check(isinstance(registry,list),'hold-registry-not-array')
        registry=self.index(records(registry),'featureGroupId','hold-registry')
        for g in holds:
            members=groups[g]['properties'].get('sourceRecordIds',[])
            self.check(g in registry,'hold-not-registered',featureGroupId=g)
            entry=registry.get(g,{})
            self.check(set(entry.get('sourceRecordIds',[]))==set(members),'hold-members-incomplete',featureGroupId=g,expected=members,actual=entry.get('sourceRecordIds'))
            self.check(len(entry.get('sourceRecordIds',[]))==len(set(entry.get('sourceRecordIds',[]))),'duplicate-hold-member',featureGroupId=g)
            for field in ('reason','sourceUrls','reviewedAt','reviewRef'):
                self.check(bool(entry.get(field)),'hold-metadata-missing',featureGroupId=g,field=field)
            self.check(g not in overrides,'held-group-still-overridden',featureGroupId=g)
            props=nf[feature_key(groups[g])]['properties']
            self.check(not any(k.startswith('current') for k in props),'held-group-current-fields-remain',featureGroupId=g,fields=[k for k in props if k.startswith('current')])
            ar=map_audit.get(g,{})
            self.check('accepted' not in ar,'held-group-still-accepted',featureGroupId=g)
            self.check(ar.get('status')=='needs-review-research','held-group-audit-status',featureGroupId=g,actual=ar.get('status'))
        for id,plan in plans.items():
            g=member_group.get(id)
            if g is None or plan['mapAction']!='update':continue
            props=nf[feature_key(groups[g])]['properties'];override=overrides.get(g,{});accepted=map_audit.get(g,{}).get('accepted',{})
            self.check(g in overrides and bool(accepted),'update-not-adopted',IDBAT=id,featureGroupId=g)
            for key,value in plan.get('mapPatch',{}).items():
                for label,obj in [('feature',props),('override',override),('accepted',accepted)]:
                    if key=='evidence' and label=='feature':continue
                    match=(key not in obj or obj[key] is None) if value is None else obj.get(key,MISSING)==value
                    self.check(match,'map-patch-not-applied',IDBAT=id,featureGroupId=g,layer=label,field=key,expected=value,actual=serial(obj.get(key,MISSING)))
            wf=workflows[id]
            old_props=groups[g]['properties']
            mp=plan.get('mapPatch',{});wp=plan.get('workflowPatch',{})
            payload_keys=('currentNameZh','currentAddress','currentUse','currentUseRelationship','currentUseNote','currentUseSourceUri','currentUseSources')
            for key in payload_keys:
                if key in mp:
                    expected=mp[key]
                elif key in ('currentNameZh','currentAddress','currentUse') and key in wp:
                    expected=wp[key]
                elif key=='currentUseNote' and 'evidence' in wp:
                    expected=wp['evidence']
                elif key=='currentUseRelationship' and 'currentUseRelationship' in wp:
                    expected=RELATIONSHIP_MAP.get(wp[key],wp[key])
                else:
                    expected=old_props.get(key,MISSING)
                for label,obj in [('feature',props),('override',override),('accepted',accepted)]:
                    value=obj.get(key,MISSING)
                    # Null map patch values mean property removal; otherwise require exact payload agreement.
                    match=value is MISSING or value is None if expected is None else value==expected
                    self.check(match,'map-payload-mismatch',IDBAT=id,layer=label,field=key,
                               expected=serial(expected),actual=serial(value))
            if 'currentUseNote' in mp or 'evidence' in wp:
                expected=mp.get('currentUseNote',wp.get('evidence'))
                self.check(override.get('evidence')==expected,'override-evidence-stale',IDBAT=id)
            else:
                self.check(override.get('evidence',MISSING)==old_overrides.get(g,{}).get('evidence',MISSING),
                           'unplanned-override-evidence-change',IDBAT=id)
            def source_union(obj):
                urls={source['url'] for source in (obj.get('currentUseSources') or [])}
                if obj.get('currentUseSourceUri'):urls.add(obj['currentUseSourceUri'])
                return urls
            if 'sourceUrls' in wp or 'references' in plan.get('resultPatch',{}) or 'sources' in plan.get('partPatch',{}):
                expected_urls={url for url in wf.get('sourceUrls',[]) if 'virtualshanghai.net' not in url}
            elif 'currentUseSources' in mp or 'currentUseSourceUri' in mp:
                expected_urls=source_union({**old_props,**mp})
            else:
                expected_urls=source_union(old_props)
            self.check(bool(expected_urls),'update-without-research-source',IDBAT=id)
            for label,obj in [('feature',props),('override',override),('accepted',accepted)]:
                actual=source_union(obj)
                self.check(actual==expected_urls,'map-source-payload-mismatch',IDBAT=id,layer=label,
                           missing=sorted(expected_urls-actual),extra=sorted(actual-expected_urls))
            # Legacy workflows may omit district qualifiers or have fuller prose than their map card.
            # Explicit plans can preserve those existing representations; report rather than rewrite them.
            for map_key,workflow_key in [('currentNameZh','currentNameZh'),('currentAddress','currentAddress'),
                                         ('currentUse','currentUse'),('currentUseNote','evidence')]:
                if props.get(map_key)!=wf.get(workflow_key):
                    self.map_representation_differences.append({'IDBAT':id,'field':map_key,
                        'map':props.get(map_key),'workflow':wf.get(workflow_key),
                        'basis':'explicit mapPatch or unchanged baseline map payload; validated separately'})
            self.check(id in override.get('sourceRecordIds',[]),'updated-record-not-in-override-guard',IDBAT=id,featureGroupId=g)
            # Do not silently let update guards claim members outside their actual immutable group.
            self.check(set(override.get('sourceRecordIds',[]))<=set(groups[g]['properties']['sourceRecordIds']),
                       'override-guard-outside-group',IDBAT=id,featureGroupId=g)
        if 569 in member_group:
            g=member_group[569];key=feature_key(groups[g])
            self.check(of[key]==nf[key],'569-map-feature-changed')
            self.check(old_overrides.get(g,MISSING)==overrides.get(g,MISSING),'569-override-changed')
            self.check(old_audit.get(g,MISSING)==map_audit.get(g,MISSING),'569-map-audit-changed')
            self.check(g not in registry,'569-unexpected-hold')
        else:self.check(False,'569-map-missing')
        self.report['map']={
            'featureCount':len(new_features),'targetedGroupCount':len(targeted),
            'plannedHoldRecordCount':sum(p['mapAction']=='hold' for p in plans.values()),
            'holdGroupCount':len(holds),'holdMemberCount':len({id for g in holds for id in groups[g]['properties']['sourceRecordIds']}),
            'plannedUpdateRecordCount':sum(p['mapAction']=='update' for p in plans.values()),
            'updateGroupCount':len(updates),'changedGroupCount':len(set(changed_groups)),
            'actuallyChangedUpdateGroupCount':len(updates & set(changed_groups)),
            'unchangedPlannedUpdateGroups':sorted(updates-set(changed_groups)),
            'retainedGroupCount':len(retains),
            'removedCurrentUseGroupCount':len(set(removed)),'removedCurrentUseGroups':sorted(set(removed)),
            'removedOverrideGroups':sorted(set(old_overrides)-set(overrides)),
            'updatedGroups':sorted(updates),'heldGroups':sorted(holds),
            'registryGroupCount':len(registry),
        }

    def finish(self):
        report={'validatedAt':dt.datetime.now(dt.timezone.utc).isoformat(),
                'baseCommit':self.base,'passed':not self.errors,'errors':self.errors,**self.report}
        (HERE/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps({'passed':report['passed'],'errors':len(self.errors),
                          'changedRecordCounts':report.get('changedRecordCounts'),
                          'additionalRecordChangeCount':len(self.extra_changes),
                          'map':report.get('map'),'output':str(HERE/'validation.json')},ensure_ascii=False,indent=2))
        return 0 if report['passed'] else 1


def main():
    validator=Validator()
    try:
        validator.run()
    except Exception as exc:
        validator.errors.append({'code':'validation-exception','type':type(exc).__name__,'message':str(exc)})
    return validator.finish()


if __name__=='__main__':
    sys.exit(main())
