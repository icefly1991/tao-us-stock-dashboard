import { test, expect } from '@playwright/test'
import { seed, dashboard } from './fixtures'
import { isEtfHolding } from '../../src/sectorEtfData'

const holding = { etf: 'XLC', etf_name: 'Communication Services ETF', theme: '通信服务', holding_symbol: 'AAA', holding_name: 'Alpha Inc', identifier: 'TEST-ID', position_type: 'direct_equity', shares: 1234, weight_pct: 1.2, as_of: '2026-11-05', verified_on: '2026-11-06', source: 'https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-xlc.xlsx' }

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

test('ETF必须有匹配官方持仓证据，两口径保留截至日与来源，旧代理不背书', async ({ page }) => {
  const data = dashboard()
  for (const mode of ['adjusted', 'raw'] as const) {
    Object.assign(data.adjustments[mode].rows.find(r => r.code === 'AAA')!, { sector_etf: 'XLC', sector_etf_holding: holding })
    Object.assign(data.adjustments[mode].rows.find(r => r.code === 'BBB')!, { asset_type: 'etf' })
    Object.assign(data.adjustments[mode].rows.find(r => r.code === 'DDD')!, { sector_etf: 'XLK' })
  }
  await page.route('**/data/dashboard.json', route => route.fulfill({ json: data }))
  await page.goto('#/watchlist')
  for (const mode of ['复权价', '未复权价']) {
    await page.getByRole('button', { name: mode, exact: true }).click()
    const business = page.locator('[data-code="AAA"] .business-cell')
    await expect(business).toContainText('测试业务')
    const fund = business.getByRole('link', { name: '通信服务ETF XLC 官方持仓（新窗口）' })
    await expect(fund).toHaveAttribute('href', holding.source)
    await expect(fund).toHaveAttribute('title', /持仓截至 2026-11-05/)
    await expect(business).toContainText('11-05')
    await expect(page.locator('[data-code="BBB"] .business-cell')).toContainText('不适用')
    await expect(page.locator('[data-code="DDD"] .business-cell')).toContainText('持仓未核实')
    await expect(page.locator('[data-code="DDD"] .sector-etf')).toHaveCount(0)
    await expect(page.locator('[data-code="ZZZ"] .business-cell')).toContainText('未找到已核实ETF')
  }
})

test('ETF证据拒绝错股、错基金、衍生品、零持仓、伪官方来源与无效日期', () => {
  expect(isEtfHolding(holding, 'AAA', 'XLC')).toBe(true)
  for (const patch of [{ holding_symbol: 'BBB' }, { etf: 'XLI' }, { shares: 0 }, { weight_pct: -1 }, { position_type: 'swap' }, { source: 'https://www.ssga.com.evil.example/' }, { source: 'javascript:alert(1)' }, { as_of: '2026-02-31' }, { as_of: '2026-11-07' }]) {
    expect(isEtfHolding({ ...holding, ...patch }, 'AAA', 'XLC')).toBe(false)
  }
})

test('ETF持仓超过30天保留历史截至日并提示待复核', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-10T12:00:00Z'))
  const data = dashboard()
  Object.assign(data.adjustments.adjusted.rows.find(r => r.code === 'AAA')!, { sector_etf: 'XLC', sector_etf_holding: holding })
  await page.route('**/data/dashboard.json', route => route.fulfill({ json: data }))
  await page.goto('#/watchlist')
  const business = page.locator('[data-code="AAA"] .business-cell')
  await expect(business).toContainText('待复核 · 11-05')
  await expect(business.getByRole('link')).toHaveAttribute('title', /已超过30天/)
})
