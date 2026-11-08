import { test, expect } from '@playwright/test'
import { dashboard, seed } from './fixtures'

test('高低点价格随口径切换，背景列和主指标一致，仍按百分比排序', async ({ page }) => {
  await seed(page)
  await page.goto('#/watchlist')
  for (const [mode, high, low] of [['复权价', '$62.75', '$40.13'], ['未复权价', '$125.5', '$80.25']]) {
    await page.getByRole('button', { name: mode, exact: true }).click()
    await page.getByRole('button', { name: '52周内进度', exact: true }).click()
    for (const [label, price] of [['距52周高点', high], ['距52周低点', low]]) {
      const cell = page.locator(`[data-code="AAA"] [data-label="${label}"]`)
      await expect(cell.locator('.range-price')).toHaveText(`（${price}）`)
      await page.getByRole('button', { name: label, exact: true }).click()
      await expect(cell.locator('.metric-bubble .range-price')).toHaveText(`（${price}）`)
      await expect(page.locator('[data-code="DDD"] .range-price')).toHaveCount(0)
      await page.getByRole('button', { name: '52周内进度', exact: true }).click()
    }
  }
})

test('旧快照不反推价格，指数加密不加美元符号，异常价格拒绝', async ({ page }) => {
  await seed(page)
  const data = dashboard()
  for (const mode of ['adjusted', 'raw'] as const) {
    const rows = data.adjustments[mode].rows
    Object.assign(rows.find(row => row.code === 'AAA')!, { high_52w: undefined, low_52w: undefined })
    Object.assign(rows.find(row => row.code === 'BBB')!, { asset_type: 'index', high_52w: 30.25, low_52w: 10.5 })
    Object.assign(rows.find(row => row.code === 'CCC')!, { asset_type: 'crypto', high_52w: 0.123456, low_52w: 0.012345 })
  }
  await page.route('**/data/dashboard.json', route => route.fulfill({ json: data }))
  await page.goto('#/watchlist')
  for (const label of ['距52周高点', '距52周低点']) {
    await expect(page.locator(`[data-code="AAA"] [data-label="${label}"] .range-price`)).toHaveText('（—）')
  }
  await expect(page.locator('[data-code="BBB"] [data-label="距52周高点"] .range-price')).toHaveText('（30.25）')
  await expect(page.locator('[data-code="CCC"] [data-label="距52周低点"] .range-price')).toHaveText('（0.012345）')
  for (const value of [-1, 0, '125']) {
    Object.assign(data.adjustments.adjusted.rows[0], { high_52w: value })
    await page.reload()
    await expect(page.getByRole('alert')).toContainText('行情暂不可用')
  }
})
