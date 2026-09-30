import { test, expect, type Page } from '@playwright/test'
import { dashboard, boxes, seed } from './fixtures'

function review() {
  return { schema_version: 2, reviewed_at: '2026-09-27', excluded: [{ code: 'EXCLUDED', reason: '已核实排除', url: 'https://www.sec.gov/' }], rows: ['AAA', 'DDD', 'ZZZ'].map((code, i) => ({
    code, category: ['operating', 'funded_loss', 'clinical'][i], category_reason: '固定经营类型依据', category_method: '原文经营类型核查', category_sources: [{ title: '类型依据', url: 'https://www.sec.gov/' }], evidence_gap: '', grade: ['supported', 'pressure', 'unknown'][i], tags: ['测试风险'], reason: '固定财报证据', business: '测试业务', reviewed_at: '2026-09-27', review_method: '原文专项核查', runway_months: null,
    facts: { revenue: { value: 10000000, unit: 'USD', start: '2026-01-01', end: '2026-06-30', filed: '2026-08-01', url: 'https://www.sec.gov/' } }, sources: [{ title: '测试财报', url: 'https://www.sec.gov/' }],
    highlights: i === 2 ? [] : [{ text: '已有收入基础', method: '财报规则初筛', sources: [{ title: '摘要来源', url: 'https://www.sec.gov/Archives/' }] }],
    risks: [{ text: '经营消耗待改善', method: '原文提炼', sources: [{ title: '摘要来源', url: 'https://www.sec.gov/Archives/' }] }],
  })) }
}

async function seedPool(page: Page) {
  await seed(page)
  const data = dashboard()
  data.collections.push({ id: 'pool', label: '高风险公司股票池', codes: ['AAA', 'DDD', 'ZZZ'], summaries: { adjusted: { watchlist_total: 3, today_up: 1, today_down: 2 }, raw: { watchlist_total: 3, today_up: 1, today_down: 2 } } })
  await page.route('**/data/dashboard.json', route => route.fulfill({ json: data }))
  await page.route('**/data/pool-review.json', route => route.fulfill({ json: review() }))
  const scan = boxes(); scan.rows = [scan.rows[0], { ...scan.rows[0], code: 'DDD', name: 'Delta Inc' }]
  await page.route('**/data/pool-boxes.json', route => route.fulfill({ json: scan }))
  page.on('pageerror', error => { throw error })
}

test.beforeEach(async ({ page }) => seedPool(page))

test('每周机器财报与新申报同人工结论分开显示', async ({ page }) => {
  await page.route('**/data/weekly-research.json', route => route.fulfill({ json: {
    schema_version: 1, scanned_at: '2026-10-04T14:00:00Z', pool_reviewed_at: '2026-09-27', governance_reviewed_at: '2026-09-27', pool_count: 1, company_count: 1,
    pool_rows: [{ code: 'AAA', status: 'new_structured_facts', grade: 'watch', grade_reason: '本期经营现金流待观察', highlights: [], risks: [{ text: '经营现金流为负', sources: [{ title: '财报', url: 'https://www.sec.gov/Archives/test' }] }], facts: { operating_cash_flow: { value: -100, unit: 'USD', end: '2026-09-30', filed: '2026-10-02', url: 'https://www.sec.gov/Archives/test' } }, facts_filed_at: '2026-10-02', source: 'https://www.sec.gov/Archives/test', manual_grade: 'supported' }],
    company_rows: [{ code: 'AAA', status: 'new_filings_need_interpretation', filings: [{ accession: '0001-26-000001', form: '8-K', filed: '2026-10-02', url: 'https://www.sec.gov/Archives/test' }], attention: ['上市合规条款须核实'], sic_description: '测试行业' }],
  } }))
  await page.goto('#/pool')
  await expect(page.getByText('每周机器扫描 2026-10-04')).toBeVisible()
  await expect(page.locator('[data-code="AAA"] .fundamental-review')).toContainText('新财报机器初筛：亏损/转型观察')
  await expect(page.locator('[data-code="AAA"] .fundamental-review')).toContainText('当期经营初筛有支撑')
  await page.getByRole('button', { name: 'AAA 核查依据' }).click()
  await expect(page.getByRole('dialog')).toContainText('本周新财报机器初筛')
})

