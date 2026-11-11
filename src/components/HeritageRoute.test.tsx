import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HeritageRouteButton, RouteAddButton } from './HeritageRoute'
import { addRouteStop, clearHeritageRoute, routeStorageKey, type RouteStop } from '../lib/heritageRoute'

const choices: RouteStop[] = [0, 1].map(i => ({ officialId: `route-${i}`, name: `建筑${i}`, poiid: `B000${i}`, poiName: `候选${i}`, address: `测试路${i}号`, location: `${121.4 + i / 100},31.2` }))
let root: Root, container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  clearHeritageRoute()
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function () { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function () { this.open = false } })
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const click = async (el: HTMLElement) => { await act(async () => el.click()) }
const button = (name: string) => [...container.querySelectorAll('button')].find(el => el.textContent?.includes(name))!
it('opens multiple choices, adds without duplicates, updates the header, reorders and removes stops', async () => {
  await act(async () => root.render(<><RouteAddButton choices={choices} /><HeritageRouteButton /></>))
  await click(button('添加到清单'))
  await click(container.querySelectorAll<HTMLButtonElement>('.route-add-options button')[0])
  expect(button('选中建筑').textContent).toContain('1')
  await click(button('添加到清单')); await click(container.querySelectorAll<HTMLButtonElement>('.route-add-options button')[0])
  expect(button('选中建筑').textContent).toContain('1')
  await click(button('添加到清单')); await click(container.querySelectorAll<HTMLButtonElement>('.route-add-options button')[1])
  expect(JSON.parse(localStorage.getItem(routeStorageKey)!)).toHaveLength(2)
  await click(button('选中建筑'))
  expect(container.querySelector('dialog')?.open).toBe(true)
  expect(container.querySelector('.collection-map-links a')?.textContent).toContain('在高德查看全部地点')
  expect(container.textContent).not.toContain('步行')
  expect(container.textContent).not.toContain('驾车')
  expect(container.textContent).not.toContain('起点')
  await click(container.querySelector<HTMLButtonElement>('[aria-label="上移建筑1"]')!)
  expect(container.querySelector('.route-stop-info strong')?.textContent).toBe('建筑1')
  await click(container.querySelector<HTMLButtonElement>('[aria-label="移除建筑0"]')!)
  expect(button('选中建筑').textContent).toContain('1')
  const link = container.querySelector<HTMLAnchorElement>('.collection-map-links a')!
  expect(new URL(link.href).searchParams.get('markers')).toBe('B0001')
})

it('shows every group when more than ten buildings have been selected', async () => {
  const many = Array.from({ length: 11 }, (_, i) => ({ ...choices[0], officialId: `many-${i}`, poiid: `B00${i}` }))
  await act(async () => { for (const item of many) addRouteStop(item) })
  await act(async () => root.render(<HeritageRouteButton />))
  await click(button('选中建筑'))
  expect(container.querySelectorAll('.heritage-route-stops > li')).toHaveLength(11)
  const links = [...container.querySelectorAll<HTMLAnchorElement>('.collection-map-links a')]
  expect(links).toHaveLength(2)
  expect(links.flatMap(link => new URL(link.href).searchParams.get('markers')!.split('|'))).toEqual(many.map(item => item.poiid))
})

it('copies every selected building and reports success only after clipboard writing succeeds', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  await act(async () => { for (const choice of choices) addRouteStop(choice) })
  await act(async () => root.render(<HeritageRouteButton />))
  await click(button('选中建筑')); await click(button('复制全部地点'))
  expect(writeText).toHaveBeenCalledTimes(1)
  expect(writeText.mock.calls[0][0]).toContain('建筑0\t121.4\t31.2')
  expect(writeText.mock.calls[0][0]).toContain('建筑1\t121.41\t31.2')
  expect(container.textContent).toContain('已复制 2 个地点')
})

it('provides complete selectable text when clipboard permission is denied', async () => {
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(Error('Denied')) } })
  await act(async () => addRouteStop(choices[0]))
  await act(async () => root.render(<HeritageRouteButton />))
  await click(button('选中建筑')); await click(button('复制全部地点'))
  expect(container.textContent).not.toContain('已复制')
  expect(container.textContent).toContain('手动复制')
  expect(container.querySelector<HTMLTextAreaElement>('.collection-copy-text')?.value).toContain('建筑0\t121.4\t31.2')
})
