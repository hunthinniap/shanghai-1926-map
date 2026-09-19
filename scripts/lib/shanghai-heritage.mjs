import { JSDOM } from 'jsdom'

const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu
const compact = (value) => value.replace(/\s/gu, '')
const semanticText = (value) => value.replace(controlCharacters, '').trim() || null

// Preserve the separation provided by BR and block elements; textContent alone
// concatenates the names of separate occupants and separate street addresses.
function cellText(cell) {
  function visit(node) {
    if (node.nodeType === 3) return node.nodeValue
    if (node.nodeType !== 1) return ''
    if (node.tagName === 'BR') return '\n'
    const text = [...node.childNodes].map(visit).join('')
    return ['P', 'DIV', 'LI'].includes(node.tagName) ? `${text}\n` : text
  }
  return visit(cell).replace(/\r\n?/gu, '\n').replace(/\u00a0/gu, ' ')
    .split('\n').map((line) => line.replace(/[\t ]+/gu, ' ').trim()).filter(Boolean).join('\n')
}

export function parseHeritagePage(html, source) {
  const dom = new JSDOM(html)
  try {
    const content = dom.window.document.querySelector('.Article_content')
    if (!content) throw new Error(`Missing Article_content: ${source.url}`)
    const tables = [...content.querySelectorAll('table')]
    if (!tables.length) throw new Error(`No listing tables: ${source.url}`)
    const records = []
    const sections = []
    const notes = []
    const anomalies = []
    const tableStats = []
    const identifierCounts = new Map()
    let district = null
    let currentSection = null
    let headers = null

    for (const [tableOffset, table] of tables.entries()) {
      const tableIndex = tableOffset + 1
      const stats = { tableIndex, physicalRows: table.rows.length, recordRows: 0,
        districtRows: 0, headerRows: 0, continuationRows: 0, emptyRows: 0, noteRows: 0 }
      let pending = []
      const byOriginRow = new Map()
      for (const [rowOffset, row] of [...table.rows].entries()) {
        const rowIndex = rowOffset + 1
        const rawCells = [...row.cells].map((cell) => ({ text: cellText(cell), rowSpan: cell.rowSpan, colSpan: cell.colSpan }))
        const rawRow = { rowIndex, cells: rawCells }
        const inherited = pending.map((entry) => entry?.cell)
        const grid = [...inherited]
        pending = pending.map((entry) => entry?.remaining > 1 ? { ...entry, remaining: entry.remaining - 1 } : undefined)
        let column = 0
        for (const cell of rawCells) {
          while (grid[column]) column += 1
          if (column + cell.colSpan > 4 || cell.rowSpan < 1) throw new Error(`Invalid cell span at table ${tableIndex}, row ${rowIndex}`)
          const placed = { ...cell, originRowIndex: rowIndex }
          for (let offset = 0; offset < cell.colSpan; offset += 1) {
            if (grid[column + offset]) throw new Error(`Overlapping cells at row ${rowIndex}`)
            grid[column + offset] = placed
            if (cell.rowSpan > 1) pending[column + offset] = { cell: placed, remaining: cell.rowSpan - 1 }
          }
          column += cell.colSpan
        }

        const single = rawCells.length === 1 && rawCells[0].colSpan === 4 ? rawCells[0].text : null
        if (single && /^(?:原)?[\p{Script=Han}]+(?:区|县)$/u.test(compact(single))) {
          if (inherited.some(Boolean)) throw new Error(`District overlaps a record at row ${rowIndex}`)
          district = compact(single)
          currentSection = { districtAsListed: district, headingRaw: single, tableIndex, rowIndex, recordCount: 0 }
          sections.push(currentSection)
          stats.districtRows += 1
          continue
        }
        if (rawCells[0] && compact(rawCells[0].text) === '编号') {
          const actual = rawCells.map((cell) => compact(cell.text))
          const expected = ['编号', '原名称/原使用单位', '现名称/现使用单位', '地址']
          if (actual.join('|') !== expected.join('|') || rawCells.some((cell) => cell.colSpan !== 1 || cell.rowSpan !== 1)) {
            throw new Error(`Unexpected listing headers at row ${rowIndex}: ${actual.join('|')}`)
          }
          headers = rawCells.map((cell) => cell.text)
          stats.headerRows += 1
          continue
        }
        if (single?.startsWith('*')) {
          const targets = records.filter((record) => record.source.sectionRowIndex === currentSection?.rowIndex &&
            record.source.tableIndex === tableIndex && record.markers.includes('*'))
          if (!targets.length) throw new Error(`Unattached source footnote at row ${rowIndex}`)
          for (const record of targets) record.sourceNotes.push(single)
          notes.push({ text: single, districtAsListed: district, tableIndex, rowIndex, appliesTo: targets.map((record) => record.id) })
          stats.noteRows += 1
          continue
        }
        if (!rawCells.some((cell) => cell.text) && !inherited.some(Boolean)) {
          stats.emptyRows += 1
          continue
        }
        if (!headers || !district || grid.length !== 4 || Array.from({ length: 4 }, (_, index) => grid[index]).some((cell) => !cell)) {
          throw new Error(`Unclassified or incomplete row ${rowIndex} in ${source.url}`)
        }

        if (grid[0].originRowIndex !== rowIndex) {
          const parent = byOriginRow.get(grid[0].originRowIndex)
          if (!parent) throw new Error(`Continuation lacks a parent at row ${rowIndex}`)
          parent.rawRows.push(rawRow)
          parent.source.rowIndices.push(rowIndex)
          if (rawCells.some((cell) => cell.text.replace(controlCharacters, '') !== cell.text) &&
            !parent.qualityFlags.includes('source-control-character')) parent.qualityFlags.push('source-control-character')
          if (rawCells.length) {
            if (rawCells.length !== 2 || grid[3].originRowIndex === rowIndex ||
              grid[1].originRowIndex !== rowIndex || grid[2].originRowIndex !== rowIndex) {
              throw new Error(`Unrecognized component row ${rowIndex}`)
            }
            parent.components.push({ originalNameOrUse: semanticText(grid[1].text),
              listedNameOrUse: semanticText(grid[2].text), sourceRowIndex: rowIndex })
          }
          stats.continuationRows += 1
          continue
        }
        const codeText = semanticText(grid[0].text)
        if (rawCells.length !== 4 || rawCells.some((cell) => cell.colSpan !== 1) || !/^[A-Za-z0-9][A-Za-z0-9\s()*（）]*$/u.test(codeText ?? '')) {
          throw new Error(`Unclassified nonempty row ${rowIndex} in ${source.url}`)
        }
        const codeRaw = grid[0].text
        const codeMatch = codeText.match(/^(\d+[A-Z]\d{3})(?:\s*[（(]\s*(\d+[A-Z]\d{3})\s*[）)])?\s*(\*)?$/u)
        const code = codeMatch?.[1] ?? null
        const token = code ?? `b${source.batch}-${compact(codeText)}`
        const occurrence = (identifierCounts.get(token) ?? 0) + 1
        identifierCounts.set(token, occurrence)
        const record = {
          id: `sh-fgj-${token}-${String(occurrence).padStart(2, '0')}`,
          batch: source.batch, code, codeRaw, alternateCodes: codeMatch?.[2] ? [codeMatch[2]] : [],
          markers: codeMatch?.[3] ? ['*'] : [], districtAsListed: district,
          originalNameOrUse: semanticText(grid[1].text), listedNameOrUse: semanticText(grid[2].text),
          addressAsListed: semanticText(grid[3].text), components: [], sourceNotes: [], qualityFlags: [],
          source: { ...source, tableIndex, rowIndices: [rowIndex], sectionRowIndex: currentSection.rowIndex,
            districtHeadingRaw: currentSection.headingRaw, headersRaw: [...headers] },
          rawRows: [rawRow],
        }
        if (!code) record.qualityFlags.push('nonstandard-code')
        if (code && Number(code.match(/^\d+/u)[0]) !== source.batch) record.qualityFlags.push('code-batch-mismatch')
        if (rawCells.some((cell) => cell.text.replace(controlCharacters, '') !== cell.text)) record.qualityFlags.push('source-control-character')
        for (const field of ['originalNameOrUse', 'listedNameOrUse', 'addressAsListed']) {
          if (record[field] === null) record.qualityFlags.push(`missing-${field}`)
        }
        records.push(record)
        byOriginRow.set(rowIndex, record)
        currentSection.recordCount += 1
        stats.recordRows += 1
      }
      if (pending.some(Boolean)) throw new Error(`Rowspan extends beyond table ${tableIndex}`)
      tableStats.push(stats)
    }
    const byCode = new Map()
    for (const record of records) {
      if (record.code) byCode.set(record.code, [...(byCode.get(record.code) ?? []), record])
    }
    for (const [code, matches] of byCode) {
      if (matches.length < 2) continue
      for (const record of matches) record.qualityFlags.push('duplicate-code')
      anomalies.push({ type: 'duplicate-code', code, recordIds: matches.map((record) => record.id) })
    }
    for (const record of records) {
      for (const flag of record.qualityFlags.filter((flag) => flag !== 'duplicate-code')) {
        anomalies.push({ type: flag, recordId: record.id, codeRaw: record.codeRaw,
          tableIndex: record.source.tableIndex, rowIndex: record.source.rowIndices[0] })
      }
    }
    if (!records.length || records.reduce((sum, record) => sum + record.rawRows.length, 0) !==
      tableStats.reduce((sum, stats) => sum + stats.recordRows + stats.continuationRows, 0)) {
      throw new Error(`Listing row accounting failed: ${source.url}`)
    }
    return { batch: source.batch, title: source.title, source, recordCount: records.length, records, sections, notes, tableStats, anomalies }
  } finally {
    dom.window.close()
  }
}
