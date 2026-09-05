import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';
const local = await startStaticServer();
const browser = await chromium.launch({ headless: false, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
try {
  for (const width of [390, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    for (const [key, label] of [['akademik', 'Akademik'], ['hem', 'HEM'], ['kokurikulum', 'Kokurikulum'], ['asrama', 'Asrama'], ['info', 'Info Sekolah'], ['perkhidmatan', 'Perkhidmatan']]) {
      await page.goto(local.url);
      if (width <= 1100) await page.locator('.school-menu-toggle').click();
      const toggle = page.getByLabel('Buka submenu ' + label, { exact: true });
      await toggle.hover();
      assert.equal(await page.locator('nav.tabs details[open]').count(), 0, 'Hover must not toggle the menu');
      await toggle.click();
      assert.equal(await page.locator('nav.tabs details[open]').count(), 1);
      await toggle.click();
      assert.equal(await page.locator('nav.tabs details[open]').count(), 0);
      await toggle.focus(); await page.keyboard.press('Enter');
      const panel = page.locator('nav.tabs details[open] .nav-mega-panel');
      const box = await panel.boundingBox();
      assert.ok(box && box.width > 250 && box.x >= 0 && box.x + box.width <= width + 1);
      const target = panel.locator('.nav-mega-links a').last();
      const href = await target.getAttribute('href');
      await target.click();
      await page.waitForURL(new URL(href, local.url).href);
      await page.goto(local.url);
      if (width <= 1100) await page.locator('.school-menu-toggle').click();
      await page.locator('.school-nav-label').filter({ hasText: new RegExp('^' + label + '$') }).click();
      const destination = {info:'/info/?tab=profil',perkhidmatan:'/hub/'}[key] || '/' + key + '/';
      await page.waitForURL(new URL(destination, local.url).href);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
      await page.goto(local.url + '/menu/?bahagian=' + key);
      await page.waitForURL(new URL(destination, local.url).href);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: all 6 menu groups at 4 widths; click/open/close, keyboard, submenu destination, clickable parent landing page, SVG/layout and overview routes. Real headed Chrome.');
} finally { await browser.close(); local.server.close(); }
