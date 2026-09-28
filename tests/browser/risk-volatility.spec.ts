import { test, expect } from '@playwright/test'
import { seed, dashboard } from './fixtures'

const evidence = [{ title: '测试原始文件', url: 'https://www.sec.gov/Archives/' }]
function review() {
  const event = { kind: 'controls', label: '重大内控缺陷待整改', detail: '财报披露，不等于已认定造假。', state: 'current', legal_status: 'disclosed', severity: 'elevated', disclosed_at: '2026-08-01', sources: evidence }
  return { schema_version: 1, reviewed_at: '2026-09-27', rows: ['AAA', 'BBB', 'CCC', 'DDD', 'ZZZ', 'SUSP'].map(code => ({
    code, coverage: code === 'ZZZ' ? 'screened' : 'targeted', filing_date: '2026-08-01', sources: evidence,
    events: code === 'AAA' ? [event] : code === 'BBB' ? [{ ...event, state: 'resolved' }] : code === 'CCC' ? [{ ...event, kind: 'controller', state: 'historical', legal_status: 'admitted', label: '控制人历史认罪' }] : [],
  })) }
}

test.beforeEach(async ({ page }) => {
  await seed(page)
  const data = dashboard()
  for (const mode of ['adjusted', 'raw'] as const) {
    for (const row of data.adjustments[mode].rows) Object.assign(row, { volatility_3m: { value: ({ AAA: 2, BBB: 8, CCC: 4 } as Record<string, number>)[row.code] ?? null, status: ['AAA', 'BBB', 'CCC'].includes(row.code) ? 'available' : 'insufficient', sample_count: 65, window_start: '2026-06-25', window_end: '2026-09-25' } })
  }
  await page.route('**/data/dashboard.json', route => route.fulfill({ json: data }))
  await page.route('**/data/governance-review.json', route => route.fulfill({ json: review() }))
})

test('日均波幅降序、缺失置后、切指标及导航恢复默认', async ({ page }) => {
  await page.goto('#/watchlist')
  const sort = page.getByRole('button', { name: '近3月日均波幅' })
  await expect(page.locator('[data-code="AAA"] .volatility-cell')).toHaveText('2.00%')
  await sort.click()
  await expect(sort).toHaveAttribute('aria-pressed', 'true')
  expect(await page.locator('.market-row[data-code]').evaluateAll(rows => rows.map(row => row.getAttribute('data-code')))).toEqual(['BBB', 'CCC', 'AAA', 'DDD', 'ZZZ'])
  await expect(page.locator('[data-code="AAA"] .volatility-cell')).toHaveAttribute('title', /2026-06-25.*65/)
  await page.getByRole('button', { name: '距年线', exact: true }).click()
  await expect(sort).toHaveAttribute('aria-pressed', 'false')
  await sort.click()
  await page.getByRole('link', { name: '活跃股观察列表', exact: true }).click()
  await expect(page.getByRole('button', { name: '52周内进度', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('当前风险不混入已整改和历史记录，依据区分指控', async ({ page }) => {
  await page.goto('#/watchlist')
  await page.getByLabel('重大事项筛选').selectOption('current')
  await expect(page.locator('.market-row')).toHaveCount(1)
  await expect(page.locator('.market-row')).toHaveAttribute('data-code', 'AAA')
  await page.getByRole('button', { name: 'AAA 重大事项依据' }).click()
  const dialog = page.getByRole('dialog', { name: 'AAA 重大事项' })
  await expect(dialog).toContainText('不等于已认定造假')
  await expect(dialog.getByRole('link', { name: '测试原始文件' }).first()).toHaveAttribute('href', 'https://www.sec.gov/Archives/')
  await page.keyboard.press('Escape')
  await page.getByLabel('重大事项筛选').selectOption('controller')
  await expect(page.locator('.market-row')).toHaveCount(1)
  await expect(page.locator('.market-row')).toHaveAttribute('data-code', 'CCC')
  await page.getByLabel('重大事项筛选').selectOption('all')
  await page.getByRole('button', { name: 'BBB 重大事项依据' }).click()
  await expect(page.getByRole('dialog', { name: 'BBB 重大事项' })).toContainText('已解决/整改')
})

test('损坏治理来源保留行情，不冒充安全', async ({ page }) => {
  const bad = review(); bad.rows[0].events[0].sources = [{ title: 'bad', url: 'javascript:alert(1)' }]
  await page.route('**/data/governance-review.json', route => route.fulfill({ json: bad }))
  await page.goto('#/watchlist')
  await expect(page.getByText('风险资料不可用，不能视为安全')).toBeVisible()
  await expect(page.locator('.market-row[data-code]')).toHaveCount(5)
})

test('默认全部、一键重大风险及观察分离，不用高管案件代替生存评级', async ({ page }) => {
  const data = review()
  const rows = data.rows.map(row => ({ ...row, distress: { level: row.code === 'AAA' ? 'major' : row.code === 'BBB' ? 'watch' : 'not_flagged', reasons: row.code === 'AAA' ? ['持续经营重大疑虑'] : row.code === 'BBB' ? ['后续融资待跟踪'] : [] } }))
  rows[0].events = [{ ...rows[0].events[0], kind: 'survival', label: '持续经营重大疑虑' }]
  await page.route('**/data/governance-review.json', route => route.fulfill({ json: { ...data, rows } }))
  await page.goto('#/watchlist')
  await expect(page.locator('.market-row[data-code]')).toHaveCount(5)
  await page.getByRole('button', { name: '只看重大风险', exact: true }).click()
  await expect(page.locator('.market-row')).toHaveCount(1)
  await expect(page.locator('.market-row')).toHaveAttribute('data-code', 'AAA')
  await page.getByRole('button', { name: 'AAA 重大事项依据' }).click()
  await expect(page.getByRole('dialog')).toContainText('生存 / 退市风险：重大风险')
  await expect(page.getByRole('dialog')).toContainText('不等于已经破产或退市')
  await page.keyboard.press('Escape')
  await page.getByLabel('重大事项筛选').selectOption('distress:watch')
  await expect(page.locator('.market-row')).toHaveCount(1)
  await expect(page.locator('.market-row')).toHaveAttribute('data-code', 'BBB')
  await page.getByLabel('重大事项筛选').selectOption('distress:unknown')
  await expect(page.locator('.market-row')).toHaveCount(0)
  await page.getByLabel('重大事项筛选').selectOption('all')
  await expect(page.locator('.market-row[data-code]')).toHaveCount(5)
})
