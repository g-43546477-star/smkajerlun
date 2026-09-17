import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';

const local = await startStaticServer();
const browser = await chromium.launch({ channel: 'chrome', headless: false });
try {
  const page = await browser.newPage({ javaScriptEnabled: false });
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(local.url);
    assert.equal(await page.locator('#hero-title').innerText(), 'SMKA Jerlun');
    assert.equal(await page.locator('.school-motto').innerText(), 'Adab Dulu Baru Ilmu');
    const links = page.locator('.school-shortcuts a');
    assert.equal(await links.count(), 12);
    for (const link of await links.all()) {
      assert.ok(await link.isVisible());
      const href = await link.getAttribute('href');
      const response = await page.request.get(new URL(href, local.url).href);
      assert.ok(response.ok(), `${href}: HTTP ${response.status()}`);
    }
  }
  console.log('PASS: gateway title, motto and 12 destinations at 3 widths with JavaScript disabled. Headed Chrome.');
} finally {
  await browser.close();
  local.server.close();
}
