import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';

function pages(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? pages(file) : entry.name === 'index.html' ? [file] : [];
  });
}
const routes = pages('pss').map(file => '/' + file.replace(/index\.html$/, ''));
const server = await startStaticServer();
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const failures = [];
const page = await browser.newPage();
page.on('pageerror', error => failures.push(error.message));
const screenshotDir = process.env.PSS_SCREENSHOTS_DIR;
if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });
try {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    for (const route of routes) {
      await page.goto(server.url + route, { waitUntil: 'load' });
      await page.waitForTimeout(450);
      const state = await page.evaluate(async () => {
        const images = [...document.querySelectorAll('.pss-section-art,.pss-detail-art,.pss-admin-art,.pss-access-art')];
        const visibleImages = images.filter(image => image.getClientRects().length);
        const loaded = await Promise.all(visibleImages.map(image => image.decode().then(() => true, () => false)));
        return {
          overflow: document.documentElement.scrollWidth > innerWidth + 2,
          brokenArt: loaded.includes(false),
          title: document.title,
          styled: Boolean(document.querySelector('.pss-interior,.pss-reading-room,.pss-admin-design'))
        };
      });
      if (state.overflow || state.brokenArt || !state.styled) failures.push(`${route} at ${width}: ${JSON.stringify(state)}`);
      if (screenshotDir && width !== 320 && ['/pss/maklumat/', '/pss/rak-buku-maya/', '/pss/program/pengumuman/', '/pss/perkhidmatan/borang-pinjaman/', '/pss/submenu/', '/pss/admin/'].includes(route)) {
        await page.screenshot({ path: path.join(screenshotDir, route.replaceAll('/', '-') + width + '.png'), fullPage: true, animations: 'disabled' });
      }
    }
  }
  await page.goto(server.url + '/pss/tentang-pss/jawatankuasa-guru/');
  await page.locator('[data-pss-tab="guru"]').focus();
  await page.keyboard.press('ArrowRight');
  if (!await page.locator('#pelajar').isVisible()) failures.push('Organization keyboard tab switch failed');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const animation = await page.locator('#pelajar .org-level').first().evaluate(element => getComputedStyle(element).animationName);
  if (animation !== 'none') failures.push('Reduced motion did not disable organization animation');
  await page.goto(server.url + '/pss/rak-buku-maya/');
  if (await page.locator('.virtual-book').count() !== 12) failures.push('Shelf initial page size is not 12');
  await page.locator('#virtual-shelf-more').click();
  if (await page.locator('.virtual-book').count() !== 24) failures.push('Shelf load more failed');
  await page.locator('#virtual-book-search').fill('zz-no-matching-title');
  if (!await page.locator('.pss-shelf-empty').isVisible()) failures.push('Shelf empty state missing');
  await page.locator('#virtual-book-search').fill('');
  await page.locator('.virtual-shelf-filter[data-category="Sejarah"]').click();
  if (!await page.locator('.virtual-book').count()) failures.push('History shelf filter returned no books');
  if (await page.locator('.virtual-book:not([data-category="Sejarah"])').count()) failures.push('Shelf filter includes another category');
  await page.goto(server.url + '/pss/digital/katalog/?cari=Sejarah');
  if (await page.locator('#book-search').inputValue() !== 'Sejarah') failures.push('Catalog query lost');
  await page.goto(server.url + '/pss/perkhidmatan/borang-pinjaman/');
  if (await page.locator('#loan-form').evaluate(form => form.checkValidity())) failures.push('Empty loan form accepted');
  await page.goto(server.url + '/pss/perkhidmatan/cadangan-buku/');
  if (await page.locator('#suggestion-form').evaluate(form => form.checkValidity())) failures.push('Empty suggestion form accepted');
  await page.goto(server.url + '/pss/');
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await page.locator('#pss-aktiviti-tarikh').evaluate(element => { element.innerHTML = '30<br><small>September</small>'; });
    const overlap = await page.locator('.pss-brief article').first().evaluate(article => {
      const a = article.querySelector('time').getBoundingClientRect();
      const b = article.querySelector('div').getBoundingClientRect();
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    });
    if (overlap) failures.push(`Date overlaps article at ${width}`);
  }
} finally {
  await browser.close();
  server.server.close();
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`PSS design smoke passed: ${routes.length} routes x 3 widths; keyboard tabs, reduced motion, shelf filter, catalog query, required forms and long dates. Real Chrome; no form submissions.`);
}
