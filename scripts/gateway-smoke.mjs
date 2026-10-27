import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';

const local = await startStaticServer();
const browser = await chromium.launch({ channel: 'chrome', headless: false });
try {
  await fs.mkdir('outputs/design-20260927', { recursive: true });
  const page = await browser.newPage({ javaScriptEnabled: false });
  for (const width of [320, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(local.url);
    assert.equal(await page.locator('#hero-title').innerText(), 'SMKA Jerlun');
    assert.equal(await page.locator('.school-motto').innerText(), 'Adab Dulu Baru Ilmu');
    assert.equal(await page.locator('.school-shortcut-group').count(), 2);
    for (const group of await page.locator('.school-shortcut-group').all()) assert.equal(await group.locator('a').count(), 6);
    const heroHeight = await page.locator('.school-hero').evaluate(el => el.getBoundingClientRect().height);
    assert.ok(heroHeight <= (width <= 700 ? 280 : 380), `Hero must leave room for the shortcuts at ${width}px`);
    assert.equal(await page.locator('.school-shortcut-group').first().getAttribute('aria-labelledby'), 'service-links-title');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Overflow at ${width}`);
    assert.equal(await page.locator('.school-header-actions a').count(), 2);
    for (const link of await page.locator('.school-header-actions a').all()) {
      assert.ok(await link.isVisible());
      assert.ok((await page.request.get(new URL(await link.getAttribute('href'), local.url).href)).ok());
    }
    const icons = await page.locator('.school-shortcuts a').filter({ hasText: /^(Akademik|Portal PSS|Log Masuk)$/ }).locator('img').evaluateAll(images => images.map(img => img.getAttribute('src')));
    assert.equal(new Set(icons).size, 3, 'Academic, library and login icons must be distinct.');
    const links = page.locator('.school-shortcuts a');
    assert.equal(await links.count(), 12);
    for (const link of await links.all()) {
      assert.ok(await link.isVisible());
      const href = await link.getAttribute('href');
      const response = await page.request.get(new URL(href, local.url).href);
      assert.ok(response.ok(), `${href}: HTTP ${response.status()}`);
    }
    if (width === 390 || width === 1440) await page.screenshot({ path: `outputs/design-20260927/home-${width}.png`, fullPage: true });
  }
  console.log('PASS: compact hero, 2 shortcut groups, header actions, distinct icons and 12 destinations at 4 widths with JavaScript disabled. Headed Chrome.');
} finally {
  await browser.close();
  local.server.close();
}
