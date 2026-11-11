import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reviewAmapCandidates } from './amap-candidate-review.mjs'

const target = { name: '甲乙历史大楼', listedName: '甲乙历史大楼', officialAddress: '测试路210-220号（双号）',
  physicalBuildingNames: ['甲乙历史大楼'], alternateNames: [], queries: [{ region: '310101' }],
  referenceGcj02: [121.49, 31.23], componentScope: false }
const poi = { id: 'building', name: '甲乙历史大楼', address: '测试路220号', typecode: '120201', adcode: '310101', location: '121.49,31.23' }
const review = (changes = {}, pois = [poi]) => reviewAmapCandidates({ ...target, ...changes }, pois)

test('a music hall is a venue rather than a generic tenant business', () => {
  const result = review({ name: '南京大戏院', listedName: '上海音乐厅', officialAddress: '测试路220号' },
    [{ ...poi, name: '凯迪拉克·上海音乐厅', typecode: '080602' }])
  assert.equal(result.selected?.poi.id, 'building')
  assert.equal(result.selected.tenant, false)
})
test('a named listed restaurant can be a destination reference but its cafe cannot inherit that identity', () => {
  const changes = { name: '历史学校', listedName: '梅龙镇酒家', officialAddress: '测试路220号' }
  const restaurant = { ...poi, name: '梅龙镇酒家(南京西路总店)', typecode: '050100' }
  assert.equal(review(changes, [restaurant]).status, 'matched-listed-use')
  assert.equal(review(changes, [{ ...restaurant, name: '梅龙镇酒家咖啡厅' }]).selected, null)
})
test('a complete unique listed-use name and full door can override an old erroneous or missing reference point', () => {
  const changes = { name: '历史住宅', listedName: '测试宾馆3号楼', officialAddress: '测试路220号',
    queries: [{ params: { region: '310101' } }] }
  const building = { ...poi, name: '测试宾馆3号楼' }
  for (const referenceGcj02 of [null, [121.50, 31.23]]) {
    const result = review({ ...changes, referenceGcj02 }, [building])
    assert.equal(result.status, 'matched-listed-use')
    assert.equal(result.selected?.exactListedIdentity, true)
  }
  assert.equal(review({ ...changes, referenceGcj02: null }, [{ ...building, adcode: '310105' }]).selected, null)
  assert.equal(review({ ...changes, referenceGcj02: null }, [{ ...building, name: '测试宾馆2号楼' }]).selected, null)
})
test('query-history parameter shape still validates the independently returned district', () => {
  const result = review({ queries: [{ params: { region: '310101' } }] }, [{ ...poi, adcode: '310105' }])
  assert.equal(result.selected, null)
  assert.equal(result.candidates[0].wrongDistrict, true)
})
test('a separately listed institution can provide a destination reference despite an old point conflict', () => {
  const result = review({ name: '毓秀楼', listedName: '毓秀楼/上海财经大学', officialAddress: '测试路220号', referenceGcj02: [121.50, 31.23] },
    [{ ...poi, name: '上海财经大学(武东路校区)' }])
  assert.equal(result.status, 'matched-partial-reference')
  assert.equal(result.selected.exactDoor, true)
})

test('reviewed hotel rebranding matches Ruijin building 1 at its current door without accepting 3 or 11', () => {
  const changes = { name: '瑞金二路住宅', listedName: '瑞金宾馆1号楼', officialAddress: '瑞金二路18号',
    nameReview: { groups: [['瑞金宾馆', '上海瑞金洲际酒店']], addresses: ['瑞金二路118号'] } }
  const building = { ...poi, name: '上海瑞金洲际酒店1号楼', address: '瑞金二路118号上海瑞金洲际酒店', typecode: '100102' }
  const result = review(changes, [building])
  assert.equal(result.status, 'matched-reviewed-alias')
  assert.equal(result.selected.usedReviewedNameAlias, true)
  assert.equal(result.selected.addressOverlap, false)
  assert.equal(result.selected.reviewedAddressOverlap, true)
  for (const number of [3, 11]) assert.equal(review(changes, [{ ...building, name: `上海瑞金洲际酒店${number}号楼` }]).selected, null)
  assert.equal(review(changes, [{ ...building, name: '其他洲际酒店1号楼' }]).selected, null)
})
test('village spelling variants can use a qualified entrance reference on the same street and door', () => {
  const changes = { name: '模范村', listedName: '模范村', physicalBuildingNames: ['模范村'], officialAddress: '延安中路877号' }
  const village = { ...poi, name: '模范邨', address: '延安中路877弄1-105号' }
  const result = review(changes, [village])
  assert.equal(result.status, 'matched-spelling-reference')
  assert.equal(result.selected.addressOverlap, false)
  for (const address of ['另一条路877弄', '延安中路999弄']) {
    const approximate = review(changes, [{ ...village, address }])
    assert.equal(approximate.status, 'matched-partial-reference')
    assert.equal(approximate.selected.addressOverlap, false)
  }
  assert.equal(review({ ...changes, officialAddress: '延安中路876-878号（双号）' }, [village]).status, 'matched-partial-reference')
})
test('a consulate full country name does not collapse its visa department into the main building', () => {
  const main = { ...poi, name: '俄罗斯联邦驻上海总领事馆' }
  const department = { ...main, id: 'visa', name: '俄罗斯驻上海总领事馆-签证处' }
  assert.equal(review({ name: '俄罗斯领事馆', listedName: '俄罗斯领事馆', officialAddress: '测试路220号' }, [department, main]).selected?.poi.id, 'building')
})

