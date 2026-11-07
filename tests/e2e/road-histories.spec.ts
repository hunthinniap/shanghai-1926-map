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
  await expect(timeline.locator('strong')).toHaveText(['Gordon Road', '江宁路'])
  await expect(timeline.locator('.road-event-name small')).toHaveText('（戈登路）')
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

test('updates the selected Old City road title when the timeline crosses its renaming year', async ({ page }) => {
  const detail = await openRoad(page, '光启南路', '光启南路')
  const slider = page.getByRole('slider', { name: '地图年份' })
  const setYear = async (year: number) => {
    await slider.fill(String(year))
    await expect(page.locator('.timeline-year')).toHaveText(`${year} 年`)
  }
  await setYear(1979)
  await expect(detail.getByRole('heading', { level: 2 })).toHaveText('阜民路')
  await setYear(1980)
  await expect(detail.getByRole('heading', { level: 2 })).toHaveText('光启南路')
  const timeline = detail.getByRole('region', { name: '时间线', exact: true })
  await expect(timeline).toContainText('1980年')
  await expect(timeline).not.toContainText('1375年')
  await expect(detail.getByRole('region', { name: '名称资料', exact: true })).not.toContainText('跨龙路')
  await page.screenshot({ path: `artifacts/old-city-road-history-1980-${test.info().project.name}.png`, fullPage: true })
})

test('compacts repeated road names and keeps their evidence in the history explanation', async ({ page }) => {
  const detail = await openRoad(page, '王家码头路', '王家码头路')
  const timeline = detail.getByRole('region', { name: '时间线', exact: true })
  await expect(timeline.locator('strong')).toHaveText(['王家码头街', '王家码头路'])
  await expect(timeline.locator('.place-event-year')).toHaveText(['1910年', '今日'])
  await expect(timeline.locator('p')).toHaveCount(0)
  const explanation = detail.getByRole('region', { name: '沿革说明', exact: true })
  await expect(explanation).toContainText('外马路至小九华南街')
  await expect(explanation).toContainText('1855年海运局、1859年浙宁公所')
  await page.screenshot({ path: `artifacts/road-history-compact-${test.info().project.name}.png`, fullPage: true })
})

test('uses the corrected Fuxing East Road timeline and changes its name in 1945', async ({ page }) => {
  const detail = await openRoad(page, '复兴东路', '肇嘉路')
  const timeline = detail.getByRole('region', { name: '时间线', exact: true })
  await expect(timeline.locator('.road-timeline-predecessor')).toHaveText('肇嘉浜')
  await expect(timeline.locator('.place-event-year')).toHaveText(['1913年', '1945年'])
  await expect(timeline.locator('strong')).toHaveText(['肇嘉路', '复兴东路'])
  await expect(timeline).not.toContainText('法华民国路')
  await expect(timeline).not.toContainText('1943年')
  await expect(timeline.getByRole('link').first()).toHaveAttribute('href', /baike\.baidu\.com\/item\//)
  await expect(detail.getByRole('region', { name: '沿革说明', exact: true })).toContainText('东段另名大码头大街')
  const slider = page.getByRole('slider', { name: '地图年份' })
  await slider.fill('1912')
  await expect(detail.getByRole('heading', { level: 2 })).toHaveText('肇嘉浜')
  await slider.fill('1913')
  await expect(detail.getByRole('heading', { level: 2 })).toHaveText('肇嘉路')
  await slider.fill('1943')
  await expect(detail.getByRole('heading', { level: 2 })).toHaveText('肇嘉路')
  await slider.fill('1945')
  await expect(detail.getByRole('heading', { level: 2 })).toHaveText('复兴东路')
  await page.screenshot({ path: `artifacts/fuxing-east-road-corrected-${test.info().project.name}.png`, fullPage: true })
})

test('puts the Renmin Road construction action on the left and its road name on the right', async ({ page }) => {
  const detail = await openRoad(page, '民國路', '民國路')
  const timeline = detail.getByRole('region', { name: '时间线', exact: true })
  const row = timeline.locator('li').first()
  await expect(row.locator('.place-event-year')).toHaveText('1912年')
  await expect(row.locator('.place-event-kind a')).toHaveText('拆城填濠')
  await expect(row.locator('.place-event-kind a')).toHaveAttribute('href', /zh\.wikipedia\.org\/wiki\//)
  await expect(row.locator('.road-event-name')).toHaveText('民国路')
  await expect(row.locator('.road-event-name a')).toHaveCount(0)
  const actionBox = await row.locator('.place-event-kind').boundingBox()
  const nameBox = await row.locator('.road-event-name').boundingBox()
  expect(actionBox!.x + actionBox!.width).toBeLessThan(nameBox!.x)
  await page.screenshot({ path: `artifacts/renmin-road-construction-${test.info().project.name}.png`, fullPage: true })
})
