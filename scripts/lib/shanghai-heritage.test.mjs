import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHeritagePage } from './shanghai-heritage.mjs'

const source = {
  batch: 2,
  url: 'https://www.shanghai.gov.cn/fixture/batch-2.html',
  title: '上海市第二批优秀历史建筑名单',
  pageUpdatedAt: '2024-01-01',
  retrievedAt: '2026-09-18T00:00:00.000Z',
  localPath: 'research/heritage/sources/batch-2.html',
}

const header = '<tr><th>编 号</th><th>原名称/原使用单位</th><th>现名称/现使用单位</th><th>地 址</th></tr>'
const district = (name) => `<tr><td colspan="4">${name}</td></tr>`
const row = (code, original, listed, address) => `<tr><td>${code}</td><td>${original}</td><td>${listed}</td><td>${address}</td></tr>`
const table = (rows, heading = header) => `<table><tbody>${heading}${rows}</tbody></table>`
const page = (content) => `<!doctype html><html><body><div class="Article_content">${content}</div></body></html>`
const parse = (rows, overrides = {}) => parseHeritagePage(page(table(rows)), { ...source, ...overrides })

test('records preserve names, as-listed districts, addresses and exact source provenance', () => {
  const result = parse(
    district('闸 北 区')
      + row('2A001', '原使用单位', '现使用单位', '旧址路1号、3号')
      + district('崇 明 县')
      + row('2M001', '原校舍', '现校舍', '县城路2号'),
  )

  assert.equal(result.batch, 2)
  assert.equal(result.recordCount, 2)
  assert.equal(result.records.length, 2)
  const [first, second] = result.records
  assert.ok(first.id)
  assert.ok(second.id)
  assert.notEqual(first.id, second.id)
  assert.equal(first.batch, 2)
  assert.equal(first.code, '2A001')
  assert.equal(first.codeRaw, '2A001')
  assert.equal(first.districtAsListed, '闸北区')
  assert.equal(first.originalNameOrUse, '原使用单位')
  assert.equal(first.listedNameOrUse, '现使用单位')
  assert.equal(first.addressAsListed, '旧址路1号、3号')
  assert.equal(second.districtAsListed, '崇明县')
  for (const [field, value] of Object.entries(source)) {
    assert.equal(first.source[field], value)
  }
  assert.equal(first.source.tableIndex, 1)
  assert.deepEqual(first.source.rowIndices, [3])
  assert.deepEqual(second.source.rowIndices, [5])
  assert.deepEqual(first.rawRows, [{
    rowIndex: 3,
    cells: [
      { text: '2A001', rowSpan: 1, colSpan: 1 },
      { text: '原使用单位', rowSpan: 1, colSpan: 1 },
      { text: '现使用单位', rowSpan: 1, colSpan: 1 },
      { text: '旧址路1号、3号', rowSpan: 1, colSpan: 1 },
    ],
  }])
})

test('rowspan seven represents one site with six components and all source rows', () => {
  const components = Array.from({ length: 6 }, (_, index) => ({
    originalNameOrUse: `原建筑${index + 1}`,
    listedNameOrUse: `现建筑${index + 1}`,
    sourceRowIndex: index + 4,
  }))
  const result = parse(
    district('松 江 区')
      + '<tr><td rowspan="7">2M006</td><td>原校园</td><td>现校园</td><td rowspan="7">中山东路1号</td></tr>'
      + components.map((component) => `<tr><td>${component.originalNameOrUse}</td><td>${component.listedNameOrUse}</td></tr>`).join(''),
  )

  assert.equal(result.recordCount, 1)
  assert.equal(result.records.length, 1)
  const [record] = result.records
  assert.equal(record.code, '2M006')
  assert.equal(record.originalNameOrUse, '原校园')
  assert.equal(record.listedNameOrUse, '现校园')
  assert.equal(record.addressAsListed, '中山东路1号')
  assert.deepEqual(record.components, components)
  assert.deepEqual(record.source.rowIndices, [3, 4, 5, 6, 7, 8, 9])
  assert.equal(record.rawRows.length, 7)
  assert.equal(record.rawRows[0].cells[0].rowSpan, 7)
  assert.equal(record.rawRows[0].cells[3].rowSpan, 7)
  assert.deepEqual(record.rawRows[1], {
    rowIndex: 4,
    cells: [
      { text: '原建筑1', rowSpan: 1, colSpan: 1 },
      { text: '现建筑1', rowSpan: 1, colSpan: 1 },
    ],
  })
})

