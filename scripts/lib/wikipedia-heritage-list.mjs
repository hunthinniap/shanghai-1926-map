import { JSDOM } from 'jsdom'

const wikiBase = 'https://zh.wikipedia.org/wiki/'
const batchNumbers = new Map(['一', '二', '三', '四', '五'].map((value, index) => [value, index + 1]))
const fields = ['sequenceRaw', 'codeRaw', 'originalNameOrUse', 'listedNameOrUse', 'addressAsListed',
  'districtAsListed', 'constructionDateText', 'floorsText', 'structureText', 'designerText',
  'protectionCategoryText', 'useTypeText']
const headerFields = new Map([
  ['序号', 'sequenceRaw'], ['编号', 'codeRaw'], ['落成时名称', 'originalNameOrUse'],
  ['原名称/原使用单位', 'originalNameOrUse'], ['建筑名称/现使用单位', 'originalNameOrUse'],
  ['现在名称', 'listedNameOrUse'], ['公布时名称/使用单位', 'listedNameOrUse'],
  ['现名称/现使用单位', 'listedNameOrUse'], ['地址', 'addressAsListed'], ['所在区', 'districtAsListed'],
  ['建造年代', 'constructionDateText'], ['层数', 'floorsText'], ['原结构类型', 'structureText'],
  ['设计者/施工者', 'designerText'], ['保护类别', 'protectionCategoryText'],
  ['原使用性质/现使用性质', 'useTypeText'], ['照片', 'images'],
])
const expectedHeaders = {
  1: ['序号', '落成时名称', '现在名称', '所在区', '地址', '保护类别', '建造年代', '照片'],
  2: ['序号', '编号', '原名称/原使用单位', '公布时名称/使用单位', '地址', '层数', '原结构类型', '建造年代', '设计者/施工者', '照片'],
  3: ['序号', '编号', '原名称/原使用单位', '现名称/现使用单位', '地址', '层数', '原结构类型', '建造年代', '设计者/施工者', '原使用性质/现使用性质', '照片'],
  4: ['序号', '编号', '原名称/原使用单位', '现名称/现使用单位', '地址', '建造年代', '照片'],
  5: ['编号', '建筑名称/现使用单位', '地址', '层数', '照片'],
}

function textOf(element) {
  function visit(node) {
    if (node.nodeType === 3) return node.nodeValue
    if (node.nodeType !== 1 || node.matches('sup.reference, .mw-editsection, script, style')) return ''
    if (node.tagName === 'BR') return '\n'
    const text = [...node.childNodes].map(visit).join('')
    return ['P', 'DIV', 'LI'].includes(node.tagName) ? `${text}\n` : text
  }
  return visit(element).replace(/\r\n?/gu, '\n').replace(/\u00a0/gu, ' ')
    .split('\n').map((line) => line.replace(/[\t ]+/gu, ' ').trim()).filter(Boolean).join('\n')
}

function sectionFor(table, tableIndex) {
  let batchHeading = null
  let districtHeading = null
  for (let section = table.closest('section'); section; section = section.parentElement?.closest('section')) {
    const heading = [...section.children].find((child) => child.matches('h2,h3'))
    if (heading?.tagName === 'H3' && !districtHeading) districtHeading = heading
    if (heading?.tagName === 'H2') { batchHeading = heading; break }
  }
  const batchTitle = batchHeading ? textOf(batchHeading) : ''
  const batch = batchNumbers.get(batchTitle.match(/^第([一二三四五])批$/u)?.[1])
  if (!batch) throw new Error(`Unknown Wikipedia listing section at table ${tableIndex}: ${batchTitle}`)
  if (batch === 5 && !districtHeading) throw new Error(`Missing fifth-batch district at table ${tableIndex}`)
  const heading = districtHeading ?? batchHeading
  return { batch, district: batch === 5 ? textOf(districtHeading) : null,
    sectionTitle: districtHeading ? `${batchTitle} / ${textOf(districtHeading)}` : batchTitle,
    sectionAnchor: heading.id || null }
}

function unique(items, key) {
  return [...new Map(items.map((item) => [key(item), item])).values()]
}

