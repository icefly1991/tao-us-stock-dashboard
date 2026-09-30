import { test, expect } from '@playwright/test'
import { boxes, seed } from './fixtures'

test.beforeEach(async ({ page }) => {
  await seed(page)
  page.on('pageerror', error => { throw error })
})

test('箱体默认候选、筛选与搜索、不增加业务RSI列', async ({ page }) => {
  await page.goto('#/boxes')
  await expect(page.locator('.box-table tbody tr')).toHaveCount(2)
  await expect(page.locator('.box-table')).not.toContainText('业务')
  await expect(page.locator('.box-table')).not.toContainText('RSI')
  await page.getByLabel('状态', { exact: true }).selectOption('all')
  await expect(page.locator('.box-table tbody tr')).toHaveCount(3)
  await page.getByLabel('查找股票', { exact: true }).fill('crwv')
  await expect(page.locator('.box-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.box-reason')).toContainText('长期区间位置')
  await page.getByLabel('查找股票', { exact: true }).fill('no-match')
  await expect(page.locator('.box-empty')).toContainText('暂无匹配结果')
})

test('窗口、长期边界与共轴副图同步；null不补0', async ({ page }) => {
  await page.goto('#/boxes')
  await expect(page.locator('[data-boundary="upper"]')).toHaveAttribute('data-price', '55')
  await page.getByRole('button', { name: /90日.*空间/ }).click()
  await expect(page.locator('[data-boundary="upper"]')).toHaveAttribute('data-price', '60')
  await expect(page.getByTestId('box-volume-panel').locator('rect')).toHaveCount(89)
  await expect(page.getByTestId('box-volume-panel').locator('[data-volume="0"]')).toHaveCount(1)
  const chart = page.getByRole('img', { name: /复权日K线/ })
  await chart.focus()
  await page.mouse.move(0, 0)
  await expect(page.getByTestId('box-chart-volume')).toContainText('8,900')
  const initialDate = await page.getByTestId('box-chart-date').innerText()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('box-chart-date')).not.toHaveText(initialDate)
  await expect(page.getByTestId('box-chart-volume')).toContainText('8,800')
  await expect(page.getByTestId('box-chart-rsi')).toContainText('68.0')
  await page.getByRole('button', { name: /60日.*默认/ }).click()
  await expect(page.locator('[data-boundary="upper"]')).toHaveAttribute('data-price', '55')
  await expect(page.getByTestId('box-volume-panel').locator('rect')).toHaveCount(60)
  await page.getByRole('button', { name: '最近一年背景', exact: true }).click()
  await expect(page.getByTestId('box-volume-panel').locator('rect')).toHaveCount(89)
  await expect(page.getByTestId('box-rsi-panel')).toBeVisible()
})

test('箱体说明折叠但必要限制可见', async ({ page }) => {
  await page.goto('#/boxes')
  await expect(page.getByText('仅复权日线 · 回顾性形态', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '完整箱体方法', exact: true })).toBeHidden()
  await page.getByText('箱体方法与选股标准', { exact: true }).click()
  await expect(page.getByRole('link', { name: '完整箱体方法', exact: true })).toHaveAttribute('href', /BOX_DEFINITIONS.md$/)
  await expect(page.getByText(/历史不足一年，本次使用/)).toBeVisible()
})

for (const scenario of ['v3', 'missing errors', 'invalid trip'] as const) {
  test(`箱体损坏数据有错误提示 ${scenario}`, async ({ page }) => {
    const data: Record<string, unknown> = boxes()
    if (scenario === 'v3') data.schema_version = 3
    if (scenario === 'missing errors') delete data.errors
    if (scenario === 'invalid trip') (data.rows as { trips: unknown[] }[])[0].trips = [{ start_index: 9999, end_index: 1 }]
    await page.route('**/data/boxes.json', route => route.fulfill({ json: data }))
    await page.goto('#/boxes')
    await expect(page.getByRole('alert')).toContainText('箱体数据暂不可用')
    await page.getByRole('link', { name: '持仓股', exact: true }).click()
    await expect(page.locator('.market-row[data-code]')).toHaveCount(5)
  })
}
