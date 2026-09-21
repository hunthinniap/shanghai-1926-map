import { expect, test } from '@playwright/test'

test('HSBC shares one card with old/new addresses and distinct historical dates', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('Hongkong & Shanghai Banking Corporation')
  await page.getByRole('option', { name: /Hongkong & Shanghai Banking Corporation/ }).click()
  const card = page.locator('.heritage-details-panel')
  await expect(card).toBeVisible()
  await expect(page.locator('.details-panel')).toHaveCount(1)
  for (const text of ['旧地点地址', '12 BUND ROAD', '新地点地址', '中山东一路12号', '名录登记地址范围', '中山东一路10-12号', '1874 年资料', '1923年']) {
    await expect(card).toContainText(text)
  }
  await page.getByRole('button', { name: '显示历史建筑' }).click()
  await expect(page.locator('.details-panel')).toHaveCount(1)
  await expect(card).toContainText('12 BUND ROAD')
  await page.getByRole('button', { name: '关闭详情' }).click()
  await search.fill('中山东一路12号')
  await expect(page.getByRole('option', { name: /Hongkong & Shanghai Banking Corporation/ })).toHaveCount(1)
  await page.getByRole('option', { name: /Hongkong & Shanghai Banking Corporation/ }).click()
  await expect(card).toContainText('中山东一路12号')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('either Wing On name finds one complex card retaining both records', async ({ page }) => {
  await page.goto('/')
  // Select the secondary record before the lazy-loaded directory is available.
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('Wing On Company (New Building)')
  await page.getByRole('option', { name: /Wing On Company \(New Building\)/ }).click()
  const card = page.locator('.heritage-details-panel')
  await expect(card).toBeVisible()
  for (const text of ['同一名录建筑群', 'CHEKIANG ROAD / NANKING ROAD', '627 NANKING ROAD', '#681', '#631', '1918 年', '1935 年', '南京东路635号', '南京东路627号']) {
    await expect(card).toContainText(text)
  }
  await page.getByRole('button', { name: '关闭详情' }).click()
  await search.fill('Wing On Company')
  await expect(page.getByRole('option', { name: /Wing On Company/ })).toHaveCount(1)
  await page.getByRole('option', { name: /Wing On Company/ }).click()
  await expect(page.locator('.details-panel')).toHaveCount(1)
  await expect(card).toContainText('楼内七重天宾馆客房及餐饮经营')
})

for (const query of ['King Albert Apartments', '金亚尔培公寓']) {
  test(`Shannan Village is searchable by ${query} before the heritage layer loads`, async ({ page }) => {
    await page.goto('/')
    const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
    await search.fill(query)
    const option = page.getByRole('option', { name: /King'S Albert Apartments/ })
    await expect(option).toHaveCount(1)
    await option.click()
    const card = page.locator('.heritage-details-panel')
    await expect(card).toBeVisible()
    await expect(card.getByRole('heading', { name: '陕南村', exact: true })).toBeVisible()
    for (const text of ['377 AVENUE DU ROI ALBERT', '陕西南路157-187号', '陕西南路151～187号(单)', '年代待考', '金亚尔培公寓', '同一名录建筑群']) {
      await expect(card).toContainText(text)
    }
    await expect(card).not.toContainText('1930 年资料')
    await page.getByRole('button', { name: '显示历史建筑' }).click()
    await expect(page.locator('.details-panel')).toHaveCount(1)
    await page.getByRole('button', { name: '关闭详情' }).click()
    await search.fill('陕南邨')
    await expect(page.getByRole('option', { name: /King'S Albert Apartments/ })).toHaveCount(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}