function articleLinks(cells, role) {
  const links = []
  for (const cell of cells) for (const anchor of cell.element.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href')
    if (!href || href.startsWith('#') || anchor.classList.contains('new') || anchor.closest('sup.reference')) continue
    const url = new URL(href, wikiBase)
    if (url.hostname !== 'zh.wikipedia.org' || url.searchParams.has('redlink') || url.searchParams.get('action') === 'edit') continue
    if (!/^\/(?:wiki|zh(?:-[a-z]+)?)\//u.test(url.pathname)) continue
    const title = anchor.getAttribute('title') || decodeURIComponent(url.pathname.replace(/^\/[^/]+\//u, '')).replaceAll('_', ' ')
    if (/^(?:File|Image|Category|Help|Template|Special|Wikipedia|文件|檔案|图像|圖像|分类|分類|帮助|說明|模板|特殊):/iu.test(title)) continue
    links.push({ title, url: url.href, role })
  }
  return unique(links, (link) => `${link.role}:${link.url}`)
}

function imageLinks(cells) {
  const links = []
  for (const cell of cells) for (const img of cell.element.querySelectorAll('img')) {
    const file = img.closest('a')?.getAttribute('href') || img.getAttribute('resource')
    const src = img.getAttribute('src')
    links.push({ filePageUrl: file ? new URL(file, wikiBase).href : null,
      imageUrl: src ? new URL(src, wikiBase).href : null, alt: img.getAttribute('alt') || null })
  }
  return unique(links, (link) => `${link.filePageUrl}:${link.imageUrl}`)
}

function valuesFor(grid, columns, district) {
  const cellsByField = Object.fromEntries([...fields, 'images'].map((field) => [field, []]))
  for (const [index, field] of columns.entries()) {
    if (grid[index] && !cellsByField[field].includes(grid[index])) cellsByField[field].push(grid[index])
  }
  const values = Object.fromEntries(fields.map((field) => [field,
    cellsByField[field].map((cell) => cell.text).filter(Boolean).join('\n') || null]))
  if (district) values.districtAsListed = district
  return { ...values,
    articleLinks: [...articleLinks(cellsByField.originalNameOrUse, 'original-name'), ...articleLinks(cellsByField.listedNameOrUse, 'listed-name')],
    imageLinks: imageLinks(cellsByField.images) }
}

// Revision 94231361 has no final photo TD on these two otherwise complete rows.
// Preserve the physical source rows and make this narrowly scoped omission visible.
function knownMissingPhoto(grid, { batch, tableIndex, rowIndex, columns }) {
  const expected = new Map([[136, '4D042'], [138, '4D044']])
  return batch === 4 && tableIndex === 5 && expected.get(rowIndex) === grid[1]?.text &&
    columns.length === 9 && columns[8] === 'images' && grid.length === 8 &&
    Array.from({ length: 8 }, (_, index) => grid[index]).every(Boolean)
}

export function parseWikipediaHeritageList(html, source) {
  const dom = new JSDOM(html)
  try {
    const tables = [...dom.window.document.querySelectorAll('table.wikitable')]
    if (!tables.length) throw new Error('No Wikipedia wikitables found')
    const records = []
    const tableStats = []
    const sourceUrl = source.url || source.requestedUrl || `${wikiBase}上海市优秀历史建筑`
    for (const [tableOffset, table] of tables.entries()) {
      const tableIndex = tableOffset + 1
      const rows = [...table.rows]
      const headers = [...(rows[0]?.cells ?? [])].map((cell) => textOf(cell).replace(/\s/gu, ''))
      if (tableIndex === 1 && headers.join('|') === '区|第一批|第二批|第三批|第四批|第五批|总计') {
        tableStats.push({ tableIndex, kind: 'summary', physicalRows: rows.length, recordCount: 0, continuationRows: 0, anomalies: [] })
        continue
      }
      const { batch, district, sectionTitle, sectionAnchor } = sectionFor(table, tableIndex)
      if (headers.join('|') !== expectedHeaders[batch].join('|')) throw new Error(`Unexpected headers at Wikipedia table ${tableIndex}: ${headers.join('|')}`)
      const columns = []
      for (const [index, cell] of [...rows[0].cells].entries()) {
        if (cell.rowSpan !== 1) throw new Error(`Spanning header row at Wikipedia table ${tableIndex}`)
        for (let offset = 0; offset < cell.colSpan; offset += 1) columns.push(headerFields.get(headers[index]))
      }
      const stats = { tableIndex, kind: 'list', batch, sectionTitle, physicalRows: rows.length, recordCount: 0, continuationRows: 0, anomalies: [] }
      const byOrigin = new Map()
      let pending = []
      for (const [rowOffset, row] of rows.entries()) {
        if (rowOffset === 0) continue
        const rowIndex = rowOffset + 1
        const physical = [...row.cells].map((element) => ({ element, text: textOf(element), rowSpan: element.rowSpan, colSpan: element.colSpan, originRowIndex: rowIndex }))
        const rawRow = { rowIndex, cells: physical.map(({ text, rowSpan, colSpan }) => ({ text, rowSpan, colSpan })) }
        const grid = pending.map((entry) => entry?.cell)
        pending = pending.map((entry) => entry?.remaining > 1 ? { ...entry, remaining: entry.remaining - 1 } : undefined)
        let column = 0
        for (const cell of physical) {
          while (grid[column]) column += 1
          if (cell.rowSpan < 1 || column + cell.colSpan > columns.length) throw new Error(`Invalid span at Wikipedia table ${tableIndex}, row ${rowIndex}`)
          for (let offset = 0; offset < cell.colSpan; offset += 1) {
            if (grid[column + offset]) throw new Error(`Overlapping cells at Wikipedia table ${tableIndex}, row ${rowIndex}`)
            grid[column + offset] = cell
            if (cell.rowSpan > 1) pending[column + offset] = { cell, remaining: cell.rowSpan - 1 }
          }
          column += cell.colSpan
        }
        const rowNotes = []
        if (grid.length !== columns.length || Array.from({ length: columns.length }, (_, index) => grid[index]).some((cell) => !cell)) {
          if (!knownMissingPhoto(grid, { batch, tableIndex, rowIndex, columns })) {
            throw new Error(`Incomplete Wikipedia table ${tableIndex}, row ${rowIndex}: expected ${columns.length} logical cells`)
          }
          const note = '维基源表缺少本行末尾照片单元格；原始单元格按来源保留。'
          rowNotes.push(note)
          stats.anomalies.push({ type: 'missing-photo-cell', rowIndex, codeRaw: grid[1].text, note })
        }
        if (!grid[0]?.text) throw new Error(`Missing listing identifier at Wikipedia table ${tableIndex}, row ${rowIndex}`)
        const values = valuesFor(grid, columns, district)
        if (grid[0].originRowIndex !== rowIndex) {
          const parent = byOrigin.get(grid[0].originRowIndex)
          if (!parent) throw new Error(`Unattached continuation at Wikipedia table ${tableIndex}, row ${rowIndex}`)
          parent.rawRows.push(rawRow)
          parent.source.rowIndices.push(rowIndex)
          if (physical.length) parent.components.push({ ...values, sourceRowIndex: rowIndex })
          parent.articleLinks = unique([...parent.articleLinks, ...values.articleLinks], (link) => `${link.role}:${link.url}`)
          parent.imageLinks = unique([...parent.imageLinks, ...values.imageLinks], (link) => `${link.filePageUrl}:${link.imageUrl}`)
          parent.notes.push(...rowNotes)
          stats.continuationRows += 1
          continue
        }
        const record = { id: `wiki-heritage-t${String(tableIndex).padStart(2, '0')}-r${String(rowIndex).padStart(4, '0')}`,
          batch, ...values, components: [], notes: rowNotes, rawRows: [rawRow],
          source: { tableIndex, rowIndices: [rowIndex], sectionTitle, sectionAnchor, url: sourceUrl, revisionId: source.revisionId ?? null } }
        if (batch === 5) record.notes.push('维基第五批“建筑名称/现使用单位”为混合列；原样记录于originalNameOrUse，不区分建筑原名与现使用单位。')
        records.push(record)
        byOrigin.set(rowIndex, record)
        stats.recordCount += 1
      }
      if (pending.some(Boolean)) throw new Error(`Rowspan extends beyond Wikipedia table ${tableIndex}`)
      tableStats.push(stats)
    }
    if (!records.length) throw new Error('No Wikipedia heritage listings parsed')
    return { source, recordCount: records.length, records, tableStats }
  } finally {
    dom.window.close()
  }
}
