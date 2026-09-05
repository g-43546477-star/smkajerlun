import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';
const server = await startStaticServer();
const browser = await chromium.launch({ headless: false, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(server.url);
  assert.match(await page.locator('#hero-title').innerText(), /Adab Dulu\s+Baru Ilmu/);
  assert.equal(await page.locator('#ajer-calendar, #ajer-prayers, #ajer-favourites').count(), 0);
  await page.goto(server.url + '/hub/');
  await page.locator('#ajer-calendar-events article').first().waitFor();
  await page.getByRole('button', { name: 'Ibu bapa', exact: true }).click();
  assert.equal(await page.locator('#audience-links a[href="/perkhidmatan/muat-turun/"]').count(), 1);
  const currentMonth = await page.locator('#ajer-month').innerText();
  await page.locator('#ajer-next').click();
  assert.notEqual(await page.locator('#ajer-month').innerText(), currentMonth);
  await page.locator('#ajer-prev').click();
  assert.equal(await page.locator('#ajer-month').innerText(), currentMonth);
  await page.locator('#ajer-category').selectOption('cuti');
  await page.locator('#ajer-calendar-grid .has-event').first().click();
  assert.equal(await page.locator('#ajer-calendar-grid [aria-pressed="true"]').count(), 1);
  assert.ok(await page.locator('#ajer-calendar-events article').count());
  await page.locator('#ajer-edit-favourites').click();
  const first = page.locator('#ajer-favourite-options input').first();
  await first.uncheck();
  await page.reload();
  await page.locator('#ajer-edit-favourites').click();
  assert.equal(await page.locator('#ajer-favourite-options input').first().isChecked(), false);
  await page.locator('#site-search').fill('takwim');
  await page.locator('#search-results .portal-row, #search-results .portal-empty').first().waitFor();
  await page.goto(server.url + '/info/?tab=warga');
  await page.locator('#staff-khas .staff-card').first().waitFor();
  await page.locator('.ajer-staff-filter input').fill('zzzz-no-match');
  assert.equal(await page.locator('#staff-khas .staff-card:visible, #staff-guru .item:visible, #staff-akp .item:visible').count(), 0);
  await page.locator('.ajer-staff-filter input').fill('');
  assert.ok(await page.locator('#staff-khas .staff-card:visible').count());
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/hub/', '/menu/?bahagian=akademik', '/info/?tab=profil', '/info/?tab=warga', '/akademik/', '/kokurikulum/', '/asrama/', '/pss/', '/tempahan/']) {
      await page.goto(server.url + route);
      await page.waitForTimeout(350);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false, `${route} overflow at ${width}`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(server.url);
  await page.locator('.school-menu-toggle').click();
  assert.equal(await page.locator('nav.tabs').isVisible(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('nav.tabs').isVisible(), false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.ajer-hero-copy').evaluate(el => getComputedStyle(el).animationName), 'none');
  // Explicitly simulated outage verifies a readable fallback, without changing live data.
  await page.route('**/rest/v1/takwim*', route => route.fulfill({ status: 503, body: '{}' }));
  await page.goto(server.url + '/hub/');
  await page.locator('#ajer-calendar-events button').waitFor();
  assert.match(await page.locator('#ajer-calendar-events').innerText(), /Cuba lagi/);
  assert.deepEqual(errors, []);
  console.log('PASS: audience, calendar navigation/filter/day, persisted favourites, search, staff filter, 30 responsive route checks, mobile menu, reduced motion and simulated outage. Real headed Google Chrome.');
} finally { await browser.close(); server.server.close(); }
