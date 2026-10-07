import { test, expect } from '@playwright/test'
import { seed, dashboard } from './fixtures'

const unknown = { summary: '待核实', detail: 'Synthetic missing evidence', as_of: null, sources: [] }
const fact = { summary: '12月股数 +24%', detail: 'Synthetic comparable share evidence', as_of: '2026-09-25', sources: [{ title: '测试原文', url: 'https://www.sec.gov/' }] }
const sample = () => ({ schema_version: 1, generated_at: '2026-10-06T10:00-04:00', rows: [
  { code: 'AAA', symbol: 'AAA', asset_type: 'stock', level: 'watch', completeness: 'partial', reviewed_at: '2026-09-27', reason: 'Synthetic fixture, not a real stock', actual: fact, potential: unknown, funding: { ...fact, summary: '融资完成，资金改善' } },
  { code: 'BBB', symbol: 'BBB', asset_type: 'stock', level: 'unknown', completeness: 'unreviewed', reviewed_at: null, reason: 'Not reviewed', actual: unknown, potential: unknown, funding: unknown },
] })

test('融资三行信息、原文日期、键盘关闭及两口径保持一致', async ({ page }) => {
  await seed(page)
  await page.route('**/data/financing-review.json', r => r.fulfill({ json: sample() }))
  await page.goto('#/watchlist')
  const button = page.getByRole('button', { name: 'AAA 融资／稀释风险详情', exact: true })
  await expect(button).toContainText('12月股数 +24%')
  await expect(button).toContainText('潜在稀释待核实')
  await button.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'AAA 融资／稀释风险', exact: true })
  await expect(dialog).toContainText('专项核查 2026-09-27')
  await expect(dialog.getByRole('link', { name: '测试原文' }).first()).toHaveAttribute('href', 'https://www.sec.gov/')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(button).toBeFocused()
  await page.getByRole('button', { name: '未复权价', exact: true }).click()
  await expect(button).toContainText('12月股数 +24%')
  await page.getByRole('combobox', { name: '融资风险筛选' }).selectOption('watch')
  await expect(page.locator('.market-row')).toHaveCount(1)
  await page.goto('#/research')
  await expect(page.getByRole('combobox', { name: '融资风险筛选' })).toHaveValue('all')
})

test('坏融资JSON可重试，不阻断行情，不把未知当低风险', async ({ page }) => {
  await seed(page)
  let valid = false
  await page.route('**/data/financing-review.json', r => r.fulfill({ json: valid ? sample() : { ...sample(), schema_version: 9 } }))
  await page.goto('#/watchlist')
  await expect(page.getByRole('button', { name: 'AAA 融资／稀释风险详情' })).toContainText('资料读取失败')
  await expect(page.locator('.market-row[data-code="AAA"]')).toBeVisible()
  valid = true
  await page.getByRole('button', { name: '重试融资资料' }).click()
  await expect(page.getByRole('button', { name: 'AAA 融资／稀释风险详情' })).toContainText('关注')
  await expect(page.getByRole('button', { name: 'CCC 融资／稀释风险详情' })).toContainText('待核实')
})

test('手机与高风险表同列展示，非公司资产不适用，身份错配不采用评级', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page)
  await page.route('**/data/financing-review.json', r => r.fulfill({ json: { ...sample(), rows: sample().rows.map(x => ({ ...x, symbol: x.code === 'AAA' ? 'OTHER' : x.symbol })) } }))
  await page.route('**/data/dashboard.json', r => {
    const data = dashboard()
    data.collections.push({ id: 'pool', label: '高风险公司股票池', codes: ['AAA', 'BBB'], summaries: data.collections[0].summaries })
    for (const mode of ['raw', 'adjusted'] as const) data.adjustments[mode].rows.find(row => row.code === 'BBB')!.asset_type = 'etf'
    return r.fulfill({ json: data })
  })
  await page.goto('#/pool')
  await expect(page.getByRole('button', { name: 'AAA 融资／稀释风险详情' })).toContainText('待核实')
  const noncompany = page.locator('.market-row[data-code="BBB"] .financing-cell')
  await noncompany.scrollIntoViewIfNeeded()
  await expect(noncompany).toHaveText('—')
  await expect(page.getByRole('button', { name: 'BBB 融资／稀释风险详情' })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