test('摘要两列、逐项来源与缺少亮点，不扩展原列表', async ({ page }) => {
  await page.goto('#/pool')
  await expect(page.getByTestId('column-header')).toContainText('基本面亮点')
  await expect(page.getByTestId('column-header')).toContainText('基本面风险')
  await expect(page.locator('[data-code="ZZZ"] > .highlights')).toHaveText('暂无可确认亮点')
  await page.getByRole('button', { name: 'AAA 核查依据' }).click()
  await expect(page.getByRole('dialog').locator('.highlights a')).toHaveAttribute('href', 'https://www.sec.gov/Archives/')
  await page.keyboard.press('Escape')
  await page.goto('#/research')
  await expect(page.getByTestId('column-header')).not.toContainText('基本面亮点')
})

test('箱体摘要仅在详情，不增加形态表列', async ({ page }) => {
  await page.goto('#/pool-boxes')
  await expect(page.locator('.box-table thead')).not.toContainText('基本面亮点')
  await expect(page.locator('.fundamental-summary').first()).toContainText('已有收入基础')
})

test('旧摘要字段兼容，损坏来源不作有效研究', async ({ page }) => {
  const old = review()
  for (const row of old.rows) {
    delete (row as Partial<typeof row>).highlights
    delete (row as Partial<typeof row>).risks
  }
  await page.route('**/data/pool-review.json', route => route.fulfill({ json: old }))
  await page.goto('#/pool')
  await expect(page.locator('[data-code="AAA"] > .highlights')).toHaveText('摘要待补充')
  const bad = review(); bad.rows[0].risks[0].sources[0].url = 'javascript:alert(1)'
  await page.route('**/data/pool-review.json', route => route.fulfill({ json: bad }))
  await page.reload()
  await expect(page.getByText('基本面资料暂不可用，不能视为低风险')).toBeVisible()
  await expect(page.locator('.market-row')).toHaveCount(3)
})

