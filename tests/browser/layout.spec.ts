import { test, expect } from '@playwright/test'
import { dashboard, boxes, seed } from './fixtures'

for (const width of [320, 390, 768, 1024, 1440, 1920]) {
  for (const route of ['watchlist', 'research', 'pool']) {
    test(`所有字段无需横滑 ${route} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await seed(page)
      const data = dashboard()
      data.collections.push({ id: 'pool', label: '高风险公司股票池', codes: ['AAA', 'SUSP'], summaries: { adjusted: { watchlist_total: 2, today_up: 1, today_down: 0 }, raw: { watchlist_total: 2, today_up: 1, today_down: 0 } } })
      await page.route('**/data/dashboard.json', r => r.fulfill({ json: data }))
      await page.goto(`#/${route}`)
      const sort = page.getByRole('button', { name: /近3月日均波幅/ })
      await sort.click()
      await expect(sort).toHaveAttribute('aria-pressed', 'true')
      await sort.click()
      for (const mode of ['复权价', '未复权价']) {
        await page.getByRole('button', { name: mode, exact: true }).click()
        for (const metric of ['距年线', '今年涨跌幅', '距52周高点', '距52周低点', '52周内进度']) {
          await page.getByRole('button', { name: metric, exact: true }).click()
          await expect(page.locator('.market-row').first()).toBeVisible()
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
          const scroll = page.getByTestId('table-scroll')
          expect(await scroll.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
          await scroll.evaluate(el => { el.scrollLeft = 500 })
          expect(await scroll.evaluate(el => el.scrollLeft)).toBe(0)
          // Check actual cells, including long labels and the final column; hiding overflow cannot pass.
          expect(await page.locator('.market-row').evaluateAll(rows => rows.flatMap(row => Array.from(row.children).flatMap(cell => {
            const box = cell.getBoundingClientRect(), parent = row.getBoundingClientRect()
            return box.left >= parent.left - 1 && box.right <= parent.right + 1 && cell.scrollWidth <= cell.clientWidth + 1 ? [] : [{ text: cell.textContent, width: cell.clientWidth, scroll: cell.scrollWidth }]
          })))).toEqual([])
          expect(await page.locator('.market-row .metric-bubble, .market-row .financing-block, .market-row .scenario-prices, .market-row .rsi-cell').evaluateAll(bubbles => bubbles.every(el => getComputedStyle(el).textAlign === 'center'))).toBe(true)
          expect(await page.locator('.market-row .metric-bubble > span').evaluateAll(values => values.every(el => {
            const range = document.createRange(); range.selectNodeContents(el)
            return range.getClientRects().length === 1 && el.scrollWidth <= el.clientWidth + 1
          }))).toBe(true)
          if (width < 1024) await expect(page.locator('.market-row [data-label]').first()).toBeVisible()
          else await expect(page.getByTestId('column-header')).toBeVisible()
        }
      }
    })
  }
  for (const route of ['boxes', 'pool-boxes']) {
    test(`箱体所有字段无需横滑 ${route} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await seed(page)
      await page.route('**/data/pool-boxes.json', r => r.fulfill({ json: boxes() }))
      await page.goto(`#/${route}`)
      await expect(page.locator('.box-table tbody tr')).toHaveCount(2)
      const scroll = page.locator('.box-table-scroll')
      expect(await scroll.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
      await scroll.evaluate(el => { el.scrollLeft = 500 })
      expect(await scroll.evaluate(el => el.scrollLeft)).toBe(0)
      expect(await page.locator('.box-table tbody td').evaluateAll(cells => cells.every(cell => cell.scrollWidth <= cell.clientWidth + 1))).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    })
  }
}
