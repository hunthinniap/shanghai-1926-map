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

test('finds a Chinese historical road name but displays its Shanghainese spelling', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('和平路')
  await page.getByRole('option', { name: /Wu Bin Lu/ }).click()

  const detail = page.getByRole('complementary', { name: 'Wu Bin Lu详情' })
  await expect(detail).toContainText('和平路')
  await expect(detail).toContainText('老派沪语拼音（无声调）')
  await expect(detail).toContainText('Rime Wugniu')
})

test('finds Parc français and exposes sources', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('复兴公园')
  await page.getByRole('option', { name: /Parc français/ }).click()
  await expect(page.getByRole('heading', { name: 'Parc français' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Parc français详情' })).toContainText('French Quarter')

  await page.getByRole('button', { name: '资料来源' }).click()
  await expect(page.getByRole('dialog')).toContainText('Virtual Shanghai')
  await expect(page.getByRole('dialog')).toContainText('OpenStreetMap')
})

test('finds the Republican-era name for Xiangyang Park', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('襄阳公园')
  await page.getByRole('option', { name: /Parc Ravinel/ }).click()

  const detail = page.getByRole('complementary', { name: 'Parc Ravinel详情' })
  await expect(detail).toBeVisible()
  await expect(detail).toContainText('襄阳公园')
  await expect(detail).toContainText('公共公园')
  await expect(detail).toContainText('1942 年资料')
})

test('finds Square Paul Brunat from the current Nie Er Music Square name', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('聂耳音乐广场')
  await page.getByRole('option', { name: /Square Paul Brunat/ }).click()

  const detail = page.getByRole('complementary', { name: 'Square Paul Brunat详情' })
  await expect(detail).toContainText('聂耳音乐广场')
  await expect(detail).toContainText('1924 年资料')
})

test('marks the Shaoxing Park label as a road-derived proposal', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('绍兴公园')
  await page.getByRole('option', { name: /Parc Victor Emmanuel III/ }).click()

  const detail = page.getByRole('complementary', { name: 'Parc Victor Emmanuel III详情' })
  await expect(detail).toContainText('绍兴公园')
  await expect(detail).toContainText('借相邻民国道路名拟定')
  await expect(detail).toContainText('法语拟名')
})

test('finds the approved park-style labels for the runway and Pathé sites', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })

  await search.fill('徐汇跑道公园')
  await page.getByRole('option', { name: /Lunghwa Park/ }).click()
  await expect(page.getByRole('complementary', { name: 'Lunghwa Park详情' })).toContainText('机场 / 跑道')

  await search.fill('徐家汇公园')
  await page.getByRole('option', { name: /Jardin Pathé/ }).click()
  await expect(page.getByRole('complementary', { name: 'Jardin Pathé详情' })).toContainText('工业设施')
})

test('finds the approved Avenue and Markham garden proposals', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })

  await search.fill('静安雕塑公园')
  await page.getByRole('option', { name: /Avenue Sculpture Garden/ }).click()
  await expect(page.getByRole('complementary', { name: 'Avenue Sculpture Garden详情' })).toContainText('Commerce District')

  await search.fill('蝴蝶湾花园')
  await page.getByRole('option', { name: /Markham Yard Gardens/ }).click()
  const markhamDetail = page.getByRole('complementary', { name: 'Markham Yard Gardens详情' })
  await expect(markhamDetail).toContainText('借原址历史名称拟定')
  await expect(markhamDetail).toContainText('1933 年资料')
})

test('finds a newly audited French Concession green space', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('淮茂绿地')
  await page.getByRole('option', { name: /Jardins du Cercle Sportif Français/ }).click()

  const detail = page.getByRole('complementary', { name: 'Jardins du Cercle Sportif Français详情' })
  await expect(detail).toContainText('法国总会')
  await expect(detail).toContainText('借原址历史名称拟定')
})

test('keeps the approved English garden names searchable while displaying French labels', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })

  await search.fill('Damei Garden')
  await page.getByRole('option', { name: /Jardin Damei/ }).click()
  await expect(page.getByRole('complementary', { name: 'Jardin Damei详情' })).toContainText('东湖绿地')

  await search.fill('No. 3 Route Pottier Gardens')
  await page.getByRole('option', { name: /Jardins du 3, route Pottier/ }).click()
  await expect(page.getByRole('complementary', { name: 'Jardins du 3, route Pottier详情' })).toContainText('宝庆路3号花园')
})

test('covers the Yanzhong green-space sections shown on current maps', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })

  await search.fill('辅德里公园')
  await page.getByRole('option', { name: /Taku Road Gardens/ }).click()
  await expect(page.getByRole('complementary', { name: 'Taku Road Gardens详情' })).toContainText('Commerce District')

  await search.fill('冬园')
  await page.getByRole('option', { name: /Jardins de l’avenue Foch/ }).click()
  await expect(page.getByRole('complementary', { name: 'Jardins de l’avenue Foch详情' })).toContainText('French Quarter')

  await search.fill('广场公园')
  await page.getByRole('option', { name: /Jardins de l’avenue Édouard-VII/ }).click()
  await expect(page.getByRole('complementary', { name: 'Jardins de l’avenue Édouard-VII详情' })).toContainText('French Quarter')
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

