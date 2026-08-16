import { expect, test } from '@playwright/test'

test('searches by modern name and opens the historical detail', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '上海 1928' })).toBeVisible()

  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('南昌路')
  await expect(page.getByText('Route Vallon', { exact: true }).first()).toBeVisible()
  await page.getByRole('option', { name: /Route Vallon/ }).click()

  await expect(page.getByRole('heading', { name: 'Route Vallon' })).toBeVisible()
  await expect(page.getByText('南昌路', { exact: true }).last()).toBeVisible()
})

test('finds French Park and exposes sources', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('复兴公园')
  await page.getByRole('option', { name: /French Park/ }).click()
  await expect(page.getByRole('heading', { name: 'French Park' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'French Park详情' })).toContainText('法租界')

  await page.getByRole('button', { name: '资料来源' }).click()
  await expect(page.getByRole('dialog')).toContainText('Virtual Shanghai')
  await expect(page.getByRole('dialog')).toContainText('OpenStreetMap')
})

test('treats Route Gaston Kahn as the full modern Jiashan Road', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('嘉善路')
  await page.getByRole('option', { name: /Route Gaston Kahn/ }).click()
  await expect(page.getByRole('heading', { name: 'Route Gaston Kahn' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Route Gaston Kahn详情' })).toContainText('嘉善路')
})

test('shows a linked person profile for an eponymous road', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('霞飞路')
  await page.getByRole('option', { name: /Avenue Joffre/ }).first().click()

  const detail = page.getByRole('complementary', { name: 'Avenue Joffre详情' })
  await expect(detail.getByRole('heading', { name: '路名人物' })).toBeVisible()
  await expect(detail).toContainText('Joseph Joffre')
  await expect(detail.getByRole('link', { name: /Joseph Joffre/ })).toHaveAttribute(
    'href',
    'https://en.wikipedia.org/wiki/Joseph_Joffre',
  )
})

test('toggles landmark names and markers', async ({ page }) => {
  await page.goto('/')
  const hideLandmarks = page.getByRole('button', { name: '隐藏地标' })
  await expect(hideLandmarks).toHaveAttribute('aria-pressed', 'true')
  await hideLandmarks.click()
  const showLandmarks = page.getByRole('button', { name: '显示地标' })
  await expect(showLandmarks).toHaveAttribute('aria-pressed', 'false')
  await showLandmarks.click()
  await expect(page.getByRole('button', { name: '隐藏地标' })).toHaveAttribute('aria-pressed', 'true')
})

test('toggles the inferred metro layer', async ({ page }) => {
  await page.goto('/')
  const hideSubway = page.getByRole('button', { name: '隐藏地铁' })
  await expect(hideSubway).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('地图说明')).toContainText('地铁站名为推定')
  await hideSubway.click()
  const showSubway = page.getByRole('button', { name: '显示地铁' })
  await expect(showSubway).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByLabel('地图说明')).not.toContainText('地铁站名为推定')
})

test('opens an inferred metro station detail from the map', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('.maplibregl-canvas')
  await expect(canvas).toBeVisible()
  await page.waitForTimeout(2_000)
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)

  const detail = page.getByRole('complementary', { name: 'Race Course地铁站详情' })
  await expect(detail).toBeVisible()
  await expect(detail).toContainText('人民广场')
  await expect(detail).toContainText('民国地名推定')

  await page.getByRole('button', { name: '隐藏地铁' }).click()
  await expect(detail).not.toBeVisible()
})

test('base style contains no modern symbol labels', async ({ request }) => {
  const response = await request.get('/style/no-label-style.json')
  const style = await response.json()
  expect(style.layers.filter((layer: { type: string }) => layer.type === 'symbol')).toHaveLength(0)
})
