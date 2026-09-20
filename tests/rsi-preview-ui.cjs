const { chromium } = require('../.cache/browser/node_modules/playwright');
const assert = require('node:assert/strict');
const base = 'http://127.0.0.1:5175/tao-us-stock-dashboard/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['watchlist', 'research', 'boxes']) {
      await page.goto(base + '#/' + route);
      const nav = page.getByRole('navigation', { name: '列表页面', exact: true });
      await nav.waitFor();
      assert.deepEqual(await nav.locator('a').allTextContents(), ['持仓股', '活跃股观察列表', '箱体观察']);
      assert.equal(await nav.locator('[aria-current="page"]').getAttribute('href'), '#/' + route);
      if (route !== 'boxes') {
        const businesses = page.locator('.market-row[data-code] .business-cell');
        assert((await businesses.allTextContents()).every(text => text && text !== '—'));
      } else {
        assert.equal(await page.locator('.box-table .business-cell, .box-table .rsi-cell').count(), 0);
      }
      assert((await page.getByLabel('行情更新时间', { exact: true }).innerText()).includes('最新数据日：2026-09-18'));

    }
    await page.getByRole('heading', { name: '宽箱体形态识别', exact: true }).waitFor();
    await page.goto(base + '#/watchlist');
    let cell = page.locator('[data-code="CRWV"] .rsi-cell');
    await cell.scrollIntoViewIfNeeded();
    assert.equal(await cell.evaluate(el => getComputedStyle(el).textAlign), 'center');
    await cell.hover();
    let dialog = page.getByRole('dialog', { name: 'CoreWeave RSI历史', exact: true });
    await dialog.locator('svg').waitFor();
    assert((await dialog.innerText()).includes('不足两年'));
    assert((await dialog.innerText()).includes('复权价'));
    const expected = await cell.locator('strong').innerText();
    assert((await dialog.locator('.rsi-chart-value').innerText()).endsWith(expected));
    await dialog.hover();
    await page.waitForTimeout(400);
    assert(await dialog.isVisible());
    await page.screenshot({ path: '.cache/browser/rsi-preview-desktop.png' });
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    await page.getByRole('button', { name: '未复权价', exact: true }).click();
    cell = page.locator('[data-code="CRWV"] .rsi-cell');
    await cell.scrollIntoViewIfNeeded();
    await cell.focus();
    await page.keyboard.press('Enter');
    await dialog.locator('svg').waitFor();
    assert((await dialog.innerText()).includes('未复权价'));
    await page.getByRole('button', { name: '关闭RSI预览' }).click();
    // Old batch must be rejected, then retry must recover without reloading the table.
    const historyUrl = '**/data/history/raw/MCD.json?*';
    let wrong = true;
    await page.route(historyUrl, async route => {
      const response = await route.fetch(); const data = await response.json();
      if (wrong) data.updated_at = 'outdated';
      await route.fulfill({ json: data });
    });
    await page.locator('[data-code="MCD"] .rsi-cell').click();
    dialog = page.getByRole('dialog', { name: "McDonald's RSI历史", exact: true });
    await dialog.getByText('历史与当前行情版本不一致，请刷新页面', { exact: false }).waitFor();
    wrong = false;
    await dialog.getByRole('button', { name: '重试', exact: true }).click();
    await dialog.locator('svg').waitFor();
    assert((await dialog.innerText()).includes('近两年'));
    await page.keyboard.press('Escape');
    // Horizontal identity must remain pinned on all three pages.
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ['watchlist', 'research', 'boxes']) {
      await page.goto(base + '#/' + route);
      const scroll = page.locator(route === 'boxes' ? '.box-table-scroll' : '.ranking-body-scroll');
      const identity = page.locator(route === 'boxes' ? '.box-table tbody tr:first-child td:first-child' : '.market-row[data-code] .stock-identity').first();
      await identity.waitFor();
      await scroll.scrollIntoViewIfNeeded();
      await scroll.evaluate(el => { el.scrollLeft = 250; });
      await page.waitForTimeout(80);
      const a = await identity.boundingBox();
      await scroll.evaluate(el => { el.scrollLeft = 450; });
      await page.waitForTimeout(80);
      const b = await identity.boundingBox();
      const bounds = await scroll.boundingBox();
      assert(Math.abs(a.x - b.x) < 2, `${route} identity moves`);
      assert(Math.abs(b.x - bounds.x) < 3, `${route} identity outside scroll edge: ${b.x} ${bounds.x}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `.cache/browser/sticky-${route}-390.png` });
    }
    // Touch-style activation fits the small viewport; no hover requirement.
    await page.goto(base + '#/watchlist');
    await page.locator('[data-code="CRWV"] .rsi-cell').click();
    dialog = page.getByRole('dialog', { name: 'CoreWeave RSI历史', exact: true });
    await dialog.locator('svg').waitFor();
    const bounds = await dialog.boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= 390 && bounds.y >= 0 && bounds.y + bounds.height <= 844);
    await page.screenshot({ path: '.cache/browser/rsi-preview-mobile.png' });
    await page.getByRole('button', { name: '关闭RSI预览' }).click();
    assert.deepEqual(errors, []);
    console.log('PASS: shared navigation, business labels, RSI hover/keyboard/mobile, version mismatch/retry, matching modes/latest values, 3-page horizontal sticky identities.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
