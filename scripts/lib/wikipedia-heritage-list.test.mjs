import test from 'node:test'
import assert from 'node:assert/strict'
import { parseWikipediaHeritageList } from './wikipedia-heritage-list.mjs'

const source = { requestedUrl: 'https://zh.wikipedia.org/zh-hans/上海市优秀历史建筑', revisionId: 'test-revision' }
const summary = '<section><h2 id="历史概况">历史概况</h2><table class="wikitable"><tr><th>区</th><th>第一批</th><th>第二批</th><th>第三批</th><th>第四批</th><th>第五批</th><th>总计</th></tr><tr><td>黄浦区</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>15</td></tr></table></section>'
const headers = {
  1: ['序号', '落成时名称', '现在名称', '所在区', '地址', '保护类别', '建造年代', '照片'],
  2: ['序号', '编号', '原名称/原使用单位', '公布时名称/使用单位', '地址', '层数', '原结构类型', '建造年代', '设计者/施工者', '照片'],
  3: ['序号', '编号', '原名称/原使用单位', '现名称/现使用单位', '地址', '层数', '原结构类型', '建造年代', '设计者/施工者', '原使用性质/现使用性质', '照片'],
  4: ['序号', '编号', '原名称/原使用单位', '现名称/现使用单位', '地址', '建造年代', '照片'],
  5: ['编号', '建筑名称/现使用单位', '地址', '层数', '照片'],
}
const names = { 1: '第一批', 2: '第二批', 3: '第三批', 4: '第四批', 5: '第五批' }
const row = (...cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`
const table = (batch, rows) => `<table class="wikitable"><tr>${headers[batch].map((label, index) => `<th${batch === 4 && [2, 3].includes(index) ? ' colspan="2"' : ''}>${label}</th>`).join('')}</tr>${rows}</table>`
const section = (batch, content) => `<section><h2 id="${names[batch]}">${names[batch]}</h2>${content}</section>`
const parse = (content) => parseWikipediaHeritageList(`<!doctype html><html><body>${summary}${content}</body></html>`, source)

test('first-batch records retain all available fields, source indices and absent-field nulls', () => {
  const result = parse(section(1, table(1, row('1', '老银行', '新银行', '原闸北区', '某路1号', 'II2', '1923年', ''))))
  assert.equal(result.recordCount, 1)
  assert.deepEqual(result.source, source)
  assert.equal(result.tableStats.length, 2)
  const [record] = result.records
  assert.equal(record.batch, 1)
  assert.equal(record.sequenceRaw, '1')
  assert.equal(record.originalNameOrUse, '老银行')
  assert.equal(record.listedNameOrUse, '新银行')
  assert.equal(record.districtAsListed, '原闸北区')
  assert.equal(record.addressAsListed, '某路1号')
  assert.equal(record.protectionCategoryText, 'II2')
  assert.equal(record.constructionDateText, '1923年')
  for (const field of ['codeRaw', 'floorsText', 'structureText', 'designerText', 'useTypeText']) assert.equal(record[field], null)
  assert.deepEqual(record.components, [])
  assert.deepEqual(record.articleLinks, [])
  assert.deepEqual(record.imageLinks, [])
  assert.equal(record.source.tableIndex, 2)
  assert.deepEqual(record.source.rowIndices, [2])
  assert.equal(record.source.sectionTitle, '第一批')
  assert.equal(record.source.sectionAnchor, '第一批')
  assert.equal(record.source.url, source.requestedUrl)
  assert.equal(record.source.revisionId, source.revisionId)
  assert.deepEqual(record.rawRows[0].cells[0], { text: '1', rowSpan: 1, colSpan: 1 })
})

test('legacy codes stay as source text while name links have distinct roles', () => {
  const result = parse(section(2, table(2, row(
    '1', 'A-Ⅲ-050',
    '<a href="./原大楼" title="原大楼">原大楼</a><br>别名<sup class="reference"><a href="./引文">[3]</a></sup><br><a class="new" href="./未建条目?action=edit&amp;redlink=1" title="未建条目">未建条目</a>',
    '<a href="./现使用单位" title="现使用单位">现使用单位</a>',
    '某路1号<br>某路3号', '7', '钢筋混凝土', '1929',
    '<a href="./设计者" title="设计者">设计者</a>',
    '<a href="./File:Building.jpg"><img src="//upload.wikimedia.org/example.jpg" alt="大楼正面"></a>',
  ))))
  const [record] = result.records
  assert.equal(record.codeRaw, 'A-Ⅲ-050')
  assert.ok(!Object.hasOwn(record, 'code'))
  assert.equal(record.originalNameOrUse, '原大楼\n别名\n未建条目')
  assert.equal(record.addressAsListed, '某路1号\n某路3号')
  assert.equal(record.floorsText, '7')
  assert.equal(record.structureText, '钢筋混凝土')
  assert.equal(record.designerText, '设计者')
  assert.deepEqual(record.articleLinks.map(({ title, role }) => ({ title, role })), [
    { title: '原大楼', role: 'original-name' }, { title: '现使用单位', role: 'listed-name' },
  ])
  assert.ok(record.articleLinks.every((link) => link.url.startsWith('https://zh.wikipedia.org/wiki/')))
  assert.deepEqual(record.imageLinks, [{ filePageUrl: 'https://zh.wikipedia.org/wiki/File:Building.jpg', imageUrl: 'https://upload.wikimedia.org/example.jpg', alt: '大楼正面' }])
  assert.equal(record.rawRows[0].cells[2].text, '原大楼\n别名\n未建条目')
})

test('third-batch use types and legacy Roman-numeral codes are preserved', () => {
  const result = parse(section(3, table(3, row('1', 'A-III-01', '原楼', '现楼', '甲路1号', '6', '砖木', '1920', '某洋行', '住宅/办公', ''))))
  assert.equal(result.records[0].useTypeText, '住宅/办公')
  assert.equal(result.records[0].codeRaw, 'A-III-01')
})

test('rowspans group sub-buildings by the sequence cell and preserve every physical row', () => {
  const result = parse(section(1, table(1,
    '<tr><td rowspan="2">14</td><td><a href="./老楼" title="老楼">老楼</a></td><td>商场</td><td rowspan="2">黄浦区</td><td>甲路1号</td><td rowspan="2">II3</td><td>1918</td><td></td></tr>'
      + '<tr><td><a href="./新楼" title="新楼">新楼</a></td><td>宾馆</td><td>甲路3号</td><td>1933</td><td></td></tr>',
  )))
  assert.equal(result.recordCount, 1)
  const [record] = result.records
  assert.equal(record.originalNameOrUse, '老楼')
  assert.equal(record.components.length, 1)
  assert.equal(record.components[0].originalNameOrUse, '新楼')
  assert.equal(record.components[0].listedNameOrUse, '宾馆')
  assert.equal(record.components[0].districtAsListed, '黄浦区')
  assert.equal(record.components[0].addressAsListed, '甲路3号')
  assert.equal(record.components[0].constructionDateText, '1933')
  assert.equal(record.components[0].sourceRowIndex, 3)
  assert.deepEqual(record.source.rowIndices, [2, 3])
  assert.equal(record.rawRows.length, 2)
  assert.equal(record.rawRows[1].cells.length, 5)
  assert.deepEqual(record.articleLinks.map((link) => link.title), ['老楼', '新楼'])
})

test('fourth-batch two-column names preserve both group and individual building names', () => {
  const result = parse(section(4, table(4,
    '<tr><td rowspan="2">10</td><td rowspan="2">4D010</td><td rowspan="2">原校园</td><td>旧甲楼</td><td rowspan="2">现校园</td><td>甲楼</td><td rowspan="2">甲路10号</td><td>1920</td><td></td></tr>'
      + '<tr><td>旧乙楼</td><td>乙楼</td><td>1930</td><td></td></tr>',
  )))
  assert.equal(result.recordCount, 1)
  const [record] = result.records
  assert.equal(record.originalNameOrUse, '原校园\n旧甲楼')
  assert.equal(record.listedNameOrUse, '现校园\n甲楼')
  assert.equal(record.components[0].originalNameOrUse, '原校园\n旧乙楼')
  assert.equal(record.components[0].listedNameOrUse, '现校园\n乙楼')
  assert.equal(record.components[0].addressAsListed, '甲路10号')
  assert.equal(record.components[0].constructionDateText, '1930')
})

test('a name cell spanning two logical columns is not duplicated', () => {
  const result = parse(section(4, table(4,
    '<tr><td>1</td><td>4A001</td><td colspan="2">原楼</td><td colspan="2">现楼</td><td>甲路1号</td><td>1905</td><td></td></tr>',
  )))
  assert.equal(result.records[0].originalNameOrUse, '原楼')
  assert.equal(result.records[0].listedNameOrUse, '现楼')
  assert.equal(result.records[0].rawRows[0].cells[2].colSpan, 2)
})

test('fifth-batch mixed names use original-name roles and district subsection provenance', () => {
  const content = `<section><h3 id="原闸北区">原闸北区</h3>${table(5,
    '<tr><td rowspan="2">ZB-J-001-V</td><td><a href="./某楼" title="某楼">某楼/现单位</a></td><td>甲路1号</td><td>3层</td><td></td></tr>'
      + row('附属建筑', '甲路3号', '2层', ''),
  )}</section>`
  const result = parse(section(5, content))
  const [record] = result.records
  assert.equal(result.recordCount, 1)
  assert.equal(record.batch, 5)
  assert.equal(record.codeRaw, 'ZB-J-001-V')
  assert.equal(record.sequenceRaw, null)
  assert.equal(record.originalNameOrUse, '某楼/现单位')
  assert.equal(record.listedNameOrUse, null)
  assert.equal(record.districtAsListed, '原闸北区')
  assert.equal(record.source.sectionAnchor, '原闸北区')
  assert.ok(record.source.sectionTitle.includes('第五批'))
  assert.ok(record.notes.some((note) => note.includes('混合列')))
  assert.equal(record.articleLinks[0].role, 'original-name')
  assert.equal(record.components[0].originalNameOrUse, '附属建筑')
})

test('source row identifiers remain unique and stable even when listing identifiers repeat', () => {
  const content = section(1, table(1,
    row('1', '甲楼', '甲单位', '黄浦区', '甲路1号', '', '', '')
      + row('1', '乙楼', '乙单位', '黄浦区', '乙路1号', '', '', ''),
  ))
  const first = parse(content)
  const second = parse(content)
  assert.equal(first.recordCount, 2)
  assert.equal(new Set(first.records.map((record) => record.id)).size, 2)
  assert.deepEqual(first.records.map((record) => record.id), second.records.map((record) => record.id))
})

test('a wholly inherited empty row is retained without inventing a component', () => {
  const values = ['1', '原楼', '现楼', '黄浦区', '某路1号', 'II2', '1920', '']
  const result = parse(section(1, table(1, `<tr>${values.map((value) => `<td rowspan="2">${value}</td>`).join('')}</tr><tr></tr>`)))
  assert.equal(result.recordCount, 1)
  assert.deepEqual(result.records[0].components, [])
  assert.deepEqual(result.records[0].source.rowIndices, [2, 3])
  assert.deepEqual(result.records[0].rawRows[1], { rowIndex: 3, cells: [] })
})

for (const [name, malformed] of [
  ['missing last cell', row('1', '原楼', '现楼', '黄浦区', '某路1号', 'II2', '1920')],
  ['extra cell', row('1', '原楼', '现楼', '黄浦区', '某路1号', 'II2', '1920', '', '多余')],
  ['missing listing identifier', row('', '原楼', '现楼', '黄浦区', '某路1号', 'II2', '1920', '')],
  ['dangling rowspan', '<tr><td rowspan="2">1</td><td>原楼</td><td>现楼</td><td>黄浦区</td><td>某路1号</td><td>II2</td><td>1920</td><td></td></tr>'],
]) {
  test(`unexpected malformed table rows are rejected: ${name}`, () => {
    assert.throws(() => parse(section(1, table(1, malformed))))
  })
}

test('unexpected headers and unrecognized sections are rejected', () => {
  const valid = table(1, row('1', '原楼', '现楼', '黄浦区', '某路1号', 'II2', '1920', ''))
  assert.throws(() => parse(section(1, valid.replace('落成时名称', '未知字段'))))
  assert.throws(() => parse(`<section><h2>其他名单</h2>${valid}</section>`))
})