test('an empty row completely covered by rowspan is not counted twice', () => {
  const result = parse(
    district('黄 浦 区')
      + '<tr><td rowspan="2">2A010</td><td rowspan="2">原银行</td><td rowspan="2">现银行</td><td rowspan="2">中山东一路10号</td></tr>'
      + '<tr></tr>'
      + row('2A011', '原大楼', '现大楼', '中山东一路11号'),
  )

  assert.equal(result.recordCount, 2)
  assert.deepEqual(result.records.map((record) => record.code), ['2A010', '2A011'])
  assert.deepEqual(result.records[0].components, [])
  assert.deepEqual(result.records[0].source.rowIndices, [3, 4])
  assert.deepEqual(result.records[0].rawRows[1], { rowIndex: 4, cells: [] })
})

test('star footnotes apply to every marked site in their district only', () => {
  const note = '*于1994年左右灭失'
  const result = parse(
    district('黄 浦 区')
      + row('2A001*', '原楼一', '现楼一', '甲路1号')
      + row('2A002', '原楼二', '现楼二', '甲路2号')
      + row('2A003*', '原楼三', '现楼三', '甲路3号')
      + `<tr><td colspan="4">${note}</td></tr>`
      + district('徐 汇 区')
      + row('2B001*', '原楼四', '现楼四', '乙路1号'),
  )

  assert.equal(result.recordCount, 4)
  const [first, unmarked, third, otherDistrict] = result.records
  assert.equal(first.code, '2A001')
  assert.equal(first.codeRaw, '2A001*')
  assert.ok(first.markers.includes('*'))
  assert.ok(first.sourceNotes.includes(note))
  assert.ok(third.sourceNotes.includes(note))
  assert.ok(!unmarked.sourceNotes.includes(note))
  assert.ok(!otherDistrict.sourceNotes.includes(note))
})

test('parenthetical alternate codes remain separate from the primary code', () => {
  const result = parse(district('黄 浦 区') + row('2A056(2E001)', '原大楼', '现大楼', '某路56号'))
  const [record] = result.records
  assert.equal(result.recordCount, 1)
  assert.equal(record.code, '2A056')
  assert.equal(record.codeRaw, '2A056(2E001)')
  assert.deepEqual(record.alternateCodes, ['2E001'])
})

test('first-batch alternate codes with intervening spaces retain their batch provenance', () => {
  const result = parse(district('黄 浦 区') + row('1A027 (1E001)', '原大楼', '现大楼', '某路27号'), { batch: 1 })
  const [record] = result.records
  assert.equal(result.batch, 1)
  assert.equal(record.batch, 1)
  assert.equal(record.source.batch, 1)
  assert.equal(record.code, '1A027')
  assert.equal(record.codeRaw, '1A027 (1E001)')
  assert.deepEqual(record.alternateCodes, ['1E001'])
})

test('nonstandard source codes are preserved and flagged instead of silently corrected', () => {
  const codes = ['D5035', '50D80', 'D50102']
  const result = parse(district('徐 汇 区') + codes.map((code, index) => row(code, `原楼${index}`, `现楼${index}`, `某路${index}号`)).join(''), { batch: 5 })

  assert.equal(result.recordCount, 3)
  assert.deepEqual(result.records.map((record) => record.codeRaw), codes)
  assert.equal(new Set(result.records.map((record) => record.id)).size, 3)
  for (const record of result.records) {
    assert.equal(record.code, null)
    assert.deepEqual(record.qualityFlags, ['nonstandard-code'])
    assert.deepEqual(record.alternateCodes, [])
  }
})

test('duplicate official codes preserve both records in source order with unique identifiers', () => {
  const result = parse(
    district('黄 浦 区')
      + row('5A012', '原楼一', '现楼一', '甲路12号')
      + row('5A013', '原楼二', '现楼二', '甲路13号')
      + row('5A012', '原楼三', '现楼三', '乙路12号')
      + district('静 安 区')
      + row('5F038', '原楼四', '现楼四', '丙路38号')
      + row('5F038', '原楼五', '现楼五', '丁路38号'),
    { batch: 5 },
  )

  assert.equal(result.recordCount, 5)
  assert.deepEqual(result.records.map((record) => record.code), ['5A012', '5A013', '5A012', '5F038', '5F038'])
  assert.deepEqual(result.records.map((record) => record.originalNameOrUse), ['原楼一', '原楼二', '原楼三', '原楼四', '原楼五'])
  assert.equal(new Set(result.records.map((record) => record.id)).size, 5)
  for (const index of [0, 2, 3, 4]) {
    assert.ok(result.records[index].qualityFlags.includes('duplicate-code'))
  }
  assert.ok(!result.records[1].qualityFlags.includes('duplicate-code'))
})

