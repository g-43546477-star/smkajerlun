import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';
const server = await startStaticServer();
const browser = await chromium.launch({ channel: 'chrome', headless: false });
fs.mkdirSync('outputs/pss-visitors', { recursive: true });
try {
  const page = await browser.newPage();
  // Serve the local site on a test hostname, with only analytics replaced by fixtures.
  await page.route('http://pss.test/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, body: '{}' });
    const response = await fetch(server.url + url.pathname + url.search);
    return route.fulfill({ status: response.status, contentType: response.headers.get('content-type'), body: Buffer.from(await response.arrayBuffer()) });
  });
  await page.goto('http://pss.test/pss/');
  await assert.doesNotReject(() => page.getByText('Statistik pelawat belum tersedia.', { exact: false }).waitFor());
  let postCount = 0;
  const data = { today: 12, total: 140, daily: Array.from({ length: 7 }, (_, i) => ({ day: '2026-09-' + String(i + 4).padStart(2, '0'), visitors: i * 2 })), countries: [{ country: 'MY', visitors: 32 }, { country: 'SG', visitors: 10 }, { country: 'ZZ', visitors: 1 }] };
  await page.route('http://pss.test/api/pss-visitors', route => {
    if (route.request().method() === 'POST') { postCount++; return route.fulfill({ status: 204 }); }
    return route.fulfill({ json: data });
  });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('http://pss.test/pss/');
    await page.locator('#visitor-today').filter({ hasText: '12' }).waitFor();
    assert.equal(await page.locator('.pss-visitor-details').getAttribute('open'), null);
    await page.locator('.pss-visitor-details summary').click();
    assert.equal(await page.locator('#visitor-chart rect').count(), 7);
    assert.match(await page.locator('#visitor-countries').innerText(), /Malaysia/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('#pss-visitors').screenshot({ path: 'outputs/pss-visitors/fixture-' + width + '.png' });
  }
  data.today = 0; data.total = 0; data.countries = []; data.daily.forEach(d => d.visitors = 0);
  await page.reload();
  await page.locator('.pss-visitor-details summary').click();
  await page.getByText('Belum ada lawatan direkodkan.').waitFor();
  assert.equal(await page.locator('#visitor-chart rect[height="0"]').count(), 7);
  const before = postCount;
  await page.goto('http://pss.test/pss/admin/');
  assert.equal(postCount, before);
  await page.goto(server.url + '/pss/');
  await page.getByText('Pratonton lokal', { exact: false }).waitFor();
  await page.locator('#pss-visitors').screenshot({ path: 'outputs/pss-visitors/local.png' });
  console.log('PASS: headed Chrome desktop/mobile, chart/countries, empty/error/local states, admin exclusion.');
} finally {
  await browser.close();
  await new Promise(resolve => server.server.close(resolve));
}