test('新池默认进度、基本面筛选与返回，不污染原列表', async ({ page }) => {
  await page.goto('#/pool')
  await expect(page.getByRole('button', { name: '52周内进度', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.market-row')).toHaveCount(3)
  await expect(page.locator('.list-review-notice')).toHaveCount(0)
  await page.getByLabel('基本面等级').selectOption('pressure')
  await expect(page.locator('.market-row')).toHaveCount(1)
  await expect(page.locator('.market-row')).toHaveAttribute('data-code', 'DDD')
  await page.getByRole('link', { name: '活跃股观察列表', exact: true }).click()
  await expect(page.locator('.market-row')).toHaveCount(2)
  await expect(page.locator('[aria-label="基本面筛选"]')).toHaveCount(0)
  await page.getByRole('link', { name: '高风险公司股票池', exact: true }).click()
  await expect(page.getByLabel('基本面等级')).toHaveValue('all')
  await expect(page.locator('.market-row')).toHaveCount(3)
  await page.reload()
  await expect(page.locator('.market-row')).toHaveCount(3)
})

test('财报依据弹窗日期单位与来源、Escape返回焦点', async ({ page }) => {
  await page.goto('#/pool')
  const button = page.getByRole('button', { name: 'AAA 核查依据' })
  await button.click()
  const dialog = page.getByRole('dialog', { name: 'AAA 基本面核查' })
  await expect(dialog).toContainText('10 百万 USD')
  await expect(dialog).toContainText('2026-01-01 至 2026-06-30')
  await expect(dialog.getByRole('link', { name: '测试财报' })).toHaveAttribute('href', 'https://www.sec.gov/')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(button).toBeFocused()
})

test('新池集合缺失不能回退全部股票，错误态仍可导航', async ({ page }) => {
  await page.route('**/data/dashboard.json', route => route.fulfill({ json: dashboard() }))
  await page.goto('#/pool')
  await expect(page.getByRole('alert')).toContainText('当前列表数据缺失')
  await expect(page.locator('.market-row')).toHaveCount(0)
  await expect(page.getByRole('link', { name: '高风险公司股票池', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('link', { name: '活跃股观察列表', exact: true }).click()
  await expect(page.locator('.market-row')).toHaveCount(2)
})

test('新箱体独立数据与基本面过滤、旧箱体无误筛选', async ({ page }) => {
  await page.goto('#/pool-boxes')
  await expect(page.getByRole('heading', { name: '高风险公司箱体研究', exact: true })).toBeVisible()
  await expect(page.locator('.box-table tbody tr')).toHaveCount(2)
  await expect(page.getByRole('button', { name: '查看 CRWV 对照' })).toHaveCount(0)
  await page.getByLabel('基本面等级').selectOption('pressure')
  await expect(page.locator('.box-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.box-table tbody tr')).toContainText('DDD')
  await page.getByRole('link', { name: '箱体观察', exact: true }).click()
  await expect(page.locator('.box-table tbody tr')).toHaveCount(2)
  await expect(page.getByRole('button', { name: '查看 CRWV 对照' })).toBeVisible()
})

for (const invalid of ['unavailable', 'bad-grade', 'bad-fact', 'duplicate', 'old-schema', 'bad-category', 'missing-category-source']) {
  test(`研究资料失败保留行情且不冒充良好 ${invalid}`, async ({ page }) => {
    await page.route('**/data/pool-review.json', route => {
      if (invalid === 'unavailable') return route.fulfill({ status: 503 })
      const data = review()
      if (invalid === 'bad-grade') data.rows[0].grade = 'constructor'
      if (invalid === 'bad-fact') data.rows[0].facts.revenue.value = 'bad' as unknown as number
      if (invalid === 'duplicate') data.rows.push(data.rows[0])
      if (invalid === 'old-schema') data.schema_version = 1
      if (invalid === 'bad-category') data.rows[0].category = 'constructor'
      if (invalid === 'missing-category-source') data.rows[0].category_sources = []
      return route.fulfill({ json: data })
    })
    await page.goto('#/pool')
    await expect(page.locator('.market-row')).toHaveCount(3)
    await expect(page.getByText('基本面资料暂不可用，不能视为低风险')).toBeVisible()
    await expect(page.locator('.market-row .fundamental-badge.unknown')).toHaveCount(3)
  })
}

test('经营类型与资金等级交叉筛选，切页重置', async ({ page }) => {
  await page.goto('#/pool')
  await page.getByLabel('经营类型', { exact: true }).selectOption('clinical')
  await expect(page.locator('.market-row')).toHaveCount(1)
  await expect(page.locator('.market-row')).toHaveAttribute('data-code', 'ZZZ')
  await page.getByLabel('基本面等级').selectOption('pressure')
  await expect(page.locator('.market-row')).toHaveCount(0)
  await page.getByLabel('经营类型', { exact: true }).selectOption('funded_loss')
  await expect(page.locator('.market-row')).toHaveAttribute('data-code', 'DDD')
  await page.getByRole('button', { name: 'DDD 核查依据' }).click()
  await expect(page.getByRole('dialog')).toContainText('固定经营类型依据')
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: '持仓股', exact: true }).click()
  await page.getByRole('link', { name: '高风险公司股票池', exact: true }).click()
  await expect(page.getByLabel('经营类型', { exact: true })).toHaveValue('all')
  await expect(page.getByLabel('基本面等级')).toHaveValue('all')
})

test('箱体按经营类型筛选并保留形态约束', async ({ page }) => {
  await page.goto('#/pool-boxes')
  await page.getByLabel('经营类型', { exact: true }).selectOption('funded_loss')
  await expect(page.locator('.box-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.box-table tbody tr')).toContainText('DDD')
  await page.getByLabel('基本面等级').selectOption('supported')
  await expect(page.locator('.box-table tbody tr')).toHaveCount(0)
  await page.getByLabel('经营类型', { exact: true }).selectOption('operating')
  await expect(page.locator('.box-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.box-table tbody tr')).toContainText('AAA')
})

for (const width of [390, 1024, 1440]) {
  test(`新池与箱体响应式 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('#/pool')
    await expect(page.locator('.market-row')).toHaveCount(3)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'AAA 核查依据' }).click()
    const dialog = page.getByRole('dialog')
    const bounds = await dialog.boundingBox()
    expect(bounds!.width).toBeLessThanOrEqual(width)
    await dialog.getByRole('button', { name: '关闭' }).click()
    await page.getByRole('link', { name: '高风险公司箱体研究', exact: true }).click()
    await expect(page.locator('.box-table tbody tr')).toHaveCount(2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