test('matches an even door inside the complete listed range', () => {
  assert.equal(review().selected?.poi.id, 'building')
  assert.equal(review().status, 'matched-building')
})
test('does not describe an odd door as an official address overlap', () => {
  const result = review({}, [{ ...poi, address: '测试路213号' }])
  assert.equal(result.candidates[0].addressOverlap, false)
  assert.equal(result.status, 'matched-name-reference')
})
test('a complete address and name do not override a different district', () => {
  assert.equal(review({}, [{ ...poi, adcode: '310105' }]).selected, null)
})
test('parking is rejected, while a same-named listed restaurant is only a qualified destination reference', () => {
  assert.equal(review({}, [{ ...poi, typecode: '150904' }]).selected, null)
  assert.equal(review({}, [{ ...poi, typecode: '050000' }]).status, 'matched-listed-use')
})
test('a hotel lobby cannot displace its parent hotel', () => {
  const hotel = { ...poi, name: '甲乙历史饭店', typecode: '100100' }
  const lobby = { ...hotel, id: 'lobby', parent: 'building', name: '甲乙历史饭店大堂' }
  const result = review({ name: '甲乙历史饭店', physicalBuildingNames: ['甲乙历史饭店'] }, [lobby, hotel])
  assert.equal(result.selected?.poi.id, 'building')
})
test('an entire campus can provide a qualified reference for a protected sub-building', () => {
  const result = review({ componentScope: true }, [poi])
  assert.equal(result.status, 'matched-partial-reference')
  assert.equal(result.selected.scopeConflict, true)
})
test('a numbered protected building in the listed use cannot inherit a different numbered building', () => {
  const result = review({ listedName: '甲乙历史大楼1号楼' }, [{ ...poi, name: '甲乙历史大楼2号楼' }])
  assert.equal(result.selected, null)
  assert.equal(result.candidates[0].componentMismatch, true)
})
test('numbered components can link to the institution as a reference and retain exact component matches', () => {
  assert.equal(review({ listedName: '甲乙历史大楼（2 号楼）' }).status, 'matched-partial-reference')
  assert.equal(review({ listedName: '甲乙历史大楼5、7、9、10号楼' }, [{ ...poi, name: '甲乙历史大楼9号楼' }]).selected?.poi.id, 'building')
  assert.equal(review({ listedName: '甲乙历史大楼1-4号楼' }, [{ ...poi, name: '甲乙历史大楼3号楼' }]).selected?.poi.id, 'building')
})
test('a street address ending in 号楼 is not an internal building number', () => {
  assert.equal(review({ listedName: '测试路220号楼' }).selected?.poi.id, 'building')
})
test('a protected main building cannot inherit any numbered building, while listed constituent buildings remain eligible', () => {
  assert.equal(review({ listedName: '甲乙历史大楼主楼' }, [{ ...poi, name: '甲乙历史大楼21号楼' }]).selected, null)
  const changes = { listedName: '甲乙历史大楼10号楼，水塔' }
  assert.equal(review(changes, [{ ...poi, name: '甲乙历史大楼6号楼' }]).selected, null)
  assert.equal(review(changes, [{ ...poi, name: '甲乙历史大楼10号楼' }]).selected?.poi.id, 'building')
  assert.equal(review(changes, [{ ...poi, name: '甲乙历史大楼水塔' }]).selected?.poi.id, 'building')
  assert.equal(review({ listedName: '甲乙历史大楼中、西楼' }, [{ ...poi, name: '甲乙历史大楼中楼' }]).selected?.poi.id, 'building')
})
test('a building-complex article is not evidence for a specific unnamed house', () => {
  const result = review({ name: '住宅', listedName: '住宅', physicalBuildingNames: ['住宅'], alternateNames: [] },
    [{ ...poi, name: '哥伦比亚住宅圈', address: '另一条路10号' }])
  assert.equal(result.selected, null)
})
test('same-door alternatives can resolve to a qualified destination reference', () => {
  const result = review({ listedName: '甲乙历史大楼、甲乙历史大楼东馆' }, [poi, { ...poi, id: 'another-building', name: '甲乙历史大楼东馆' }])
  assert.equal(result.status, 'matched-partial-reference')
  assert.equal(result.selected.poi.id, 'building')
})
test('an exact listed-use name resolves a generic nearby wing candidate', () => {
  const result = review({}, [poi, { ...poi, id: 'another-building', name: '甲乙历史大楼东馆' }])
  assert.equal(result.selected?.poi.id, 'building')
})
test('a unique nearby named building retains its address discrepancy', () => {
  const result = review({}, [{ ...poi, address: '另一条路10号' }])
  assert.equal(result.status, 'matched-name-reference')
  assert.equal(result.selected.addressOverlap, false)
  assert.equal(result.selected.matchedBuildingName, '甲乙历史大楼')
})
test('a door POI can put its precise address in its name and an intersection in its address field', () => {
  const result = review({ name: '住宅', listedName: '住宅', physicalBuildingNames: ['住宅'], officialAddress: '测试路220号' },
    [{ ...poi, name: '测试路220号', address: '测试路与另一条路交叉口东60米', typecode: '190402' }])
  assert.equal(result.status, 'matched-address')
  assert.equal(result.selected.namedDoorEvidence, true)
})
test('a name containing the correct door does not override an explicit contradictory door address', () => {
  const result = review({ name: '住宅', listedName: '住宅', physicalBuildingNames: ['住宅'], officialAddress: '测试路220号' },
    [{ ...poi, name: '测试路220号', address: '测试路294号', typecode: '190402' }])
  assert.equal(result.selected, null)
})
test('explicit number lists inherit their road instead of losing all but the first door', () => {
  const result = review({ officialAddress: '测试路210、214、220号' }, [poi])
  assert.equal(result.selected.addressOverlap, true)
})
test('inner lane numbers retain lane hierarchy across a number list', () => {
  const result = review({ officialAddress: '测试路210弄1-6号、8号' }, [{ ...poi, address: '测试路210弄8号' }])
  assert.equal(result.selected.addressOverlap, true)
  assert.equal(review({ name: '住宅', listedName: '住宅', physicalBuildingNames: ['住宅'], officialAddress: '测试路210弄1-6号、8号' }, [{ ...poi, address: '测试路8号' }]).selected, null)
})
test('inner-number parity and abbreviated single/even notes are respected', () => {
  const t = { name: '住宅', listedName: '住宅', physicalBuildingNames: ['住宅'], officialAddress: '测试路210弄1-9号（单）' }
  const result = review(t, [{ ...poi, name: '测试路210弄4号', address: '测试路210弄4号' }])
  assert.equal(result.candidates[0].addressOverlap, false)
  assert.equal(result.selected, null)
})
test('a generic protected house does not inherit the POI of its whole lane', () => {
  const result = review({ name: '住宅', listedName: '住宅', physicalBuildingNames: ['住宅'], officialAddress: '测试路210弄8号' },
    [{ ...poi, name: '测试路210弄1-90号小区', address: '测试路与另一条路交叉口东60米' }])
  assert.equal(result.selected, null)
})
test('a current hotel at the exact house address can provide a qualified address reference', () => {
  const result = review({ name: '住宅', listedName: '住宅', physicalBuildingNames: ['住宅'], officialAddress: '测试路220号' },
    [{ ...poi, name: '现在的酒店', typecode: '100100' }])
  assert.equal(result.status, 'matched-address')
})
test('Chinese door suffixes distinguish neighbouring protected houses', () => {
  const t = { name: '住宅', listedName: '住宅', physicalBuildingNames: ['住宅'], officialAddress: '测试路210弄32号乙' }
  for (const address of ['测试路210弄32号甲', '测试路210弄32号']) {
    assert.equal(review(t, [{ ...poi, name: address, address }]).selected, null)
  }
  const address = '测试路210弄32号乙'
  assert.equal(review(t, [{ ...poi, name: address, address }]).status, 'matched-address')
})
test('a street-number range after separate lanes belongs to the street', () => {
  const result = review({ officialAddress: '测试路468弄、488弄、424-498号（双号）' }, [{ ...poi, address: '测试路442号' }])
  assert.equal(result.selected?.addressOverlap, true)
  assert.equal(review({ officialAddress: '测试路468弄、488弄、424-498号（双号）' }, [{ ...poi, address: '测试路443号' }]).candidates[0].addressOverlap, false)
})
test('a short distinctive lane name needs exact name agreement and an overlapping address', () => {
  const short = { name: '逸村', listedName: '逸村', physicalBuildingNames: ['逸村'], officialAddress: '测试路210弄' }
  const lane = { ...poi, name: '逸村', address: '测试路210弄1-8号', typecode: '120302' }
  assert.equal(review(short, [lane]).status, 'matched-building')
  assert.equal(review(short, [{ ...lane, name: '逸村东苑', address: '另一条路8号' }]).selected, null)
  assert.equal(review(short, [{ ...lane, address: '另一条路8号' }]).selected, null)
  assert.equal(review({ ...short, name: '别墅', listedName: '别墅', physicalBuildingNames: ['别墅'] }, [{ ...lane, name: '别墅' }]).status, 'needs-review')
})

