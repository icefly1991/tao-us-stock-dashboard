import { test, expect } from '@playwright/test'
import { seed, dashboard } from './fixtures'

test.beforeEach(async ({ page }) => { await seed(page) })

for (const width of [390, 1440]) {
  for (const route of ['watchlist', 'research', 'boxes']) {
    test(`页面两端定位 ${route} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 600 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(`#/${route}`)
      const down = page.getByRole('button', { name: '回到底部', exact: true })
      const up = page.getByRole('button', { name: '回到顶部', exact: true })
      await expect(down).toBeVisible()
      await expect(up).toBeDisabled()
      const rect = await down.boundingBox()
      expect(rect!.width).toBeGreaterThanOrEqual(44)
      expect(rect!.height).toBeGreaterThanOrEqual(44)
      await down.focus()
      await page.keyboard.press('Enter')
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight - innerHeight - scrollY)).toBeLessThanOrEqual(4)
      await expect(down).toBeDisabled()
      await expect(up).toBeEnabled()
      await up.click()
      await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(4)
      await expect(up).toBeDisabled()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    })
  }
}

test('短页面不显示定位按钮', async ({ page }) => {
  await page.goto('#/pool')
  await expect(page.getByRole('status')).toContainText('暂时隐藏')
  await expect(page.getByRole('navigation', { name: '页面快速定位' })).toHaveCount(0)
})

test('板块ETF独立于业务并随口径保留，旧字段兼容，不伪称成分股', async ({ page }) => {
  const data = dashboard()
  for (const mode of ['adjusted', 'raw'] as const) {
    Object.assign(data.adjustments[mode].rows.find(r => r.code === 'AAA')!, { sector_etf: 'XLC' })
    Object.assign(data.adjustments[mode].rows.find(r => r.code === 'BBB')!, { asset_type: 'etf' })
  }
  await page.route('**/data/dashboard.json', route => route.fulfill({ json: data }))
  await page.goto('#/watchlist')
  for (const mode of ['复权价', '未复权价']) {
    await page.getByRole('button', { name: mode, exact: true }).click()
    const business = page.locator('[data-code="AAA"] .business-cell')
    await expect(business).toContainText('测试业务')
    const fund = business.getByRole('link', { name: '通信服务板块ETF XLC（新窗口）' })
    await expect(fund).toHaveAttribute('href', 'https://finance.yahoo.com/quote/XLC/')
    await expect(fund).toHaveAttribute('title', /不代表.*实际持仓/)
    await expect(page.locator('[data-code="BBB"] .business-cell')).toContainText('不适用')
    await expect(page.locator('[data-code="DDD"] .business-cell')).toContainText('待核实')
  }
})
