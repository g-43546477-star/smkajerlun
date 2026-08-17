import fs from 'node:fs';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';

const local = !process.env.BASE_URL;
const serverInfo = local ? await startStaticServer() : null;
const base = process.env.BASE_URL || serverInfo.url;
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const launchOptions = fs.existsSync(chromePath) ? { executablePath: chromePath } : {};
const routes = ['/', '/pss/', '/pss/digital/katalog/', '/pss/pinjaman/', '/pss/admin/', '/tempahan/', '/tempahan/senarai/', '/tempahan/admin/', '/klinik/', '/kokurikulum/', '/info/?tab=profil', '/carian/'];
const failures = [];
const browser = await chromium.launch(launchOptions);

async function visit(page, route) {
  const errors = [];
  const supabaseRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('request', (request) => {
    if (request.url().includes('/rest/v1/')) supabaseRequests.push(request.url());
  });
  const response = await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(700);
  const result = await page.evaluate(() => ({
    h1: document.querySelectorAll('h1').length,
    overflow: document.documentElement.scrollWidth > innerWidth + 2,
    title: document.title
  }));
  if (!response || response.status() >= 400) failures.push(`${route}: HTTP ${response?.status()}`);
  if (!result.h1) failures.push(`${route}: missing h1`);
  if (result.overflow) failures.push(`${route}: horizontal overflow`);
  if (errors.length) failures.push(`${route}: ${errors.slice(0, 2).join(' | ')}`);
  if (route === '/tempahan/senarai/' && !supabaseRequests.some((url) => url.includes('/rest/v1/tempahan_awam'))) {
    failures.push(`${route}: anonymous list did not query tempahan_awam`);
  }
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  for (const route of routes) {
    const page = await context.newPage();
    await visit(page, route);
    if (route === '/' && viewport.name === 'desktop') {
      const dropdown = page.locator('nav.tabs details').first();
      await dropdown.hover();
      await page.waitForTimeout(220);
      if (!(await dropdown.evaluate((node) => node.hasAttribute('open')))) failures.push('website desktop: hover menu did not open');
      await page.mouse.click(30, 30);
      await page.waitForTimeout(120);
      if (await dropdown.evaluate((node) => node.hasAttribute('open'))) failures.push('website desktop: outside click did not close menu');
    }
    if (route === '/pss/' && viewport.name === 'mobile') {
      const toggle = page.locator('.menu-toggle').first();
      await toggle.focus();
      await page.keyboard.press('Enter');
      if ((await toggle.getAttribute('aria-expanded')) !== 'true') failures.push('PSS mobile: keyboard menu did not open');
    }
    await page.close();
  }
  await context.close();
}

const printContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const printPage = await printContext.newPage();
await printPage.goto(`${base}/pss/pinjaman/`, { waitUntil: 'domcontentloaded' });
await printPage.evaluate(() => {
  const receipt = document.querySelector('#loan-receipt');
  receipt.hidden = false;
  document.querySelector('#receipt-ref').textContent = 'No. rujukan: SMOKE-TEST';
  document.querySelector('#receipt-details').innerHTML = '<dt>Nama</dt><dd>Ujian Automatik</dd>';
});
await printPage.emulateMedia({ media: 'print' });
const pdf = await printPage.pdf({ format: 'A4', printBackground: true });
if (pdf.length < 5000) failures.push(`print/PDF: output terlalu kecil (${pdf.length} bytes)`);
await printContext.close();
await browser.close();
if (serverInfo) serverInfo.server.close();
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Playwright smoke passed: ${routes.length * 2} route/view checks + keyboard/hover/print/PDF`);