test('Hong En Hospital can link to Huadong Hospital overall without selecting a different wing or department', () => {
  const hospital = { ...poi, id: 'hospital', name: '复旦大学附属华东医院(总院)', address: '延安西路221号', typecode: '090101' }
  const changes = { name: '宏恩医院', listedName: '华东医院南楼', officialAddress: '延安西路221号' }
  const result = review(changes, [
    { ...hospital, id: 'east', name: '华东医院东楼' },
    { ...hospital, id: 'clinic', name: '华东医院(体检中心)' }, hospital,
  ])
  assert.equal(result.status, 'matched-partial-reference')
  assert.equal(result.selected.poi.id, 'hospital')
  assert.equal(result.selected.componentUnproven, true)
  assert.equal(review(changes, [{ ...hospital, name: '华东医院东楼' }]).selected, null)
  assert.equal(review(changes, [{ ...hospital, name: '华东医院(体检中心)' }]).selected, null)
})

test('Xijiao building 4 can use the nearby hotel entrance but cannot use buildings 3 or 9', () => {
  const changes = { name: '淮阴路姚氏住宅', listedName: '西郊宾馆4号楼', officialAddress: '淮阴路200号' }
  const hotel = { ...poi, name: '西郊宾馆', address: '虹桥路1921号', location: '121.494,31.23', typecode: '100102' }
  const wrong = [3, 9].map(n => ({ ...hotel, id: String(n), name: `西郊宾馆${n}号楼` }))
  assert.equal(review(changes, [...wrong, hotel]).status, 'matched-partial-reference')
  assert.equal(review(changes, wrong).selected, null)
  assert.equal(review(changes, [{ ...hotel, location: '121.6,31.23' }]).selected, null)
  assert.equal(review(changes, [{ ...hotel, adcode: '310105' }]).selected, null)
})

test('numbered villas and main wings cannot be substituted for another specified building number', () => {
  const changes = { listedName: '测试饭店2号楼' }
  for (const name of ['测试饭店10号别墅', '测试饭店主楼']) {
    assert.equal(review(changes, [{ ...poi, name }]).selected, null)
  }
})

test('exact component matches retain priority over a whole institution reference', () => {
  const changes = { listedName: '甲乙历史大楼2号楼' }
  const exact = { ...poi, id: 'exact', name: '甲乙历史大楼2号楼' }
  const result = review(changes, [poi, exact])
  assert.equal(result.status, 'matched-building')
  assert.equal(result.selected.poi.id, 'exact')
})

test('generic temple names and an unknown position without a matching address cannot form partial references', () => {
  assert.equal(review({ name: '住宅', listedName: '关帝庙' }, [{ ...poi, name: '关帝庙', address: '另一条路5号' }]).selected, null)
  assert.equal(review({ listedName: '测试医院南楼', referenceGcj02: null }, [{ ...poi, name: '测试医院', address: '另一条路5号' }]).selected, null)
})
