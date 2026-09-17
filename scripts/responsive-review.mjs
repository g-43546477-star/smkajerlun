import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';

// Check every local route in real Chrome. No forms are submitted.
const roots = fs.readdirSync('.', { recursive: true }).filter(p => p.endsWith('.html') && !p.startsWith('node_modules/') && !p.startsWith('outputs/') && !p.startsWith('docs/') && !p.startsWith('.'));
const selected = process.env.REVIEW_ROUTES?.split(',');
const routes = roots.map(p => '/' + p.replace(/index\.html$/, '')).filter(route => !selected || selected.includes(route));
const widths = (process.env.REVIEW_WIDTHS || '320,390,768,820,1024,1366,1920').split(',').map(Number);
const label = process.env.REVIEW_LABEL || 'current';
const out = 'outputs/responsive';
fs.mkdirSync(out, { recursive: true });
const server = await startStaticServer();
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const results = [];
try {
  const page = await browser.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of widths) {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 });
    for (const route of routes) {
      const errors = [];
      const onError = e => errors.push(e.message);
      page.on('pageerror', onError);
      await page.goto(server.url + route, { waitUntil: 'load' });
      await page.waitForTimeout(180);
      const state = await page.evaluate(() => {
        const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
        const name = e => e.id || e.className?.toString().slice(0, 90) || e.tagName;
        const elements = [...document.querySelectorAll('body *')].filter(visible);
        return {
          overflow: document.documentElement.scrollWidth > innerWidth + 2,
          offenders: elements.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 2 || r.left < -2) && !e.closest('[class*=scroll],.tablewrap,.table-scroll,.org-chart,.subnav,.pss-dropdown'); }).slice(0, 12).map(name),
          smallInputs: elements.filter(e => e.matches('input:not([type=checkbox]):not([type=radio]),select,textarea') && parseFloat(getComputedStyle(e).fontSize) < 16).map(name),
          smallButtons: elements.filter(e => e.matches('button,summary,input[type=submit]') && (e.getBoundingClientRect().height < 40 || e.getBoundingClientRect().width < 40)).slice(0, 12).map(name)
        };
      });
      results.push({ route, width, finalPath: new URL(page.url()).pathname, ...state, errors });
      page.off('pageerror', onError);
    }
    console.log('Reviewed', routes.length, 'routes at', width);
    fs.writeFileSync(path.join(out, label + '.json'), JSON.stringify(results, null, 2));
  }
} finally { await browser.close(); server.server.close(); }
const failures = results.filter(r => r.overflow || r.smallInputs.length || r.smallButtons.length || r.errors.length);
console.log(JSON.stringify({ routes: routes.length, widths, failures }, null, 2));
if (failures.length) process.exitCode = 1;
