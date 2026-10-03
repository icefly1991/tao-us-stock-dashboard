import { test, expect } from '@playwright/test'
import { dashboard, history, seed, version, valuations } from './fixtures'
import { priceDateState } from '../../src/priceFreshness'
import { isValuationSnapshot } from '../../src/valuationData'
import type { Scenario } from '../../src/valuationData'

test.beforeEach(async ({ page }) => {
  await seed(page)
  page.on('pageerror', error => { throw error })
})

test('价格有效期60天边界，未知/未来日期不能用抓取日替代', () => {
  expect(priceDateState('2026-08-02', '2026-10-01')).toBe('current')
  expect(priceDateState('2026-08-01', '2026-10-01')).toBe('expired')
  expect(priceDateState(null, '2026-10-01')).toBe('unknown')
  expect(priceDateState('2026-10-02', '2026-10-01')).toBe('unknown')
  expect(priceDateState('2026-02-30', '2026-10-01')).toBe('unknown')
})

test('金融股权模型接受独立输入，拒绝夹带企业现金字段', () => {
  const snapshot = valuations()
  const scenario = snapshot.rows.find(row => row.code === 'AAA')!.scenarios!.optimistic as Scenario
  scenario.model = 'equity_dcf'
  scenario.inputs = { fcfe: [100, -50, 100], discount_rate: .1, terminal_growth: 0, excess_equity_assets: 20, additional_common_claims: 30, diluted_shares: 10 }
  expect(isValuationSnapshot(snapshot)).toBe(true)
  scenario.inputs.cash_and_nonoperating_assets = 10000
  expect(isValuationSnapshot(snapshot)).toBe(false)
})

test('RSI超卖红、超买绿、中性灰', async ({ page }) => {
  const data = dashboard()
  for (const mode of ['adjusted', 'raw'] as const) {
    data.adjustments[mode].rows.find(row => row.code === 'AAA')!.rsi = { ...data.adjustments[mode].rows[0].rsi, value: 25, state: 'oversold' }
    data.adjustments[mode].rows.find(row => row.code === 'BBB')!.rsi = { ...data.adjustments[mode].rows[0].rsi, value: 75, state: 'overbought' }
  }
  await page.route('**/data/dashboard.json', route => route.fulfill({ json: data }))
  await page.goto('#/watchlist')
  await expect(page.locator('[data-code="AAA"] .rsi-cell')).toHaveCSS('color', 'rgb(190, 18, 60)')
  await expect(page.locator('[data-code="BBB"] .rsi-cell')).toHaveCSS('color', 'rgb(4, 120, 87)')
  await expect(page.locator('[data-code="CCC"] .rsi-cell')).toHaveCSS('color', 'rgb(71, 85, 105)')
})