test('toggles landmark names and markers without classifying parks as landmarks', async ({ page }) => {
  await page.goto('/')
  const showLandmarks = page.getByRole('button', { name: '显示地标' })
  await expect(showLandmarks).toHaveAttribute('aria-pressed', 'false')
  await showLandmarks.click()
  const hideLandmarks = page.getByRole('button', { name: '隐藏地标' })
  await expect(hideLandmarks).toHaveAttribute('aria-pressed', 'true')
  await hideLandmarks.click()
  await expect(page.getByRole('button', { name: '显示地标' })).toHaveAttribute('aria-pressed', 'false')
})

test('toggles modern building footprints', async ({ page }) => {
  await page.goto('/')
  const showBuildings = page.getByRole('button', { name: '显示建筑' })
  await expect(showBuildings).toHaveAttribute('aria-pressed', 'false')
  await showBuildings.click()
  const hideBuildings = page.getByRole('button', { name: '隐藏建筑' })
  await expect(hideBuildings).toHaveAttribute('aria-pressed', 'true')
  await hideBuildings.click()
  await expect(page.getByRole('button', { name: '显示建筑' })).toHaveAttribute('aria-pressed', 'false')
})

test('toggles the inferred metro layer', async ({ page }) => {
  await page.goto('/')
  const showSubway = page.getByRole('button', { name: '显示地铁' })
  await expect(showSubway).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByLabel('地图说明')).not.toContainText('地铁站名为推定')
  await showSubway.click()
  const hideSubway = page.getByRole('button', { name: '隐藏地铁' })
  await expect(hideSubway).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('地图说明')).toContainText('地铁站名为推定')
})

test('opens an inferred metro station detail from the map', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '显示地铁' }).click()
  const canvas = page.locator('.maplibregl-canvas')
  await expect(canvas).toBeVisible()
  await page.waitForTimeout(2_000)
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  const detail = page.getByRole('complementary', { name: 'Race Course地铁站详情' })
  await expect(async () => {
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await expect(detail).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 10_000, intervals: [500, 1_000] })
  await expect(detail).toContainText('人民广场')
  await expect(detail).toContainText('民国地名推定')
  await expect(detail).not.toContainText('该名称不是历史上真实运营过的站名')

  await page.getByRole('button', { name: '隐藏地铁' }).click()
  await expect(detail).not.toBeVisible()
})

test('base style contains no modern symbol labels', async ({ request }) => {
  const response = await request.get('/style/no-label-style.json')
  const style = await response.json()
  expect(style.layers.filter((layer: { type: string }) => layer.type === 'symbol')).toHaveLength(0)
})

test('uses the Min Kuo Road and Chunghwa Road ring as the Old City boundary', async ({ request }) => {
  const response = await request.get('/data/jurisdictions.geojson')
  const jurisdictions = await response.json()
  const oldCity = jurisdictions.features.filter(
    (feature: { properties: { jurisdiction?: string } }) =>
      feature.properties.jurisdiction === 'old-city',
  )

  expect(oldCity).toHaveLength(1)
  expect(oldCity[0].properties.northernBoundary).toBe(
    'Boulevard des Deux Républiques / Min Kuo Road',
  )
  expect(oldCity[0].properties.southernBoundary).toBe('Chunghwa Road')
  expect(oldCity[0].geometry.coordinates[0].length).toBeGreaterThan(40)
})

test('highlights one historical jurisdiction at a time from the legend', async ({ page }) => {
  await page.goto('/')
  const map = page.getByLabel('上海历史路名交互地图')
  const frenchQuarter = page.getByRole('button', { name: 'French Quarter' })
  const commerceDistrict = page.getByRole('button', { name: 'Commerce District' })
  const oldCity = page.getByRole('button', { name: 'Old City' })

  await expect(map).toHaveAttribute('data-highlighted-jurisdiction', 'none')
  await frenchQuarter.click()
  await expect(frenchQuarter).toHaveAttribute('aria-pressed', 'true')
  await expect(map).toHaveAttribute('data-highlighted-jurisdiction', 'french-concession')

  await commerceDistrict.click()
  await expect(frenchQuarter).toHaveAttribute('aria-pressed', 'false')
  await expect(commerceDistrict).toHaveAttribute('aria-pressed', 'true')
  await expect(map).toHaveAttribute('data-highlighted-jurisdiction', 'international-settlement')

  await oldCity.click()
  await expect(commerceDistrict).toHaveAttribute('aria-pressed', 'false')
  await expect(oldCity).toHaveAttribute('aria-pressed', 'true')
  await expect(map).toHaveAttribute('data-highlighted-jurisdiction', 'old-city')

  await oldCity.click()
  await expect(oldCity).toHaveAttribute('aria-pressed', 'false')
  await expect(map).toHaveAttribute('data-highlighted-jurisdiction', 'none')
})
