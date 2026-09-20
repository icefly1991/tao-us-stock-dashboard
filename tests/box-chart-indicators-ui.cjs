const { chromium } = require('../.cache/browser/node_modules/playwright');
const assert = require('node:assert/strict');
const base = 'http://127.0.0.1:5175/tao-us-stock-dashboard/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const data = await (await page.request.get(base + 'data/boxes.json')).json();
    const row = data.rows.find(row => row.code === 'CRWV');
    await page.goto(base + '#/boxes');
    await page.getByRole('button', { name: '查看 CRWV 对照' }).click();
    assert((await page.locator('.box-business').innerText()).includes(row.business));
    assert.equal(await page.locator('.box-table .rsi-cell, .box-table .business-cell').count(), 0);
    for (const window of row.windows) {
      await page.locator('.box-window-options button').filter({ hasText: new RegExp('^' + window.window_days + '日') }).click();
      const bars = row.bars.slice(window.window_start_index);
      const volume = await page.locator('[data-testid="box-volume-panel"] rect').evaluateAll(nodes => nodes.map(el => [el.dataset.date, Number(el.dataset.volume)]));
      assert.deepEqual(volume, bars.filter(bar => bar.volume != null).map(bar => [bar.time, bar.volume]));
      const path = await page.getByTestId('box-rsi-line').getAttribute('d');
      assert.equal((path.match(/[ML]/g) || []).length, bars.filter(bar => bar.rsi_value != null).length);
      const svg = page.locator('svg.box-chart');
      await page.mouse.move(0, 0);
      await svg.focus();
      await page.waitForTimeout(100);
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.getByTestId('box-chart-date').innerText(), bars.at(-2).time);
      assert((await page.getByTestId('box-chart-rsi').innerText()).includes(bars.at(-2).rsi_value.toFixed(1)));
      assert((await page.getByTestId('box-chart-volume').innerText()).includes(new Intl.NumberFormat('zh-CN').format(bars.at(-2).volume)));
    }
    await page.locator('.box-window-options button').filter({ hasText: /^60日/ }).click();
    await page.getByRole('button', { name: '最近一年背景', exact: true }).click();
    assert.equal(await page.locator('[data-testid="box-volume-panel"] rect').count(), row.bars.filter(bar => bar.volume != null).length);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      await page.locator('.box-chart-scroll').scrollIntoViewIfNeeded();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `.cache/browser/box-chart-indicators-${width}.png` });
    }
    // Optional fields must degrade to missing text, never a fake zero series.
    const missing = structuredClone(data);
    const candidate = missing.rows.find(item => item.code === 'CRWV');
    candidate.bars.forEach(bar => { delete bar.volume; delete bar.rsi_value; });
    await page.route('**/data/boxes.json', route => route.fulfill({ json: missing }));
    await page.reload();
    await page.getByRole('button', { name: '查看 CRWV 对照' }).click();
    assert.equal(await page.getByTestId('box-rsi-line').getAttribute('d').then(text => text.trim()), '');
    assert.equal(await page.locator('[data-testid="box-volume-panel"] rect').count(), 0);
    assert((await page.getByTestId('box-chart-rsi').innerText()).includes('—'));
    assert((await page.getByTestId('box-chart-volume').innerText()).includes('—'));
    assert.deepEqual(errors, []);
    console.log('PASS: detail business, four windows and year share aligned volume/RSI, keyboard daily values, mobile bounds, missing fields.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
