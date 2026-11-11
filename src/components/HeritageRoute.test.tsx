import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HeritageRouteButton, RouteAddButton } from './HeritageRoute'
import { clearHeritageRoute, routeStorageKey, type RouteStop } from '../lib/heritageRoute'

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
  await click(button('添加到路线'))
  await click(container.querySelectorAll<HTMLButtonElement>('.route-add-options button')[0])
  expect(button('选中建筑').textContent).toContain('1')
  await click(button('添加到路线')); await click(container.querySelectorAll<HTMLButtonElement>('.route-add-options button')[0])
  expect(button('选中建筑').textContent).toContain('1')
  await click(button('添加到路线')); await click(container.querySelectorAll<HTMLButtonElement>('.route-add-options button')[1])
  expect(JSON.parse(localStorage.getItem(routeStorageKey)!)).toHaveLength(2)
  await click(button('选中建筑'))
  expect(container.querySelector('dialog')?.open).toBe(true)
  expect(container.querySelectorAll('.route-app-links a')).toHaveLength(2)
  await click(container.querySelector<HTMLButtonElement>('[aria-label="上移建筑1"]')!)
  expect(container.querySelector('.route-stop-info strong')?.textContent).toBe('建筑1')
  await click(container.querySelector<HTMLButtonElement>('[aria-label="移除建筑0"]')!)
  expect(button('选中建筑').textContent).toContain('1')
  expect(container.querySelector('.route-generated')).toBeNull()
})