test('source control characters survive in raw cells but not in semantic fields', () => {
  const control = String.fromCharCode(127)
  const result = parse(
    district('黄 浦 区')
      + row(`2A${control}001`, `原${control}楼`, `现${control}楼`, `某路${control}1号`),
  )
  const [record] = result.records

  assert.equal(result.recordCount, 1)
  assert.equal(record.code, '2A001')
  assert.equal(record.originalNameOrUse, '原楼')
  assert.equal(record.listedNameOrUse, '现楼')
  assert.equal(record.addressAsListed, '某路1号')
  assert.ok(record.qualityFlags.includes('source-control-character'))
  assert.deepEqual(record.rawRows[0].cells.map((cell) => cell.text), [
    `2A${control}001`, `原${control}楼`, `现${control}楼`, `某路${control}1号`,
  ])
})

test('control characters in component rows are preserved and flag the containing site', () => {
  const control = String.fromCharCode(127)
  const result = parse(
    district('松 江 区')
      + '<tr><td rowspan="2">2M006</td><td>原校园</td><td>现校园</td><td rowspan="2">中山东路1号</td></tr>'
      + `<tr><td>原${control}建筑</td><td>现${control}建筑</td></tr>`,
  )
  const [record] = result.records

  assert.equal(result.recordCount, 1)
  assert.ok(record.qualityFlags.includes('source-control-character'))
  assert.deepEqual(record.components, [{
    originalNameOrUse: '原建筑', listedNameOrUse: '现建筑', sourceRowIndex: 4,
  }])
  assert.deepEqual(record.rawRows[1].cells.map((cell) => cell.text), [`原${control}建筑`, `现${control}建筑`])
})

test('multiple source tables preserve one-based table and row indices', () => {
  const result = parseHeritagePage(page(
    table(district('黄 浦 区') + row('2A001', '原楼甲', '现楼甲', '甲路1号'))
      + table(district('崇 明 县') + row('2M001', '原楼乙', '现楼乙', '乙路1号')),
  ), source)

  assert.equal(result.recordCount, 2)
  assert.deepEqual(result.records.map((record) => ({ table: record.source.tableIndex, rows: record.source.rowIndices })), [
    { table: 1, rows: [3] },
    { table: 2, rows: [3] },
  ])
})

test('a missing article content region is rejected', () => {
  assert.throws(() => parseHeritagePage(table(district('黄浦区') + row('2A001', '原楼', '现楼', '某路1号')), source))
})

for (const [name, malformedHeader] of [
  ['missing address column', '<tr><th>编 号</th><th>原名称/原使用单位</th><th>现名称/现使用单位</th></tr>'],
  ['unexpected fifth column', '<tr><th>编 号</th><th>原名称/原使用单位</th><th>现名称/现使用单位</th><th>地 址</th><th>备注</th></tr>'],
  ['reordered original and listed names', '<tr><th>编 号</th><th>现名称/现使用单位</th><th>原名称/原使用单位</th><th>地 址</th></tr>'],
  ['unrecognized column name', '<tr><th>编 号</th><th>无关字段</th><th>现名称/现使用单位</th><th>地 址</th></tr>'],
]) {
  test(`malformed header is rejected: ${name}`, () => {
    assert.throws(() => parseHeritagePage(page(table(district('黄浦区') + row('2A001', '原楼', '现楼', '某路1号'), malformedHeader)), source))
  })
}

for (const [name, malformedRow] of [
  ['three cells without a spanning predecessor', '<tr><td>2A001</td><td>原楼</td><td>现楼</td></tr>'],
  ['five cells', '<tr><td>2A001</td><td>原楼</td><td>现楼</td><td>某路1号</td><td>多余数据</td></tr>'],
  ['unclassified text', '<tr><td colspan="4">未分类但不可丢弃的来源文字</td></tr>'],
  ['missing code', row('', '原楼', '现楼', '某路1号')],
]) {
  test(`nonempty malformed record row is rejected: ${name}`, () => {
    assert.throws(() => parse(district('黄浦区') + malformedRow))
  })
}
