import { test, expect } from '@playwright/test'
import { seed, dashboard } from './fixtures'

test.beforeEach(async ({ page }) => {
  await seed(page)
  const data = dashboard()
  data.collections.find(c => c.id === 'research')!.codes = [...data.collections[0].codes]
  for (const mode of ['adjusted', 'raw'] as const) {
    for (const row of data.adjustments[mode].rows) {
      row.today_return_pct = ({ AAA: 0, BBB: -5, CCC: 5, DDD: 0, ZZZ: 0 } as Record<string, number>)[row.code]
      const value = ({ AAA: 1, BBB: -2, CCC: 1 } as Record<string, number>)[row.code] ?? null
      Object.assign(row, { month_return_pct: value, distance_ma250_pct: value,
        ytd_return_pct: value, distance_52w_low_pct: value,
        distance_52w_high_pct: value === null ? null : value - 1 })
    }
  }
  await page.route('**/data/dashboard.json', route => route.fulfill({ json: data }))
})

for (const route of ['watchlist', 'research']) {
  for (const width of [390, 1440]) {
    test(`两方向排序、同分与缺失 ${route} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`#/${route}`)
      await expect(page.locator('.market-row[data-code]').first()).toBeVisible()
      const order = () => page.locator('.market-row[data-code]').evaluateAll(rows => rows.map(r => r.getAttribute('data-code')))
      for (const mode of ['复权价', '未复权价']) {
        await page.getByRole('button', { name: mode, exact: true }).click()
        for (const key of ['today_return_pct', 'month_return_pct', 'distance_ma250_pct', 'ytd_return_pct', 'distance_52w_low_pct', 'distance_52w_high_pct']) {
          await page.getByRole('combobox', { name: '排序字段' }).selectOption(key)
          await expect.poll(order).toEqual(key === 'today_return_pct' ? ['BBB', 'AAA', 'DDD', 'ZZZ', 'CCC'] : ['BBB', 'AAA', 'CCC', 'DDD', 'ZZZ'])
          await page.getByRole('button', { name: '切换排序方向' }).click()
          await expect.poll(order).toEqual(key === 'today_return_pct' ? ['CCC', 'AAA', 'DDD', 'ZZZ', 'BBB'] : ['AAA', 'CCC', 'BBB', 'DDD', 'ZZZ'])
          await expect(page.locator('.market-row').last()).toHaveAttribute('data-trading-status', 'suspended')
        }
      }
      await expect(page.locator('[data-code="AAA"] [data-label="本月涨跌幅"]')).toHaveText('+1.0%')
      await expect(page.locator('[data-code="DDD"] [data-label="本月涨跌幅"]')).toHaveText('—')
      await expect(page.locator('[data-code="AAA"] [data-label="距52周高点"]')).toHaveText('0.0%')
      await expect(page.locator('[data-code="AAA"] [data-label="距52周高点"]')).toHaveClass(/text-slate-500/)
      await expect(page.locator('[data-code="BBB"] [data-label="距52周高点"]')).toHaveText('-3.0%')
      await expect(page.locator('[data-code="BBB"] [data-label="距52周高点"]')).toHaveClass(/text-rose-600/)
      await expect(page.locator('[data-code="DDD"] [data-label="距52周高点"]')).toHaveText('—')
      await expect(page.locator('[data-trading-status="suspended"] [data-label="距52周高点"]')).toHaveText('—')
      expect(await page.locator('.market-row').last().locator(':scope > div').count()).toBe(await page.getByTestId('column-header').locator(':scope > div').count())
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    })
  }
}

test('表头切方向，导航与分档恢复默认', async ({ page }) => {
  await page.goto('#/watchlist')
  const header = page.getByRole('button', { name: '按本月涨跌幅排序' })
  await header.click()
  await expect(page.getByRole('combobox', { name: '排序字段' })).toHaveValue('month_return_pct')
  await header.click()
  await expect(page.getByRole('button', { name: '切换排序方向' })).toHaveText('降序 ↓')
  await page.getByRole('link', { name: '活跃股观察列表', exact: true }).click()
  await expect(page.getByRole('combobox', { name: '排序字段' })).toHaveValue('position_52w_pct')
  await expect(page.getByRole('button', { name: '切换排序方向' })).toHaveText('升序 ↑')
  await page.goto('#/research/A')
  await expect(page.getByRole('combobox', { name: '排序字段' })).toHaveValue('position_52w_pct')
  const highHeader = page.getByRole('button', { name: '按距52周高点排序' })
  await highHeader.click()
  await expect(page.getByRole('combobox', { name: '排序字段' })).toHaveValue('distance_52w_high_pct')
  await expect(highHeader.locator('..')).toHaveAttribute('aria-sort', 'ascending')
  await highHeader.click()
  await expect(highHeader.locator('..')).toHaveAttribute('aria-sort', 'descending')
})

for (const route of ['pool', 'pool-boxes']) {
  test(`暂停页不加载研究且保留返回导航 ${route}`, async ({ page }) => {
    const requests: string[] = []
    page.on('request', request => { if (/\/data\/pool-(review|boxes)\.json/.test(request.url())) requests.push(request.url()) })
    await page.goto(`#/${route}`)
    await expect(page.getByRole('status')).toContainText('高风险研究暂时隐藏')
    await expect(page.getByRole('link', { name: '高风险公司股票池', exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: '高风险公司箱体研究', exact: true })).toHaveCount(0)
    await expect(page.locator('.market-row, .box-table')).toHaveCount(0)
    expect(requests).toEqual([])
    await page.getByRole('link', { name: '持仓股', exact: true }).click()
    await expect(page.getByRole('heading', { name: '持仓股', exact: true })).toBeVisible()
  })
}
