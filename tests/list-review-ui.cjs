const { chromium } = require('../.cache/browser/node_modules/playwright');
const assert = require('node:assert/strict');
const base = 'http://127.0.0.1:5175/tao-us-stock-dashboard/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [date, updated, days, overdue] of [
      ['2026-10-19T04:00:00Z', '2026-09-19', 30, false],
      ['2026-10-20T04:00:00Z', '2026-09-19', 31, true],
      ['2026-10-19T16:01:00Z', '2026-09-19', 31, true],
      ['2026-09-19T04:00:00Z', '2026-09-20', null, false],
      ['2026-09-19T04:00:00Z', '2026-02-31', null, false],
    ]) {
      const page = await browser.newPage();
      await page.clock.install({ time: new Date(date) });
      await page.route('**/data/list-review.json', route => route.fulfill({ json: { last_updated: updated } }));
      await page.goto(base + '#/boxes');
      const notice = page.getByTestId('list-review-notice');
      await notice.getByText(days === null ? '列表上次更新日期暂不可用，请核实维护记录。' : `列表上次更新是 ${updated}，距今 ${days} 天。`, { exact: true }).waitFor();
      assert.equal(await notice.getAttribute('data-overdue'), String(overdue));
      await page.getByRole('link', { name: '活跃股观察列表', exact: true }).click();
      await notice.waitFor();
      await notice.getByText(days === null ? '列表上次更新日期暂不可用，请核实维护记录。' : `列表上次更新是 ${updated}，距今 ${days} 天。`, { exact: true }).waitFor();
      await page.close();
    }
    const page = await browser.newPage();
    await page.route('**/data/list-review.json', route => route.fulfill({ status: 404 }));
    await page.goto(base + '#/research');
    await page.getByText('列表上次更新日期暂不可用，请核实维护记录。', { exact: true }).waitFor();
    console.log('PASS: list update age 30/31 days, Shanghai midnight, future/invalid/missing dates, both pages.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
