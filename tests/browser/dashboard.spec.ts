import { test, expect } from '@playwright/test'
import { dashboard, history, seed, version } from './fixtures'

test.beforeEach(async ({ page }) => {
  await seed(page)
  page.on('pageerror', error => { throw error })
})

for (const route of ['watchlist', 'research', 'research/A', 'research/B', 'research/C']) {
  test(`默认进度与刷新 ${route}`, async ({ page }) => {
    await page.goto(`#/${route}`)
    await expect(page.getByRole('button', { name: '52周内进度', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: '复权价', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.getByRole('button', { name: '52周内进度', exact: true })).toHaveAttribute('aria-pressed', 'true')
    if (route === 'research/C') await expect(page.getByText('当前列表暂无可用行情。')).toBeVisible()
  })
}

test('五指标两口径排序、缺失和停牌位置', async ({ page }) => {
  await page.goto('#/watchlist')
  for (const [mode, order] of [['复权价', ['BBB', 'CCC', 'AAA', 'DDD', 'ZZZ']], ['未复权价', ['AAA', 'CCC', 'BBB', 'DDD', 'ZZZ']]] as const) {
    await page.getByRole('button', { name: mode, exact: true }).click()
    for (const metric of ['距年线', '今年涨跌幅', '距52周高点', '距52周低点', '52周内进度']) {
      await page.getByRole('button', { name: metric, exact: true }).click()
      await expect(page.locator('.market-row[data-code]')).toHaveCount(5)
      expect(await page.locator('.market-row[data-code]').evaluateAll(rows => rows.map(row => row.getAttribute('data-code')))).toEqual(order)
      await expect(page.locator('.market-row').last()).toHaveAttribute('data-trading-status', 'suspended')
      expect(await page.locator('.market-row').last().locator(':scope > div').count()).toBe(await page.getByTestId('column-header').locator(':scope > div').count())
    }
  }
  await expect(page.getByText(/暂无可用行情：MISSING/)).toBeVisible()
  await expect(page.locator('[data-code="AAA"]')).toContainText('$100')
})

test('导航、分档和返回重置默认指标，不混入其它成员', async ({ page }) => {
  await page.goto('#/watchlist')
  await page.getByRole('button', { name: '今年涨跌幅', exact: true }).click()
  await page.getByRole('link', { name: '活跃股观察列表', exact: true }).click()
  await expect(page.getByRole('button', { name: '52周内进度', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.market-row')).toHaveCount(2)
  await page.getByRole('link', { name: /A 档/ }).click()
  await expect(page.locator('.market-row')).toHaveCount(1)
  await expect(page.locator('.market-row')).toHaveAttribute('data-code', 'BBB')
  await page.goBack()
  await expect(page.locator('.market-row')).toHaveCount(2)
  await page.getByRole('link', { name: '箱体观察', exact: true }).click()
  await expect(page.getByRole('heading', { name: '宽箱体形态识别' })).toBeVisible()
  await page.getByRole('link', { name: '持仓股', exact: true }).click()
  await expect(page.getByRole('button', { name: '52周内进度', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('详细说明默认折叠，纽约生成时间不随浏览器时区变化', async ({ page }) => {
  await page.goto('#/watchlist')
  await expect(page.getByText('生成：2026-09-26 04:07')).toBeVisible()
  await expect(page.getByText('最新数据日：2026-09-25')).toBeVisible()
  await expect(page.getByRole('link', { name: '选股标准', exact: true })).toBeHidden()
  await page.getByText('使用说明与选股标准', { exact: true }).click()
  await expect(page.getByRole('link', { name: '选股标准', exact: true })).toHaveAttribute('href', /docs\/LIST_REVIEW.md$/)
})

test('结构损坏和请求失败可恢复，仍可导航箱体', async ({ page }) => {
  await page.route('**/data/dashboard.json', route => route.fulfill({ json: { adjustments: {} } }))
  await page.goto('#/watchlist')
  await expect(page.getByRole('alert')).toContainText('行情暂不可用')
  await page.unroute('**/data/dashboard.json')
  await page.getByRole('button', { name: '刷新', exact: true }).click()
  await expect(page.locator('.market-row[data-code]')).toHaveCount(5)
})

test('旧JSON仅兼容原列表，不能冒充缺失的活跃列表', async ({ page }) => {
  const data = dashboard()
  const { collections: _collections, ...legacy } = data
  void _collections
  await page.route('**/data/dashboard.json', route => route.fulfill({ json: legacy }))
  await page.goto('#/watchlist')
  await expect(page.locator('.market-row[data-code]')).toHaveCount(5)
  await page.getByRole('link', { name: '活跃股观察列表', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('当前列表数据缺失')
  await page.getByRole('link', { name: '箱体观察', exact: true }).click()
  await expect(page.getByRole('heading', { name: '宽箱体形态识别' })).toBeVisible()
})

test('代码复制成功与失败降级，不复制名称', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }))
  await page.goto('#/watchlist')
  await page.getByRole('button', { name: '复制代码：AAA', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: '已复制 AAA' })).toBeVisible()
  await expect(page.getByRole('button', { name: '复制名称：Alpha Inc' })).toHaveCount(0)
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw Error('denied') } } }); document.execCommand = () => false })
  await page.getByRole('button', { name: '复制代码：BBB', exact: true }).click()
  await expect(page.getByLabel('手动复制内容')).toHaveValue('BBB')
})

test('K线版本错误后重试，周日切换、Esc返回焦点', async ({ page }) => {
  await page.route('**/history/adjusted/AAA.json*', route => route.fulfill({ json: { ...history(), updated_at: 'old' } }))
  await page.goto('#/watchlist')
  const trigger = page.getByRole('button', { name: '查看Alpha Inc历史K线', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Alpha Inc历史K线', exact: true })
  await expect(dialog.getByRole('alert')).toContainText('不一致')
  await page.unroute('**/history/adjusted/AAA.json*')
  await dialog.getByRole('button', { name: '重试', exact: true }).click()
  await expect(dialog.getByRole('button', { name: '五年 · 周K', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await dialog.getByRole('button', { name: '近一年 · 日K', exact: true }).click()
  await expect(dialog.locator('canvas').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('不可用K线不请求历史，RSI仍独立可查且拒绝错版本', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => { if (request.url().includes('/history/')) requests.push(request.url()) })
  await page.goto('#/watchlist')
  await page.getByRole('button', { name: '查看Delta Inc历史K线', exact: true }).click()
  await expect(page.getByText(/该标的 K 线暂不可用/)).toBeVisible()
  expect(requests).toEqual([])
  await page.keyboard.press('Escape')
  await page.route('**/history/adjusted/AAA.json*', route => route.fulfill({ json: { ...history(), updated_at: version + 'old' } }))
  await page.locator('[data-code="AAA"] .rsi-cell').click()
  const dialog = page.getByRole('dialog', { name: 'Alpha Inc RSI历史', exact: true })
  await expect(dialog).toContainText('版本不一致')
  await expect(page.locator('[data-code="AAA"] .rsi-cell strong').first()).toHaveText('40.0')
  await page.unroute('**/history/adjusted/AAA.json*')
  await dialog.getByRole('button', { name: '重试', exact: true }).click()
  await expect(dialog.getByRole('img')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

for (const [date, overdue] of [['2026-08-27', false], ['2026-08-26', true], ['2026-02-30', false], ['2099-01-01', false]] as const) {
  test(`名单日期边界 ${date}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-09-26T04:00:00Z'))
    await page.route('**/data/list-review.json', route => route.fulfill({ json: { last_updated: date } }))
    await page.goto('#/research')
    const notice = page.getByTestId('list-review-notice')
    await expect(notice).toHaveAttribute('data-overdue', String(overdue))
    if (date === '2026-02-30' || date === '2099-01-01') await expect(notice).toContainText('暂不可用')
    else await expect(notice).toContainText(date)
  })
}
