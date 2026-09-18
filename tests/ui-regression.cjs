const { chromium } = require('../.cache/browser/node_modules/playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.DASHBOARD_TEST_URL || 'http://127.0.0.1:5174/tao-us-stock-dashboard/';
const metrics = ['distance_ma250_pct', 'ytd_return_pct', 'distance_52w_high_pct', 'distance_52w_low_pct', 'position_52w_pct'];
const labels = ['距年线', '今年涨跌幅', '距52周高点', '距52周低点', '52周内位置'];
(async () => {
  const fixture = JSON.parse(fs.readFileSync('public/data/dashboard.json', 'utf8'));
  const codes = [...new Set(fixture.collections.flatMap(collection => collection.codes))];
  fixture.updated_at = 'UI REGRESSION FIXTURE';
  fixture.suspended = [{ code: 'CFLT', name: 'Confluent', symbol: 'CFLT', note: '已被收购并停止交易' }];
  for (const mode of ['adjusted', 'raw']) {
    fixture.adjustments[mode].rows = codes.filter(code => code !== 'CFLT').map(code => ({ code, name: code, symbol: code, asset_type: 'stock', close: 10, today_return_pct: 1, history_days: 252 }));
    fixture.adjustments[mode].rows.forEach((row, i) => {
      metrics.forEach((metric, j) => { row[metric] = i % 11 === 0 ? null : ((i * 17 + j * 13) % 100) - (mode === 'raw' ? 35 : 50); });
    });
  }
  fs.mkdirSync('.cache/browser', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/data/dashboard.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }));
    for (const [hash, id] of [['#/watchlist', 'original'], ['#/research', 'research'], ['#/research/A', 'A'], ['#/research/B', 'B'], ['#/research/C', 'C']]) {
      await page.goto(base + hash);
      await page.locator('.market-row[data-code]').first().waitFor();
      assert.equal(await page.getByRole('navigation', { name: '新增列表分档', exact: true }).count(), id === 'original' ? 0 : 1);
      for (const [mode, modeLabel] of [['adjusted', '复权价'], ['raw', '未复权价']]) {
        await page.getByRole('button', { name: modeLabel, exact: true }).click();
        for (let j = 0; j < metrics.length; j++) {
          await page.getByRole('button', { name: labels[j], exact: true }).click();
          const codes = fixture.collections.find(c => c.id === id).codes;
          const expected = fixture.adjustments[mode].rows.filter(r => codes.includes(r.code)).sort((a, b) => {
            const x = a[metrics[j]], y = b[metrics[j]];
            if (x === null) return y === null ? 0 : 1;
            if (y === null) return -1;
            return x - y || a.code.localeCompare(b.code);
          }).map(r => r.code);
          assert.deepEqual(await page.locator('.market-row[data-code]').evaluateAll(rows => rows.map(r => r.dataset.code)), expected);
          assert.equal(await page.locator('[data-trading-status="suspended"]').count(), codes.includes('CFLT') ? 1 : 0);
        }
      }
    }
    await page.getByRole('link', { name: '原 Watchlist', exact: true }).click();
    await page.waitForURL('**/#/watchlist');
    await page.getByRole('link', { name: '新增列表', exact: true }).click();
    await page.waitForURL('**/#/research');
    await page.getByRole('link', { name: 'A 档 · 30', exact: true }).click();
    await page.waitForURL('**/#/research/A');
    await page.reload();
    await page.getByRole('heading', { name: 'A 档 · 距年线榜单', exact: true }).waitFor();
    await page.goBack();
    await page.waitForURL('**/#/research');
    await page.goForward();
    await page.waitForURL('**/#/research/A');
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => window.scrollTo(0, 0));
      const initial = await page.evaluate(() => ({ header: document.querySelector('.market-header').getBoundingClientRect().bottom, first: document.querySelector('.market-row').getBoundingClientRect().top }));
      assert(initial.first >= initial.header - 1, `first row overlap at ${width}`);
      await page.locator('.ranking-sticky').evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 250));
      await page.waitForTimeout(100);
      const pinned = await page.locator('.ranking-sticky').boundingBox();
      assert(Math.abs(pinned.y) < 2, `not sticky at ${width}: ${pinned.y}`);
      assert(await page.locator('h2').isVisible());
      await page.locator('.ranking-body-scroll').evaluate(el => { el.scrollLeft = 220; });
      await page.waitForTimeout(100);
      const alignment = await page.evaluate(() => {
        const header = document.querySelector('.market-header');
        const row = document.querySelector('.market-row');
        return [...header.children].map((el, i) => Math.abs(el.getBoundingClientRect().left - row.children[i].getBoundingClientRect().left));
      });
      assert(alignment.every(delta => delta < 2), `column mismatch ${width}: ${alignment}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `page overflow ${width}`);
      await page.locator('.ranking-body-scroll').evaluate(el => { el.scrollLeft = 0; });
      await page.screenshot({ path: `.cache/browser/ui004-${width}.png` });
    }
    assert.deepEqual(errors, []);
    console.log('PASS: 50 route/mode/metric rankings; nulls/suspension; native navigation/reload/back/forward; 390/768/1440 sticky and first-row geometry; horizontal column alignment. Synthetic data only.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
