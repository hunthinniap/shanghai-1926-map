import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {applyApprovedHeritageCoordinates,parseApprovedCoordinateReview} from './reviewed-heritage-coordinates.mjs'
import {verifiedTextSnapshot} from './verified-snapshot.mjs'
const root=new URL('../../',import.meta.url)
const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'))
const approval=read('scripts/data/shanghai-heritage-coordinate-approvals.json')
const reviewBytes=fs.readFileSync(new URL(approval.researchReport,root)),review=JSON.parse(reviewBytes)
const originalMap=read(approval.originalMapSnapshot)
const frozen=read('research/rechecks/2026-10-30-heritage-missing-coordinates/targets.json')
const frozenById=new Map(frozen.records.map(r=>[r.id,r]))
const fixture=()=>({records:read('public/data/shanghai-excellent-historical-buildings/buildings-enriched.json').records.map(r=>structuredClone(frozenById.get(r.id)??r)),
 mapFeatures:structuredClone(originalMap.features),approval:structuredClone(approval),review:structuredClone(review)})

test('approved backfill preserves all 978 originals and includes only the 66 authorized records',()=>{
 const input=fixture(),before=structuredClone(input.mapFeatures),result=applyApprovedHeritageCoordinates(input)
 assert.equal(result.mapFeatures.length,1044)
 assert.equal(new Set(result.mapFeatures.map(f=>f.properties.officialId)).size,1044)
 assert.deepEqual(result.mapFeatures.slice(0,978),before)
 assert.deepEqual(input.mapFeatures,before)
 const approved=new Set(approval.records.map(r=>r.officialId)),mapped=new Set(result.mapFeatures.map(f=>f.properties.officialId))
 for(const r of frozen.records)assert.equal(mapped.has(r.id),approved.has(r.id),r.id)
 assert.equal(frozen.records.filter(r=>!mapped.has(r.id)).length,14)
})

test('all 76 source positions survive while partial scope remains explicit on all 16 cards',()=>{
 const result=applyApprovedHeritageCoordinates(fixture()),added=result.mapFeatures.slice(978)
 assert.equal(added.filter(f=>f.properties.coordinateReview.status==='partial-reference').length,16)
 assert.equal(added.flatMap(f=>f.properties.coordinateReview.points).length,76)
 for(const f of added){
  const r=review.records.find(r=>r.officialId===f.properties.officialId)
  assert.deepEqual(f.geometry.coordinates,[r.points[0].lon,r.points[0].lat])
  assert.deepEqual(f.properties.coordinateReview.points.map(p=>[p.lon,p.lat]),r.points.map(p=>[p.lon,p.lat]))
  assert.equal(f.properties.coordinateReview.reason,r.reason)
 }
 assert.equal(added.find(f=>f.properties.officialCodeRaw==='2M006').properties.coordinateReview.points.length,6)
 assert.match(added.find(f=>f.properties.officialCodeRaw==='4C018').properties.locationNote,/部分定位.*8号楼/)
 assert.equal(added.find(f=>f.properties.officialCodeRaw==='2A056 (2E001)').properties.coordinateReview.points[0].coordinateSystemInferred,true)
})

test('name/address drift and coordinate overwrites cannot pass a previous approval',()=>{
 const changed=fixture(),first=changed.approval.records[0]
 changed.records.find(r=>r.id===first.officialId).official.addressAsListed='别处的同名建筑'
 assert.throws(()=>applyApprovedHeritageCoordinates(changed),/identity\/scope changed/)
 const overwritten=fixture();overwritten.mapFeatures[0].geometry.coordinates[0]+=0.01
 assert.throws(()=>applyApprovedHeritageCoordinates(overwritten),/baseline changed/)
 const extra=fixture();extra.approval.records[0].officialId=review.records.find(r=>r.status==='needs-review').officialId
 assert.throws(()=>applyApprovedHeritageCoordinates(extra),/ID set changed/)
})

test('a research coordinate changed after approval requires a new review',()=>{
 assert.equal(parseApprovedCoordinateReview(reviewBytes,approval).records.length,80)
 const changed=structuredClone(review);changed.records.find(r=>r.points.length).points[0].lon+=0.001
 assert.throws(()=>parseApprovedCoordinateReview(Buffer.from(JSON.stringify(changed)),approval),/research changed/)
})

test('Windows CRLF recovery still requires the original source length and checksum',()=>{
 const original=Buffer.from('甲\n乙\n'),source={byteLength:original.length,sha256:createHash('sha256').update(original).digest('hex'),localPath:'test.html'}
 assert.deepEqual(verifiedTextSnapshot(Buffer.from('甲\r\n乙\r\n'),source),original)
 assert.throws(()=>verifiedTextSnapshot(Buffer.from('甲\r\n丙\r\n'),source),/checksum mismatch/)
 assert.throws(()=>verifiedTextSnapshot(original,{...source,byteLength:source.byteLength+1}),/checksum mismatch/)
})
