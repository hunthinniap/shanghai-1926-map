import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReviewWorkspace } from './ReviewApp'
import { amapUrl, exportReview, importReview, storageKey } from './model'
import type { Dataset, Decisions } from './model'

const dataset: Dataset = { schemaVersion: 1, updatedAt: '2026-11-10T12:00:00Z', recordCount: 2, records: [
  { officialId: 'building-1', code: '4C001', name: '测试别墅1号楼', listedName: '别墅', address: '测试路46号1号楼',
    district: '徐汇区', batch: 4, reasonCode: 'protected-component', reason: '具体楼栋待核。', sourceUrl: 'https://example.org/list',
    candidates: [
      { id: 'B0001', name: '测试别墅1号楼', address: '测试路46号1号楼', district: '徐汇区', category: '商务住宅;楼宇', location: '121.4,31.2', distanceMetres: 20, flags: [], addressMatch: '完整门牌一致' },
      { id: 'B0002', name: '测试别墅2号楼', address: '测试路46号2号楼', district: '徐汇区', category: '商务住宅;楼宇', location: '121.4,31.2', distanceMetres: 30, flags: ['楼栋号不符'], addressMatch: null },
    ] },
  { officialId: 'building-2', code: '4C002', name: '另一处住宅', listedName: '住宅', address: '另一条路20号', district: '黄浦区', batch: 4,
    reasonCode: 'insufficient-evidence', reason: '依据不足。', sourceUrl: 'https://example.org/list', candidates: [] },
] }
let container: HTMLDivElement, root: Root
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); container = document.createElement('div'); document.body.append(container); root = createRoot(container) })
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const render = async () => { await act(async () => root.render(<ReviewWorkspace dataset={dataset} />)) }
const click = async (element: HTMLElement) => { await act(async () => element.click()) }
const button = (text: string) => [...container.querySelectorAll('button')].find(element => element.textContent!.includes(text))!
const checkboxes = () => [...container.querySelectorAll<HTMLInputElement>('input[type=checkbox]')]
const saved = () => importReview(localStorage.getItem(storageKey)!, dataset).decisions
const status = async (value: string) => { const select = container.querySelectorAll('select')[0]; await act(async () => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })) }) }

describe('POI manual review', () => {
  it('opens each candidate in AMap and keeps building-scope warnings visible', async () => {
    await render()
    const links = [...container.querySelectorAll<HTMLAnchorElement>('.candidate-footer a')]
    expect(links.map(link => new URL(link.href).searchParams.get('markers'))).toEqual(['B0001', 'B0002'])
    expect(links.every(link => link.target === '_blank' && link.rel.includes('noopener'))).toBe(true)
    expect(container.textContent).toContain('楼栋号不符')
    expect((button('确认所选') as HTMLButtonElement).disabled).toBe(true)
  })

  it('persists multiple checked POIs as a draft, confirms explicitly, and restores after reload', async () => {
    await render()
    await click(checkboxes()[0]); await click(checkboxes()[1])
    expect(saved()['building-1'].selectedIds).toEqual(['B0001', 'B0002'])
    expect(saved()['building-1'].verdict).toBe('pending')
    await click(button('确认所选'))
    expect(saved()['building-1'].verdict).toBe('confirmed')
    expect(container.querySelector('#building-1')).toBeNull()
    expect(container.querySelector('progress')?.value).toBe(1)
    await act(async () => root.unmount()); root = createRoot(container); await render()
    expect(container.querySelector('progress')?.value).toBe(1)
    await status('confirmed')
    expect(checkboxes().every(input => input.checked)).toBe(true)
    await click(checkboxes()[1])
    expect(saved()['building-1'].verdict).toBe('pending')
    expect(saved()['building-1'].selectedIds).toEqual(['B0001'])
  })

  it('marks no match without leaving previously selected POIs in the exported decision', async () => {
    await render(); await click(checkboxes()[0]); await click(button('均不匹配'))
    expect(saved()['building-1']).toMatchObject({ verdict: 'no-match', selectedIds: [] })
    await status('no-match'); await click(button('撤销结论'))
    expect(saved()['building-1'].verdict).toBe('pending')
  })

  it('reports failed persistence while retaining the current selection for export', async () => {
    await render(); vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('Quota') })
    await click(checkboxes()[0])
    expect(container.querySelector('[role=alert]')?.textContent).toContain('导出当前进度')
    expect(checkboxes()[0].checked).toBe(true)
    expect((button('导出复核结果') as HTMLButtonElement).disabled).toBe(false)
  })

  it('round-trips notes, multiple choices and candidate links without treating unchecked candidates as approved', () => {
    const decisions: Decisions = { 'building-1': { verdict: 'confirmed', selectedIds: ['B0001'], note: '仅对应1号楼；<不是2号楼>', updatedAt: '2026-11-10' } }
    const result = exportReview(dataset, decisions)
    expect(result.records[0].selectedPois).toEqual([{ id: 'B0001', name: '测试别墅1号楼', address: '测试路46号1号楼', url: amapUrl('B0001') }])
    expect(importReview(JSON.stringify(result), dataset).decisions).toEqual(decisions)
    result.records[0].selectedIds = ['UNKNOWN']
    expect(importReview(JSON.stringify(result), dataset)).toEqual({ decisions: {}, skipped: 1 })
  })

  it('rejects inconsistent imported conclusions without mutating valid existing progress', () => {
    const document = exportReview(dataset, { 'building-1': { verdict: 'confirmed', selectedIds: [], note: '', updatedAt: '' } })
    expect(() => importReview(JSON.stringify(document), dataset)).toThrow('不一致')
    expect(() => importReview('{"records": []}', dataset)).toThrow('本页面导出')
  })
})
