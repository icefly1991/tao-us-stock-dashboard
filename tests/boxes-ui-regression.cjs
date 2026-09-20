const { chromium } = require('../.cache/browser/node_modules/playwright');
const assert = require('node:assert/strict');
const base = process.env.DASHBOARD_TEST_URL || 'http://127.0.0.1:5175/tao-us-stock-dashboard/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.request.get(base + 'data/boxes.json');
    assert(response.ok());
    const data = await response.json();
    assert.equal(data.schema_version, 4);
    for (const code of ['AVAV', 'CRWV']) {
      const row = data.rows.find(item => item.code === code);
      assert.equal(row.status, 'match');
      assert(row.width_pct >= 20 && row.cycle_days <= 120);
      assert(row.rounds.length >= 1 && row.rounds.every(round => round.turns.length === 4));
      const average = row.rounds.reduce((total, round) => total + round.calendar_days, 0) / row.rounds.length;
      assert(Math.abs(average - row.cycle_days) <= 0.005);
    }

    await page.goto(base + '#/boxes');
    await page.getByRole('heading', { name: '宽箱体形态识别' }).waitFor();
    await page.locator('.box-table tbody tr').first().waitFor();
    assert.equal(await page.locator('.box-table tbody tr').count(), data.rows.filter(row => ['match', 'watch'].includes(row.status)).length);
    assert.equal(await page.locator('.box-table tbody button').filter({ hasText: 'NBIS' }).count(), 0);
    await page.getByLabel('状态', { exact: true }).selectOption('excluded');
    await page.getByLabel('查找股票').fill('NBIS');
    assert.equal(await page.locator('.box-table tbody tr').count(), 1);
    await page.getByRole('img', { name: 'NBIS 长期价格背景及当前箱体边界' }).waitFor();
    assert.equal(data.rows.find(row => row.code === 'NBIS').status, 'excluded');
    await page.getByLabel('查找股票').fill('');
    const first = await page.locator('.box-table tbody tr').first().locator('button strong').innerText();
    assert(first);
    await page.getByLabel('状态', { exact: true }).selectOption('watch');
    assert.equal(await page.locator('.box-table tbody tr').count(), data.rows.filter(row => row.status === 'watch').length);
    await page.screenshot({ path: '.cache/browser/boxes-desktop.png', fullPage: true });
    await page.getByLabel('状态', { exact: true }).selectOption('all');
    await page.getByLabel('查找股票').fill('AMBA');
    const amba = data.rows.find(row => row.code === 'AMBA');
    for (const window of amba.windows.filter(item => item.low != null)) {
      await page.locator('.box-window-options button').filter({ hasText: new RegExp('^' + window.window_days + '日') }).click();
      assert.equal(Number(await page.locator('[data-boundary="upper"]').getAttribute('data-price')), window.high);
      assert.equal(Number(await page.locator('[data-boundary="lower"]').getAttribute('data-price')), window.low);
      assert((await page.locator('.box-cycle-summary').innerText()).includes('完整轮次 ' + window.round_count + ' 轮'));
    }
    await page.locator('.box-window-options button').filter({ hasText: /^90日/ }).click();
    await page.getByRole('button', { name: '最近一年背景', exact: true }).click();
    await page.getByRole('button', { name: '近期90日窗口', exact: true }).click();
    await page.getByLabel('查找股票').fill('SITM');
    assert.equal(await page.locator('.box-contract-note').count(), 1);
    assert((await page.locator('.box-reason').innerText()).includes('100%'));
    await page.getByLabel('查找股票').fill('');
    await page.getByLabel('状态', { exact: true }).selectOption('match');
    await page.screenshot({ path: '.cache/browser/boxes-v4-desktop.png', fullPage: true });
    await page.getByRole('button', { name: '查看 CRWV 对照' }).click();
    assert.equal(await page.locator('.box-table tbody tr').count(), 1);
    await page.getByRole('img', { name: 'CRWV 复权日K线、固定箱体和穿越轨迹' }).waitFor();
    const crwv = data.rows.find(row => row.code === 'CRWV');
    assert.equal(Number(await page.locator('[data-boundary="upper"]').getAttribute('data-price')), crwv.high);
    assert.equal(Number(await page.locator('[data-boundary="lower"]').getAttribute('data-price')), crwv.low);
    assert(Number(await page.locator('[data-boundary="upper"]').getAttribute('y1')) < Number(await page.locator('[data-boundary="lower"]').getAttribute('y1')));
    assert.equal(await page.locator('.box-reason').innerText(), crwv.reason);
    await page.getByLabel('查找股票').fill('NO_SUCH_STOCK');
    assert.equal(await page.locator('.box-table tbody tr').count(), 0);
    await page.getByRole('status').waitFor();
    assert.equal(await page.locator('.box-detail').count(), 0);
    await page.getByLabel('查找股票').fill('COHR');
    await page.getByRole('img', { name: 'COHR 复权日K线、固定箱体和穿越轨迹' }).waitFor();
    await page.locator('.box-detail details:not(.box-rounds) summary').click();
    assert.equal(await page.locator('.box-trips p').count(), Math.max(1, data.rows.find(row => row.code === 'COHR').trips.length));
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `page overflow ${width}`);
      await page.locator('.box-chart-scroll').evaluate(el => { el.scrollLeft = 500; });
      await page.locator('.box-detail').scrollIntoViewIfNeeded();
      const upper = await page.locator('.box-long-label.upper').boundingBox();
      const lower = await page.locator('.box-long-label.lower').boundingBox();
      assert(upper.y + upper.height <= lower.y + 1, 'long-range boundary labels overlap');
      assert(upper.x >= 0 && upper.x + upper.width <= width, 'upper label outside viewport');
      await page.screenshot({ path: `.cache/browser/boxes-chart-${width}.png` });
    }
    await page.getByRole('link', { name: '持仓股', exact: true }).click();
    await page.getByRole('heading', { name: '持仓股', exact: true }).waitFor();
    await page.getByRole('link', { name: '箱体观察', exact: true }).click();
    await page.getByRole('heading', { name: '宽箱体形态识别' }).waitFor();
    await page.route('**/data/boxes.json', route => route.fulfill({ json: { ...data, schema_version: 3 } }));
    await page.reload();
    await page.getByRole('alert').waitFor();
    await page.unroute('**/data/boxes.json');
    await page.route('**/data/boxes.json', route => route.fulfill({ status: 503, body: 'unavailable' }));
    await page.reload();
    await page.getByRole('alert').waitFor();
    assert.deepEqual(errors, []);
    console.log(`PASS: real ${data.rows.length}-stock screen, verified/watch filters, AVAV/CRWV, v3 rejection, candles, trips, search/empty/error, routes, 390/768/1440 layout.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