test('旧情景价退出主表，机构目标价不能填入建议价', async ({ page }) => {
  const snapshot = valuations()
  snapshot.rows.find(row => row.code === 'AAA')!.valued_at = '2020-01-01'
  snapshot.rows.find(row => row.code === 'AAA')!.evidence_date = '2019-12-31'
  await page.route('**/data/valuation-scenarios.json', route => route.fulfill({ json: snapshot }))
  await page.route('**/data/analyst-targets.json', route => route.fulfill({ json: { schema_version: 1, source: 'test', fetched_at: '2026-10-01T12:45-04:00', rows: [{ code: 'AAA', symbol: 'AAA', status: 'available', low: 80, mean: 120, high: 160, quoted_at: null, source_url: 'https://www.sec.gov/' }] } }))
  await page.goto('#/watchlist')
  await expect(page.locator('[data-code="AAA"] .scenario-prices strong')).toHaveText(['—', '—', '—'])
  await expect(page.locator('[data-code="AAA"] .scenario-prices [data-scenario="optimistic"]')).toHaveClass(/equal/)
  await page.getByRole('button', { name: 'AAA 价格研究依据', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'AAA 价格研究', exact: true })
  await expect(page.locator('[data-code="AAA"] .price-status')).toHaveText('已过期')
  await expect(dialog).toContainText('分析师目标价（参考）')
  await dialog.getByText('历史估值 · 不参与现价比较', { exact: true }).click()
  await expect(dialog.getByRole('link', { name: '测试原文', exact: true }).first()).toBeVisible()
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

test('三档建议价独立显示、来源及零值，使用未复权收盘价', async ({ page }) => {
  await page.goto('#/watchlist')
  await expect(page.locator('[data-code="AAA"] .scenario-prices [data-scenario="optimistic"]')).toHaveClass(/below/)
  await expect(page.locator('[data-code="AAA"] .scenario-prices')).toContainText('+60.0%')
  await expect(page.locator('[data-code="AAA"] .scenario-prices [data-scenario="conservative"]')).toContainText('$90')
  await expect(page.locator('[data-code="AAA"] .scenario-prices [data-scenario="stress"]')).toContainText('$0')
  await expect(page.locator('[data-code="AAA"] .scenario-prices [data-scenario="conservative"]')).toHaveClass(/above/)
  await page.getByRole('button', { name: '未复权价', exact: true }).click()
  await expect(page.locator('[data-code="AAA"] .scenario-prices [data-scenario="conservative"]')).toHaveClass(/above/)
  await expect(page.locator('[data-code="AAA"] .scenario-prices a')).toHaveCount(0)
  const trigger = page.getByRole('button', { name: 'AAA 价格研究依据', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'AAA 价格研究', exact: true })
  await expect(dialog).toContainText('现价 $100')
  await expect(dialog).toContainText('分析师目标价（参考）')
  await dialog.getByText('研究依据与参数', { exact: true }).click()
  await expect(dialog).toContainText('虚构测试融资假设')
  await expect(dialog.getByRole('link', { name: '测试原文' }).first()).toHaveAttribute('href', 'https://www.sec.gov/')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(page.locator('[data-code="DDD"] .scenario-prices strong')).toHaveText(['—', '—', '—'])
  await page.getByRole('link', { name: '活跃股观察列表', exact: true }).click()
  await expect(page.getByTestId('column-header')).toContainText('建议价乐观保守极端保守')
})

test('情景资料坏掉保留行情，明确读取失败且不拿机构价替代', async ({ page }) => {
  const invalid = valuations(); invalid.rows.find(row => row.code === 'AAA')!.scenarios!.stress.value = -1
  await page.route('**/data/valuation-scenarios.json', route => route.fulfill({ json: invalid }))
  await page.goto('#/watchlist')
  await expect(page.locator('.market-row[data-code]')).toHaveCount(5)
  await expect(page.locator('[data-code="AAA"] .scenario-prices strong')).toHaveText(['—', '—', '—'])
  await page.getByRole('button', { name: 'AAA 价格研究依据', exact: true }).click()
  await expect(page.locator('[data-code="AAA"] .price-status')).toHaveText('读取失败')
  await expect(page.getByRole('dialog', { name: 'AAA 价格研究', exact: true })).toContainText('读取失败')
})

test('待估值不由目标价替代，点击详情才加载机构快照', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.route('**/data/analyst-targets.json', route => route.fulfill({ json: { schema_version: 1, source: 'test', fetched_at: '2026-10-01T12:45-04:00', rows: [{ code: 'BBB', symbol: 'BBB', status: 'available', low: 80, mean: 120, high: 160, source_url: 'https://www.sec.gov/' }] } }))
  await page.goto('#/watchlist')
  const row = page.locator('[data-code="BBB"]')
  await expect(row.locator('.scenario-prices strong')).toHaveText(['—', '—', '—'])
  await expect(row.locator('.price-status')).toHaveText('待估值')
  expect(requests.some(url => url.includes('/analyst-targets.json'))).toBe(false)
  await row.getByRole('button', { name: 'BBB 价格研究依据', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('待估值')
  await expect(page.getByRole('dialog').locator('.scenario-cards')).toHaveCount(0)
  await expect(page.getByRole('dialog').locator('.analyst-reference strong')).toHaveText(['$80', '$120', '$160'])
  expect(requests.filter(url => url.includes('/analyst-targets.json'))).toHaveLength(1)
})

for (const assetType of ['etf', 'index', 'crypto'] as const) test(`${assetType}三档留空且不提供公司估值弹窗`, async ({ page }) => {
  const data = dashboard()
  for (const mode of ['adjusted', 'raw'] as const) data.adjustments[mode].rows.find(row => row.code === 'BBB')!.asset_type = assetType
  await page.route('**/data/dashboard.json', route => route.fulfill({ json: data }))
  const snapshot = valuations()
  snapshot.rows.find(row => row.code === 'BBB')!.status = 'not_applicable'
  snapshot.rows.find(row => row.code === 'BBB')!.reason = '公司估值模型不适用'
  snapshot.coverage.pending--; snapshot.coverage.not_applicable++
  await page.route('**/data/valuation-scenarios.json', route => route.fulfill({ json: snapshot }))
  await page.route('**/data/analyst-targets.json', route => route.fulfill({ json: { schema_version: 1, source: 'test', fetched_at: '2026-10-01T12:45-04:00', rows: [{ code: 'BBB', symbol: 'BBB', status: 'available', low: 80, mean: 120, high: 160 }] } }))
  await page.goto('#/watchlist')
  await expect(page.locator('[data-code="BBB"] .scenario-prices strong')).toHaveText(['—', '—', '—'])
  await expect(page.locator('[data-code="BBB"] .price-research-cell button')).toHaveCount(0)
  await expect(page.locator('[data-code="BBB"] .price-research-cell a')).toHaveCount(0)
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
