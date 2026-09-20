const { chromium } = require('../.cache/browser/node_modules/playwright');
const assert = require('node:assert/strict');
const base = 'http://127.0.0.1:5175/tao-us-stock-dashboard/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const data = await (await page.request.get(base + 'data/dashboard.json')).json();
    const boxes = await (await page.request.get(base + 'data/boxes.json')).json();
    for (const [route, collection] of [['watchlist', 'original'], ['research', 'research']]) {
      await page.goto(base + '#/' + route);
      await page.locator('.market-row[data-code]').first().waitFor();
      const codes = data.collections.find(item => item.id === collection).codes;
      for (const [mode, label] of [['adjusted', '复权价'], ['raw', '未复权价']]) {
        await page.getByRole('button', { name: label, exact: true }).click();
        const actual = await page.locator('.market-row[data-code]').evaluateAll(rows => rows.map(row => {
          const cell = row.querySelector('.rsi-cell');
          return { code: row.dataset.code, value: cell.querySelector('strong').textContent, state: cell.dataset.rsiState,
            percentile: cell.querySelector('small').textContent, title: cell.dataset.rsiDescription };
        }));
        assert.equal(actual.length, codes.length);
        for (const row of actual) {
          const expected = data.adjustments[mode].rows.find(item => item.code === row.code).rsi;
          assert.equal(row.value, expected.value.toFixed(1));
          assert.equal(row.state, expected.state);
          assert.equal(row.percentile, expected.percentile_ytd === null ? '年内样本不足' : '年内 P' + expected.percentile_ytd.toFixed(1));
          assert(row.title.includes(expected.sample_start) && row.title.includes(expected.sample_end));
        }
      }
    }
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.locator('.rsi-oversold').first().scrollIntoViewIfNeeded();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `.cache/browser/rsi-${width}.png` });
    }
    await page.goto(base + '#/boxes');
    await page.getByLabel('状态', { exact: true }).selectOption('all');
    assert.equal(await page.locator('.box-table .rsi-cell').count(), 0);
    assert.equal(await page.locator('.box-table .business-cell').count(), 0);
    for (const box of boxes.rows) {
      const adjusted = data.adjustments.adjusted.rows.find(item => item.code === box.code).rsi;
      assert.deepEqual(box.rsi, adjusted); // Compatible payload retained, not a candidate-table column.
    }
    // Synthetic edge states exercise missing/short data and absolute vs relative labels.
    const fixture = structuredClone(data);
    const examples = [
      [30, 'oversold', 5, 'low', 20], [70, 'overbought', 95, 'high', 20],
      [42, 'neutral', 5, 'low', 20], [55, 'neutral', null, 'insufficient', 19],
      [null, 'unavailable', null, 'unavailable', 0],
    ];
    const codes = fixture.collections.find(item => item.id === 'original').codes.slice(0, 5);
    codes.forEach((code, i) => {
      const [value, state, percentile_ytd, percentile_state, sample_count] = examples[i];
      fixture.adjustments.adjusted.rows.find(item => item.code === code).rsi = {
        period: 14, value, state, percentile_ytd, percentile_state, sample_count,
        sample_start: '2026-01-02', sample_end: '2026-09-18', as_of: '2026-09-18',
      };
    });
    await page.route('**/data/dashboard.json', route => route.fulfill({ json: fixture }));
    await page.goto(base + '#/watchlist');
    await page.reload();
    await page.locator('.market-row[data-code]').first().waitFor();
    for (let i = 0; i < codes.length; i++) {
      const cell = page.locator(`[data-code="${codes[i]}"] .rsi-cell`);
      assert.equal(await cell.getAttribute('data-rsi-state'), examples[i][1]);
      if (i === 2) assert((await cell.innerText()).includes('年内偏低'));
      if (i === 3) assert((await cell.innerText()).includes('年内样本不足'));
      if (i === 4) assert((await cell.locator('strong').innerText()) === '—');
    }
    assert.deepEqual(errors, []);
    console.log('PASS: RSI real values in holdings/research both modes and compatible boxes payload; 30/70, relative rank, short/missing, desktop/mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
