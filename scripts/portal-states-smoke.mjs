import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';

const local = process.env.BASE_URL ? null : await startStaticServer();
const base = process.env.BASE_URL || local.url;
const browser = await chromium.launch({ channel: 'chrome', headless: process.env.E2E_HEADLESS !== '0' });
const output = 'output/playwright/portal-states';
await fs.mkdir(output, { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let mode = 'error';
  let searchFixtures = false;
  let releaseBooks;
  let booksRequested;
  let pendingBooks;
  const books = Array.from({ length: 13 }, (_, index) => ({
    tajuk: index < 12 ? `Bacaan Sains ${index + 1}` : 'Bacaan Sejarah',
    pengarang: 'Penulis ujian', kategori: index < 12 ? 'Sains' : 'Sejarah',
    rak: 'A1', status: index === 11 ? 'Dipinjam' : 'Tersedia'
  }));
  // Every API request is intercepted; these fixtures never reach the live database.
  await context.route('**/*.supabase.co/**', async route => {
    if (route.request().method() !== 'GET') return route.abort();
    const table = new URL(route.request().url()).pathname.split('/').pop();
    if (searchFixtures && ['takwim', 'pengumuman'].includes(table)) return route.fulfill({ json: [
      { tajuk: `${table} NILAM PSS`, portal: 'pss' },
      { tajuk: `${table} NILAM sekolah`, portal: 'sekolah' }
    ] });
    if (!['pss_book', 'resource_file', 'nilam_stat'].includes(table)) return route.fulfill({ json: [] });
    if (mode === 'network-error') return route.abort();
    if (mode === 'error') return route.fulfill({ status: 503, json: { message: 'Simulated outage' } });
    if (table === 'pss_book' && mode === 'loading') {
      booksRequested();
      await pendingBooks;
    }
    const data = mode === 'empty' ? [] : table === 'pss_book' ? books : table === 'resource_file' ? [
      { tajuk: 'Borang ujian', kategori: 'umum', penerangan: 'Dokumen ujian lokal', url: '/info/' }
    ] : [];
    return route.fulfill({ json: data });
  });

  await page.goto(base + '/pss/digital/katalog/');
  await page.getByText('Katalog tidak tersedia', { exact: true }).waitFor();
  await page.locator('#book-search').fill('Sains');
  await page.locator('#book-reset').click();
  assert.equal(await page.locator('#book-count').innerText(), 'Katalog tidak dapat dimuatkan');
  assert.equal(await page.locator('#book-total').innerText(), '—');
  assert.equal(await page.locator('#book-pagination').isVisible(), false);
  const retry = page.locator('#book-list .portal-retry');
  await retry.press('Enter');
  await page.waitForFunction(() => document.activeElement?.matches('#book-list .portal-retry'));
  assert.equal(await retry.isEnabled(), true, 'A second failed attempt stays retryable.');
  await page.locator('#book-search').fill('Sains');
  await page.locator('#book-list').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${output}/catalog-error-mobile.png` });

  mode = 'loading';
  pendingBooks = new Promise(resolve => { releaseBooks = resolve; });
  const requested = new Promise(resolve => { booksRequested = resolve; });
  await retry.press('Enter');
  await requested;
  await page.locator('#book-search').fill('Sejarah');
  assert.equal(await page.locator('#book-count').innerText(), 'Memuatkan katalog...');
  assert.equal(await page.locator('#book-list').getAttribute('aria-busy'), 'true');
  assert.equal(await page.locator('#book-total').innerText(), '—');
  mode = 'ready';
  releaseBooks();
  await page.getByRole('heading', { name: 'Bacaan Sejarah', exact: true }).waitFor();
  assert.equal(await page.locator('#book-count').innerText(), '1 judul dipaparkan');
  assert.equal(await page.locator('#book-total').innerText(), '13');
  assert.equal(await page.locator('#book-list').getAttribute('aria-busy'), 'false');
  assert.equal(await page.locator('#book-search').evaluate(el => document.activeElement === el), true, 'Retry must not steal focus while the user types.');

  await page.locator('#book-search').fill('Sains');
  assert.equal(await page.locator('.catalog-book-card').count(), 10);
  await page.locator('#book-next').click();
  assert.equal(await page.locator('.catalog-book-card').count(), 2);
  await page.locator('#book-status').selectOption('Dipinjam');
  assert.equal(await page.locator('.catalog-book-card').count(), 1);
  await page.locator('#book-reset').click();
  assert.equal(await page.locator('.catalog-book-card').count(), 10);
  assert.equal(await page.locator('#book-page').innerText(), 'Halaman 1 daripada 2');
  await page.locator('#book-search').fill('tiadapadanan');
  await page.getByText('Tiada padanan ditemui', { exact: true }).waitFor();

  mode = 'empty';
  await page.reload();
  await page.getByText('Koleksi sedang disusun', { exact: true }).waitFor();
  assert.equal(await page.locator('#book-total').innerText(), '0', 'Only a successful empty response means zero books.');
  assert.equal(await page.locator('#book-list .portal-retry').count(), 0);

  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    mode = 'network-error';
    await page.goto(base + '/perkhidmatan/muat-turun/');
    await page.locator('#resource-list .portal-retry').waitFor();
    assert.match(await page.locator('#resource-list').innerText(), /Maklumat tidak dapat dimuatkan/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    const button = page.locator('#resource-list .portal-retry');
    assert.ok((await button.boundingBox()).height >= 44);
    if (width === 390) await page.screenshot({ path: `${output}/downloads-error-mobile.png`, fullPage: true });
    mode = 'ready';
    await button.press('Enter');
    await page.getByText('Borang ujian', { exact: true }).waitFor();
    assert.equal(await page.locator('#resource-list').getAttribute('aria-busy'), 'false');
    await page.waitForFunction(() => document.activeElement?.id === 'resource-list');
    assert.equal(await page.locator('#resource-list a').getAttribute('href'), base + '/info/');
  }
  mode = 'empty';
  await page.reload();
  await page.getByText('Belum ada maklumat untuk dipaparkan.', { exact: true }).waitFor();
  assert.equal(await page.locator('#resource-list .portal-retry').count(), 0);

  mode = 'network-error';
  await page.goto(base + '/carian/');
  for (const [query, title, href] of [
    ['NILAM', 'NILAM', '/pss/digital/nilam/'],
    ['HEM', 'Hal Ehwal Murid', '/hem/'],
    ['klinik', 'Rekod klinik', '/perkhidmatan/klinik/'],
    ['muat turun', 'Borang dan dokumen', '/perkhidmatan/muat-turun/']
  ]) {
    await page.locator('#site-search').fill(query);
    const link = page.getByRole('link', { name: `Buka ${title}`, exact: true });
    await link.waitFor();
    assert.equal(await link.getAttribute('href'), base + href);
    assert.match(await page.locator('#search-count').innerText(), /Sebahagian maklumat belum dapat dimuatkan/);
  }
  mode = 'empty';
  searchFixtures = true;
  await page.locator('#site-search').fill('NILAM');
  for (const [title, href] of [
    ['takwim NILAM PSS', '/pss/program/kalendar/'],
    ['pengumuman NILAM PSS', '/pss/program/pengumuman/'],
    ['takwim NILAM sekolah', '/info/?tab=takwim'],
    ['pengumuman NILAM sekolah', '/hub/#notis-title']
  ]) {
    const link = page.getByRole('link', { name: `Buka ${title}`, exact: true });
    await link.waitFor();
    assert.equal(await link.getAttribute('href'), base + href);
  }
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const actionContrast = await page.locator('#search-results a').first().evaluate(link => {
      const luminance = color => {
        const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const style = getComputedStyle(link);
      const foreground = luminance(style.color), background = luminance(style.backgroundColor);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    assert.ok(actionContrast >= 4.5, `Search action text needs readable contrast at ${width}px: ${actionContrast}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    if (width === 390) {
      await page.locator('#search-results').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/search-mobile.png` });
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS: catalog loading/error/empty states, retry recovery, retained search, keyboard focus, pagination/status filters, download errors/recovery at 320/390/1440px, static search during API failure, and correct PSS/school search destinations. All APIs mocked; no live writes.');
} finally {
  await browser.close();
  local?.server.close();
}
