import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AddressUseEvidencePanel } from './AddressUseEvidencePanel'
import { reviewedAddressUses } from '../data/reviewedAddressUses'

describe('address evidence card', () => {
  it('shows references with visible uncertainty, precise room scope, dates, and source links', () => {
    const entry = reviewedAddressUses.find(e => e.expectedSourceRecordIds.includes(381))!
    const html = renderToStaticMarkup(<AddressUseEvidencePanel evidence={entry.evidence} />)
    expect(html).toContain('今址用途参考')
    expect(html).not.toContain('<dt>现在用途</dt>')
    expect(html).toContain('历史原址／原建筑对应待核')
    expect(html).toContain('201室')
    expect(html).toContain('此前原址关系待核限制仍保留')
    expect(html).toContain('资料时点：')
    expect(html).toContain('未标日期')
    expect(html).toContain(entry.evidence[0].sources[0].url.replaceAll('&', '&amp;'))
  })
  it('shows resolved use with the relocation/demolition limitations intact', () => {
    for (const id of [361, 1237]) {
      const entry = reviewedAddressUses.find(e => e.expectedSourceRecordIds.includes(id))!
      const html = renderToStaticMarkup(<AddressUseEvidencePanel evidence={entry.evidence} />)
      expect(html).toContain('<dt>现在用途</dt>')
      expect(html).toContain(id === 361 ? '拆院建楼' : '1993年平移')
    }
  })
})
