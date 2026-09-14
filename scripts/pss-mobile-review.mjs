import fs from 'node:fs';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';
const routes = fs.readdirSync('pss', { recursive: true }).filter(f => f.endsWith('index.html')).map(f => '/pss/' + f.replace(/index\.html$/, ''));
const server = await startStaticServer();
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const failures = [];
fs.mkdirSync('outputs/pss-mobile', { recursive: true });
try {
  const page = await browser.newPage();
  for (const width of [360, 430, 768]) {
    await page.setViewportSize({ width, height: 740 });
    for (const route of routes) {
      await page.goto(server.url + route);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const state = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 2,
        smallInputs: [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]),select,textarea')].filter(e => e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.id)
      }));
      if (state.overflow || state.smallInputs.length) failures.push({ route, width, ...state });
      const menu = page.locator('.menu-toggle');
      if (await menu.isVisible()) {
        await menu.focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') === 'true');
        const group = page.locator('.pss-dropdown summary').last();
        await group.focus();
        await page.keyboard.press('Enter');
        await page.locator('.pss-links .back-link').scrollIntoViewIfNeeded();
        const fits = await page.locator('.pss-links .back-link').evaluate(e => { const r=e.getBoundingClientRect(); const dock=document.querySelector('.pss-mobile-dock'); const bottom=dock.getClientRects().length ? dock.getBoundingClientRect().top : innerHeight; return r.bottom <= bottom && r.top >= 0; });
        if (!fits) failures.push({ route, width, menuObscured: true });
        await page.keyboard.press('Escape');
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/pss/', '/pss/digital/katalog/', '/pss/jaringan-perpustakaan/', '/pss/program/kalendar/', '/pss/perkhidmatan/borang-pinjaman/']) {
    await page.goto(server.url + route);
    await page.waitForTimeout(1400);
    await page.screenshot({path:'outputs/pss-mobile/' + route.replaceAll('/','-') + 'final.png',fullPage:true});
  }
} finally { await browser.close(); server.server.close(); }
console.log(JSON.stringify({ routes: routes.length, widths: [360,430,768], failures }, null, 2));
if(failures.length) process.exitCode=1;
