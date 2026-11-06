import { expect, test, type Page } from '@playwright/test'

async function openRoad(page: Page, query: string, name: string) {
  await page.goto('/')
  await page.getByRole('textbox', { name: '搜索现代或历史地名' }).fill(query)
  await page.getByRole('option', { name: new RegExp(name) }).first().click()
  return page.locator('.road-details-panel')
}

test('shows the range start and reads the original range only when expanded', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => { if (request.url().includes('/road-history-supplements/')) requests.push(request.url()) })
  const detail = await openRoad(page, '安福路', 'Route Dupleix')
  const timeline = detail.getByRole('region', { name: '时间线', exact: true })
  await expect(timeline.locator('.place-event-year').first()).toHaveText('1914年')
  await expect(timeline.getByRole('link').first()).toHaveAttribute('href', /oldid=82080476/)
  expect(requests).toEqual([])
  await detail.getByText('补充沿革资料（含待核内容）', { exact: true }).click()
  const supplement = detail.getByRole('region', { name: '补充沿革资料', exact: true })
  await expect(supplement).toContainText('资料所列来源')
  await expect(supplement).toContainText('1914年—1915年')
  await expect(supplement).toContainText('未核定的内容不作为道路年代结论')
  expect(requests).toHaveLength(1)
  const width = await detail.evaluate(el => ({ width: el.clientWidth, content: el.scrollWidth }))
  expect(width.content).toBeLessThanOrEqual(width.width + 1)
})

test('keeps building dates in pending records and recovers from a failed supplement request', async ({ page }) => {
  let fail = true
  await page.route('**/road-history-supplements/02.json', route => {
    if (fail) { fail = false; return route.fulfill({ status: 503, body: 'Unavailable' }) }
    return route.continue()
  })
  const detail = await openRoad(page, '高安路', 'Route Andre Cohen')
  const timeline = detail.getByRole('region', { name: '时间线', exact: true })
  await expect(timeline).toContainText('1914年')
  await expect(timeline).not.toContainText('1941年')
  await detail.getByText('补充沿革资料（含待核内容）', { exact: true }).click()
  await expect(detail.getByRole('alert')).toContainText('资料暂时无法读取')
  await detail.getByRole('button', { name: '重试' }).click()
  const supplement = detail.getByRole('region', { name: '补充沿革资料', exact: true })
  await expect(supplement).toContainText('高安路78弄1-3号')
  await expect(supplement).toContainText('与道路自身沿革区分')
})

test('shows the two Gordon Road name stages using the earliest year', async ({ page }) => {
  const detail = await openRoad(page, '江宁路', 'Gordon Road')
  const timeline = detail.getByRole('region', { name: '时间线', exact: true })
  await expect(timeline.locator('.place-event-year')).toHaveText(['1884年', '1943年'])
  await expect(timeline.locator('strong')).toHaveText(['戈登路 (Gordon Road)', '江宁路'])
  await expect(timeline).not.toContainText('1909')
  await detail.getByText('补充沿革资料（含待核内容）', { exact: true }).click()
  await expect(detail.getByRole('region', { name: '补充沿革资料', exact: true })).toContainText('1884年—1900年')
})

test('restores the Tibet Road name without leaving 回 in the label', async ({ page }) => {
  const detail = await openRoad(page, 'Thibet Road', '西藏路|Thibet Road')
  const event = detail.getByRole('region', { name: '时间线', exact: true }).locator('li')
    .filter({ has: page.locator('.place-event-year', { hasText: '1943年' }) })
  await expect(event.locator('strong')).toHaveText('西藏路')
  await expect(event.getByRole('link')).toHaveAttribute('href', 'https://zh.wikipedia.org/w/index.php?oldid=92213609')
})

test('preserves relative dates and the previously reviewed Sinan renaming', async ({ page }) => {
  let detail = await openRoad(page, '安义路', '安南路|Annan Road')
  await expect(detail.getByRole('region', { name: '时间线', exact: true })).toContainText('1949年后')
  detail = await openRoad(page, '思南路', 'Rue Massenet')
  const timeline = detail.getByRole('region', { name: '时间线', exact: true })
  await expect(timeline).toContainText('蓝田路')
  await expect(timeline).toContainText('1946年1月1日')
})
