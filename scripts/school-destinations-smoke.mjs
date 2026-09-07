import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';
const local = await startStaticServer();
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const groups = [
  { route: '/hem/', panels: '#kebajikan,#sahsiah,#selamat,#sokongan', views: ['kebajikan','sahsiah','selamat','sokongan'] },
  { route: '/akademik/', panels: '.academic-calendar-card,.academic-notice-card,#page-content', views: ['academic-calendar','page-content'] },
  { route: '/kokurikulum/', panels: '.koku-column', views: ['koku-uniform-section','koku-persatuan-section','koku-permainan-section'] }
];
try {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const group of groups) {
      const titles = new Set();
      for (const view of group.views) {
        await page.goto(local.url + group.route + '?section=' + view);
        await page.locator('body.school-focused-view').waitFor();
        if (group.route === '/kokurikulum/') await page.locator('.koku-column:visible .kp-list li').first().waitFor();
        const visible = await page.locator(group.panels).evaluateAll(panels => panels.filter(p => p.getClientRects().length).length);
        assert.equal(visible, 1, group.route + view + ' must show exactly one content panel');
        assert.ok(await page.locator('#' + view).isVisible(), view + ' content missing');
        assert.equal(await page.locator('.ajer-content-nav [aria-current="page"]').count(), 1);
        assert.ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)), 'Overflow ' + view + ' at ' + width);
        titles.add(await page.title());
        await page.reload();
        assert.equal(await page.locator('body').getAttribute('data-section'), view, 'Refresh lost destination');
        await page.locator('.school-breadcrumb a').nth(1).click();
        await page.waitForURL(local.url + group.route);
        assert.equal(await page.locator('body.school-focused-view').count(), 0, 'Overview did not restore');
        await page.goBack();
        await page.waitForURL('**?section=' + view);
        assert.equal(await page.locator('body').getAttribute('data-section'), view, 'Back lost destination');
      }
      assert.equal(titles.size, group.views.length, 'Destination titles repeated');
    }
    await page.goto(local.url + '/hem/?section=missing');
    assert.ok(await page.locator('.school-section-status').isVisible());
    assert.equal(await page.locator('#kebajikan,#sahsiah,#selamat,#sokongan').evaluateAll(p => p.filter(e => e.getClientRects().length).length), 4);
    await page.goto(local.url + '/hub/');
    assert.equal(await page.locator('.service-directory-grid>a').count(), 6);
    const urls = await page.locator('.service-directory-grid>a').evaluateAll(links => links.map(a => a.href));
    assert.equal(new Set(urls).size, 6, 'Duplicate service entries');
    assert.equal(await page.locator('.ajer-content-nav,.ajer-audience,.ajer-utilities,.ajer-calendar-section,#resource-list,#directory-list').count(), 0);
    assert.ok(await page.locator('#notis-title').isVisible());
    assert.ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)), 'Service overflow');
  }
  assert.deepEqual(errors, []);
  await fs.mkdir('outputs/refinement', { recursive: true });
  await fs.writeFile('outputs/refinement/destinations-check.txt', 'PASS: 9 distinct submenu views x 3 widths, content isolation, selected navigation, refresh, back, overview, unknown section fallback, six unique service entries. Headed Google Chrome. No page errors.\n');
  console.log('PASS: focused school destinations and compact service directory in headed Chrome.');
} finally { await browser.close(); local.server.close(); }
