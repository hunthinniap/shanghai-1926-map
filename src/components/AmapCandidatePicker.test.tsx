import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AmapCandidatePicker } from './AmapCandidatePicker'

const place = { officialId: 'test-building', name: '测试住宅', address: '测试路1号' }
const dataset = { schemaVersion: 1, records: [{ ...place, candidates: [
  { id: 'B0001', name: '测试住宅东楼', address: '测试路1号', district: '黄浦区', flags: ['具体楼栋待核'] },
  { id: 'B0002', name: '测试住宅西楼', address: '测试路3号', district: '黄浦区', flags: ['门牌未对应'] },
] }] }
let container: HTMLDivElement, root: Root, counts: Record<string, number>, fail: boolean
const response = (body: unknown, ok = true) => ({ ok, json: async () => body })
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  counts = { B0001: 4, B0002: 0 }; fail = false
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('heritage-poi-review.json')) return response(dataset)
    if (init?.method === 'POST') {
      if (fail) return response({}, false)
      const data = JSON.parse(init.body as string)
      counts[data.poiid]++
      return response({ ...data, count: counts[data.poiid] })
    }
    return response({ counts: { ...counts } })
  }))
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals() })
const render = async () => { await act(async () => root.render(<AmapCandidatePicker place={place} />)) }
const click = async (element: HTMLElement) => { await act(async () => element.click()) }
const choose = () => container.querySelector<HTMLButtonElement>('[aria-label="选择测试住宅东楼，次数加一"]')!

it('loads on opening, shows candidate warnings and links, and does not count map views as selections', async () => {
  await render(); expect(fetch).not.toHaveBeenCalled()
  await click(container.querySelector('button')!)
  expect(container.textContent).toContain('具体楼栋待核')
  expect(container.textContent).toContain('选择次数：4')
  const links = [...container.querySelectorAll<HTMLAnchorElement>('.poi-candidate-actions a')]
  expect(links.map(a => new URL(a.href).searchParams.get('markers'))).toEqual(['B0001', 'B0002'])
  expect(links.every(a => a.target === '_blank' && a.rel.includes('noopener'))).toBe(true)
  links[0].addEventListener('click', event => event.preventDefault())
  await click(links[0]); expect(counts.B0001).toBe(4)
})

it('records every explicit selection and reloads the persisted count after remounting', async () => {
  await render(); await click(container.querySelector('button')!)
  await click(choose()); await click(choose())
  expect(counts.B0001).toBe(6); expect(counts.B0002).toBe(0)
  expect(container.textContent).toContain('选择次数：6')
  expect(choose().getAttribute('aria-pressed')).toBe('true')
  await act(async () => root.unmount()); root = createRoot(container)
  await render(); await click(container.querySelector('button')!)
  expect(container.textContent).toContain('选择次数：6')
})

it('does not claim a count increase when saving fails and allows retry', async () => {
  await render(); await click(container.querySelector('button')!)
  fail = true; await click(choose())
  expect(container.textContent).toContain('选择未能确认保存')
  expect(container.textContent).toContain('选择次数：4')
  expect(choose().disabled).toBe(false)
  fail = false; await click(choose()); expect(container.textContent).toContain('选择次数：5')
})
