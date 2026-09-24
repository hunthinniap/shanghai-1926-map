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
    for (const text of ['377 AVENUE DU ROI ALBERT', '陕西南路157-187号', '陕西南路151～187号(单)', '年代待考', '金亚尔培公寓', '已核定对象及同路段邻近住宅记录']) {
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

test('Gordon Road Police Station and 4B013 share one card while retaining both door numbers', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('Gordon Road Station')
  await page.getByRole('option', { name: /Gordon Road Police Station/ }).click()
  const card = page.locator('.heritage-details-panel')
  await expect(card.getByRole('heading', { name: '戈登路巡捕房', exact: true })).toBeVisible()
  for (const text of ['557 GORDON ROAD', '江宁路511号', '上海商业会计学校静安分校', '不推断557必然重编为511']) {
    await expect(card).toContainText(text)
  }
  await expect(page.locator('.details-panel')).toHaveCount(1)
})

test('Qingxin Girls School shares the 3A021 card while preserving all three address records', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('清心女中')
  await page.getByRole('option', { name: /Qingxin Middle School for Girls/ }).click()
  const card = page.locator('.heritage-details-panel')
  await expect(card.getByRole('heading', { name: '清心女中', exact: true })).toBeVisible()
  for (const text of ['3A021', '490 LUCHIAPANG ROAD', '陆家浜路650号', '陆家浜路550号', '上海市第八中学']) {
    await expect(card).toContainText(text)
  }
  await expect(page.locator('.details-panel')).toHaveCount(1)
})

test('Toyota textile dormitories and both listed residences open one shared card', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('Litian Textile Mill Dormitories')
  await page.getByRole('option', { name: /Litian Textile Mill Dormitories/ }).click()
  const card = page.locator('.heritage-details-panel')
  await expect(card.getByRole('heading', { name: '丰田纱厂干部住宅', exact: true })).toBeVisible()
  for (const text of ['5M011 / 5M022', '1000 YUYUAN ROAD', '愚园路1249弄2号楼', '愚园路1249弄1号']) {
    await expect(card).toContainText(text)
  }
  await page.getByRole('button', { name: '显示历史建筑' }).click()
  await expect(page.locator('.details-panel')).toHaveCount(1)
  await expect(card).toContainText('5M011 / 5M022')
})

test('Siccawei Observatory opens at the reviewed Xujiahui Observatory card', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('Siccawei Observatory')
  await page.getByRole('option', { name: /Siccawei Observatory/ }).click()
  const card = page.locator('.heritage-details-panel')
  await expect(card.getByRole('heading', { name: '徐家汇观象（天文）台', exact: true })).toBeVisible()
  for (const text of ['4D047', 'CAOXI BEILU (XUJIAHUI)', '蒲西路166号', '1872 年资料', '相距约510米', '非GCJ-02问题']) {
    await expect(card).toContainText(text)
  }
})

test('Qingxin Temple and 清心堂 open one shared card', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('Qingxin Temple')
  await page.getByRole('option', { name: /Qingxin Temple/ }).click()
  const card = page.locator('.heritage-details-panel')
  await expect(card.getByRole('heading', { name: '清心堂', exact: true })).toBeVisible()
  for (const text of ['2A058', '30 DAFOCHANG', '大昌街30号', '1860 年资料', '1919—1923年']) {
    await expect(card).toContainText(text)
  }
  await page.getByRole('button', { name: '关闭详情' }).click()
  await search.fill('清心堂')
  await expect(page.getByRole('option', { name: /Qingxin Temple/ })).toHaveCount(1)
})

test('Jiangnan Arsenal and 江南制造局 open one complex card', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('Jiangnan Arsenal')
  await page.getByRole('option', { name: /Jiangnan Arsenal/ }).click()
  const card = page.locator('.heritage-details-panel')
  await expect(card.getByRole('heading', { name: '江南制造局', exact: true })).toBeVisible()
  for (const text of ['2C014', "?? ROUTE DE L'ARSENAL", '高雄路2号', '江南造船厂', '不把VS点指定为某栋楼']) {
    await expect(card).toContainText(text)
  }
})

test('Hongkou Police Station and 上海市警察局虹口分局 share a site card without conflating buildings', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('Hongkou Police Station')
  await page.getByRole('option', { name: /Hongkou Police Station/ }).click()
  const card = page.locator('.heritage-details-panel')
  await expect(card.getByRole('heading', { name: '上海市警察局虹口分局', exact: true })).toBeVisible()
  for (const text of ['5F002', '260 MINGHONG', '闵行路260号', '塘沽路219号', '公安大楼', '旧捕房主楼已拆']) {
    await expect(card).toContainText(text)
  }
})

test('anonymous Hunan Road apartments share one nearby residential card without a same-building claim', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('266 ROUTE CHARLES CULTY')
  await page.getByRole('option', { name: /Apartments/i }).click()
  const card = page.locator('.heritage-details-panel')
  await expect(card.getByRole('heading', { name: '湖南路276号 住宅', exact: true })).toBeVisible()
  for (const text of [
    '5D016', '266 ROUTE CHARLES CULTY', '273 ROUTE CHARLES CULTY',
    '湖南路276号', '同路段邻近住宅归并（非同栋核定）', '不表示已核定为同一栋建筑',
  ]) await expect(card).toContainText(text)
  await expect(page.locator('.details-panel')).toHaveCount(1)
})

test('an anonymous residential complex can share a named card with an explicit weaker relation', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('341/371 AVENUE DU ROI ALBERT')
  await page.getByRole('option', { name: /Residential Complex/ }).click()
  const card = page.locator('.heritage-details-panel')
  await expect(card.getByRole('heading', { name: '陕南村', exact: true })).toBeVisible()
  for (const text of ['341/371 AVENUE DU ROI ALBERT', '377 AVENUE DU ROI ALBERT',
    '陕西南路157-187号', '已核定对象及同路段邻近住宅记录', '不表示已核定为同一栋建筑']) {
    await expect(card).toContainText(text)
  }
})

test('Zhang Garden shows the dated Swire account without treating future plans as completed', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('textbox', { name: '搜索现代或历史地名' })
  await search.fill('Chang Su Hos Garden')
  await page.getByRole('option', { name: /Chang Su Hos Garden/ }).click()
  const card = page.locator('.details-panel')
  for (const text of ['张园', '1918年闭园后转为住宅区',
    '2022年西区16幢历史建筑率先开放', '不表示东区当时的未来计划已经实现']) {
    await expect(card).toContainText(text)
  }
  await expect(card.locator('a[href="https://www.swireproperties.com/zh-cn/media/press-releases/2022/20221128_zhangyuan/"]'))
    .toBeVisible()
})
