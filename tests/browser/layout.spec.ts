import { test, expect } from '@playwright/test'
import { seed } from './fixtures'

for (const width of [390, 1024, 1440]) {
  for (const route of ['watchlist', 'research']) {
    test(`表格完整与固定列 ${route} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await seed(page)
      await page.goto(`#/${route}`)
      for (const metric of ['距年线', '今年涨跌幅', '距52周高点', '距52周低点', '52周内进度']) {
        await page.getByRole('button', { name: metric, exact: true }).click()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        const scroll = page.getByTestId('table-scroll')
        if (width >= 1024) expect(await scroll.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
        else {
          const first = page.locator('.market-row .stock-identity').first()
          await scroll.evaluate(el => { el.scrollLeft = 500 })
          await expect.poll(() => page.locator('.ranking-header-scroll').evaluate(el => el.scrollLeft)).toBe(500)
          const pinned = await first.boundingBox()
          await scroll.evaluate(el => { el.scrollLeft = 600 })
          await expect.poll(async () => (await first.boundingBox())!.x).toBeCloseTo(pinned!.x, 0)
          await scroll.evaluate(el => { el.scrollLeft = 0 })
        }
      }
      await page.getByTestId('ranking-sticky').scrollIntoViewIfNeeded()
      await expect(page.getByTestId('column-header')).toBeVisible()
    })
  }
  test(`箱体横滑固定列 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await seed(page)
    await page.goto('#/boxes')
    await expect(page.locator('.box-table tbody tr')).toHaveCount(2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const identity = page.locator('.box-table tbody td').first()
    const before = await identity.boundingBox()
    await page.locator('.box-table-scroll').evaluate(el => { el.scrollLeft = 500 })
    await expect.poll(async () => (await identity.boundingBox())!.x).toBeCloseTo(before!.x, 0)
  })
}
