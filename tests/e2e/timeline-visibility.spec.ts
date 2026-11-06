import { expect, test, type Page } from '@playwright/test'

async function dragYear(page: Page, fraction: number) {
  const slider = page.getByRole('slider', { name: '地图年份' })
  const box = (await slider.boundingBox())!
  const min = Number(await slider.getAttribute('min'))
  const max = Number(await slider.getAttribute('max'))
  const value = Number(await slider.inputValue())
  const thumbInset = 9
  const width = box.width - thumbInset * 2
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + thumbInset + (value - min) / (max - min) * width, y)
  await page.mouse.down()
  await page.mouse.move(box.x + thumbInset + fraction * width, y, { steps: 5 })
  await page.mouse.up()
  await expect(page.locator('.timeline-year')).not.toHaveText('全部年代')
}

test('keeps all layer switches independent of dragging and resetting the year', async ({ page }) => {
  const heritageRequests: string[] = []
  page.on('request', request => {
    if (request.url().includes('/shanghai-excellent-historical-buildings/')) heritageRequests.push(request.url())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '上海 1928' })).toBeVisible()
  const building = page.locator('.building-toggle-button')
  const landmark = page.locator('.landmark-toggle-button')
  const heritage = page.locator('.heritage-toggle-button')
  const expectVisibility = async (values: boolean[]) => {
    for (const [index, button] of [building, landmark, heritage].entries()) {
      await expect(button).toHaveAttribute('aria-pressed', String(values[index]))
    }
  }

  await dragYear(page, 0.2)
  await expectVisibility([false, false, false])
  expect(heritageRequests).toHaveLength(0)
  await page.getByRole('button', { name: '全部年代', exact: true }).click()
  await expectVisibility([false, false, false])

  await building.click()
  await dragYear(page, 0.8)
  await expectVisibility([true, false, false])
  expect(heritageRequests).toHaveLength(0)

  await building.click()
  await landmark.click()
  await dragYear(page, 0.45)
  await expectVisibility([false, true, false])

  await landmark.click()
  await heritage.click()
  await dragYear(page, 0.7)
  await expectVisibility([false, false, true])

  await heritage.click()
  await dragYear(page, 0.35)
  await expectVisibility([false, false, false])

  await building.click()
  await landmark.click()
  await heritage.click()
  await page.getByRole('button', { name: '全部年代', exact: true }).click()
  await expectVisibility([true, true, true])
})
