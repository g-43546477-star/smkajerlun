import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';
import { projectFiles } from './project-files.mjs';

assert.ok((await projectFiles('.html')).includes('index.html'), 'Build checks must discover pages inside an isolated release directory.');

const local = process.env.BASE_URL ? null : await startStaticServer();
const base = process.env.BASE_URL || local.url;
const browser = await chromium.launch({ channel: 'chrome', headless: false });
try {
  await fs.mkdir('outputs/design-20260927', { recursive: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Interface checks never submit records to production.
  await context.route('**/*.supabase.co/**', route =>
    ['POST', 'PATCH', 'PUT', 'DELETE'].includes(route.request().method()) ? route.abort() : route.continue());
  const routes = ['/', '/info/', '/akademik/', '/hem/', '/kokurikulum/', '/asrama/', '/program/', '/hub/', '/perkhidmatan/direktori/', '/perkhidmatan/muat-turun/', '/perkhidmatan/klinik/', '/pss/', '/pss/digital/katalog/', '/pss/digital/nilam/', '/tempahan/', '/tempahan/jadual/', '/log-masuk/', '/admin/', '/pss/admin/', '/tempahan/admin/'];
  for (const width of [320, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${route}: overflow at ${width}`);
      assert.equal(await page.locator('link[href^="/assets/interface.css"]').count(), 1, route);
      if (route === '/program/' && width !== 820) await page.screenshot({ path: `outputs/design-20260927/program-${width}.png` });
    }
  }
  for (const [route, mount] of [['/perkhidmatan/direktori/', '#directory-list'], ['/perkhidmatan/muat-turun/', '#resource-list']]) {
    await page.goto(base + route);
    await page.locator(mount).waitFor({ state: 'visible' });
    assert.equal(await page.locator('#solat-title,#widget-aktiviti').count(), 0);
  }
  let unavailable = false;
  await context.route('**/*.supabase.co/**', route => route.fulfill({
    status: unavailable ? 503 : 200,
    json: unavailable ? { message: 'Unavailable' } : []
  }));
  await page.goto(base + '/info/?tab=takwim');
  await page.waitForFunction(() => document.getElementById('info-current-page').textContent === 'Takwim');
  await page.getByRole('tab', { name: 'Hubungi', exact: true }).click();
  assert.equal(await page.locator('#info-current-page').innerText(), 'Hubungi');
  await page.goto(base + '/info/?tab=%22%5D');
  assert.equal(await page.locator('#info-current-page').innerText(), 'Profil', 'Unknown tab must keep the default breadcrumb.');

  const article = { slug: 'semakan-reka-bentuk', tajuk: 'Semakan reka bentuk <contoh>', tarikh: '2026-09-27', kategori: 'sekolah', penerangan: 'Kandungan ujian paparan.', kandungan: 'Perenggan ujian.', image_url: '/assets/hero-sekolah.jpg', galeri: [{ url: '/assets/logo-sekolah.png', alt: 'Imej menegak' }, { url: '/assets/hero-sekolah.jpg', caption: 'Imej melintang' }, { url: 'javascript:alert(1)' }, { url: '' }, null] };
  await context.route('**/rest/v1/achievement*', route => route.fulfill({ json: new URL(route.request().url()).searchParams.has('slug') ? article : [article, article, article] }));
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + '/program/');
    await page.locator('#program-list .achievement-card').first().waitFor();
    assert.equal(await page.locator('.program-intro').count(), 0, 'No repeated program introduction.');
    const layout = await page.locator('#program-list .achievement-card').evaluateAll(cards => cards.map(card => { const box = card.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width }; }));
    assert.ok(layout[1].y > layout[0].y, 'Latest article must lead the grid.');
    if (width > 700) assert.ok(layout[0].width > layout[1].width * 1.9, 'Featured article spans the grid.');
    assert.equal(await page.locator('#program-list img').first().evaluate(img => getComputedStyle(img).objectFit), 'contain', 'Poster text stays visible.');
    await page.locator('#program-list .achievement-card').first().click();
    await page.locator('#achievement-article').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#program-current-page').innerText(), article.tajuk);
    assert.equal(await page.locator('#program-heading').isVisible(), false);
    assert.equal(await page.locator('#achievement-gallery-grid a').count(), 2, 'Only safe, nonempty image links are shown.');
    assert.equal(await page.locator('#achievement-image-link').getAttribute('href'), base + article.image_url);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Article overflow');
    await page.getByRole('link', { name: 'Lihat gambar penuh 1: Imej menegak', exact: true }).click();
    await page.waitForURL(base + '/assets/logo-sekolah.png');
    await page.goBack();
    await page.locator('#program-breadcrumb-overview').click();
    await page.waitForURL(base + '/program/');
  }
  await context.unroute('**/rest/v1/achievement*');
  await page.goto(base + '/carian/');
  await page.locator('#site-search').fill('takwim');
  await page.waitForFunction(() => document.getElementById('search-count').textContent.includes('1 hasil'));
  assert.ok(await page.getByRole('link', { name: 'Buka Takwim sekolah', exact: true }).isVisible());
  await page.locator('#site-search').fill('zzzzzzzzz');
  await page.waitForFunction(() => document.getElementById('search-count').textContent.includes('0 hasil'));
  assert.match(await page.locator('#search-results').innerText(), /Cuba kata yang lebih ringkas/);
  unavailable = true;
  await page.locator('#site-search').fill('takwim');
  await page.waitForFunction(() => document.getElementById('search-count').textContent.includes('belum dapat dimuatkan'));
  assert.ok(await page.getByRole('link', { name: 'Buka Takwim sekolah', exact: true }).isVisible());
  await page.locator('#site-search').fill('x');
  await page.waitForFunction(() => document.getElementById('search-count').textContent === '');
  assert.match(await page.locator('#search-results').innerText(), /dua huruf/);
  assert.deepEqual(errors, []);
  console.log('PASS: 20 routes × 3 widths, Info breadcrumbs, featured program layout, safe full-size images, article return navigation, services and search states. Headed Chrome; no live writes.');
} finally {
  await browser.close();
  local?.server.close();
}
