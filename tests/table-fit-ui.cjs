const { chromium } = require('../.cache/browser/node_modules/playwright');
const assert = require('node:assert/strict');
const base = process.env.DASHBOARD_TEST_URL || 'http://127.0.0.1:5175/tao-us-stock-dashboard/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1298, height: 900 } });
    for (const route of ['watchlist', 'research']) {
      await page.goto(base + '#/' + route);
      await page.locator('.market-row[data-code]').first().waitFor();
      for (const width of [1024, 1298, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        for (const label of ['距年线', '今年涨跌幅', '距52周高点', '距52周低点', '52周内位置']) {
          await page.getByRole('button', { name: label, exact: true }).click();
          const geometry = await page.evaluate(() => {
            const scroll = document.querySelector('.ranking-body-scroll');
            const header = document.querySelector('.market-header');
            const row = document.querySelector('.market-row[data-code]');
            return { overflow: scroll.scrollWidth - scroll.clientWidth,
              lastRight: row.lastElementChild.getBoundingClientRect().right,
              right: scroll.getBoundingClientRect().right,
              alignment: [...header.children].map((child, i) => Math.abs(child.getBoundingClientRect().left - row.children[i].getBoundingClientRect().left)) };
          });
          assert(geometry.overflow <= 1, `${route} ${width} ${label}: overflow ${geometry.overflow}`);
          assert(geometry.lastRight <= geometry.right + 1, `${route} ${width}: right column clipped`);
          assert(geometry.alignment.every(delta => delta < 2));
        }
        if (width === 1298) {
          await page.locator('.ranking-sticky').scrollIntoViewIfNeeded();
          await page.screenshot({ path: `.cache/browser/table-fit-${route}.png` });
        }
      }
      await page.setViewportSize({ width: 390, height: 844 });
      const scroll = page.locator('.ranking-body-scroll');
      await scroll.evaluate(el => { el.scrollLeft = el.scrollWidth; });
      await page.waitForTimeout(100);
      const bounds = await scroll.boundingBox();
      const last = await page.locator('.market-row[data-code]').first().locator(':scope > div:last-child').boundingBox();
      assert(last.x >= bounds.x && last.x + last.width <= bounds.x + bounds.width + 1);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    console.log('PASS: both lists, all five metrics fit 1024/1298/1440/1920 desktop widths; mobile final column reachable.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
