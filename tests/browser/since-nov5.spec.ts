import { test, expect } from '@playwright/test'
import { dashboard, seed } from './fixtures'

for (const route of ['watchlist', 'research', 'research/A', 'research/B', 'research/C']) {
  test(`${route} since 11/5 两口径、排序、缺值、导航及全视图布局`, async ({ page }) => {
    await seed(page)
    const data = dashboard()
    for (const collection of data.collections.filter(collection => collection.id !== 'original')) {
      collection.codes = [...data.collections[0].codes]
    }
    for (const mode of ['adjusted', 'raw'] as const) {
      for (const row of data.adjustments[mode].rows) {
        Object.assign(row, {
          since_20261105_pct: ({ AAA: 12.3, BBB: -4.5, CCC: 0 } as Record<string, number>)[row.code] ?? null,
          close_20261105: ['AAA', 'BBB', 'CCC'].includes(row.code) ? mode === 'raw' ? 123.45 : 61.725 : null,
        })
      }
    }
    await page.route('**/data/dashboard.json', route => route.fulfill({ json: data }))
    await page.goto(`#/${route}`)
    const cell = page.locator('[data-code="AAA"] [data-label="since 11/5"]')
    await expect(cell).toHaveText('+12.3%（$61.73）')
    await expect(page.locator('[data-code="ZZZ"] [data-label="since 11/5"]')).toHaveText('—')
    await expect(page.locator('[data-trading-status="suspended"] [data-label="since 11/5"]')).toHaveText('—')
    await page.getByRole('button', { name: '按since 11/5排序', exact: true }).click()
    await expect(page.locator('.market-row[data-code]').first()).toHaveAttribute('data-code', 'BBB')
    await page.getByRole('button', { name: '按since 11/5排序', exact: true }).click()
    await expect(page.locator('.market-row[data-code]').first()).toHaveAttribute('data-code', 'AAA')
    for (const width of [320, 390, 768, 1024, 1279, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 })
      for (const mode of ['复权价', '未复权价']) {
        await page.getByRole('button', { name: mode, exact: true }).click()
        await expect(cell).toHaveText(mode === '复权价' ? '+12.3%（$61.73）' : '+12.3%（$123.45）')
        for (const tab of ['52周内进度', '距年线', '今年涨跌幅', '距52周高点', '距52周低点']) {
          await page.getByRole('button', { name: tab, exact: true }).click()
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
          const fits = await cell.evaluate(el => {
            const inner = el.querySelector('.metric-line-content')!.getBoundingClientRect()
            const outer = el.getBoundingClientRect()
            return inner.left >= outer.left - 1 && inner.right <= outer.right + 1
          })
          expect(fits).toBe(true)
        }
      }
    }
    await page.getByRole('combobox', { name: '排序字段' }).selectOption('since_20261105_pct')
    await expect(page.locator('.market-row[data-code]').first()).toHaveAttribute('data-code', 'BBB')
    await page.goto(route === 'research' ? '#/watchlist' : '#/research')
    await expect(page.locator('[data-code="AAA"] [data-label="since 11/5"]')).toHaveText('+12.3%（$123.45）')
    await expect(page.getByRole('combobox', { name: '排序字段' })).toHaveValue('position_52w_pct')
    await expect(page.locator('option[value="since_20261105_pct"]')).toHaveCount(1)
  })
}

for (const route of ['watchlist', 'research']) {
  test(`旧快照无基准字段时${route}保持可读`, async ({ page }) => {
    await seed(page)
    await page.goto(`#/${route}`)
    await expect(page.locator('[data-label="since 11/5"]').first()).toHaveText('—')
  })
}
