import fs from 'node:fs';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';

const local = !process.env.BASE_URL;
const serverInfo = local ? await startStaticServer() : null;
const base = process.env.BASE_URL || serverInfo.url;
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const launchOptions = {
  headless: process.env.E2E_HEADLESS !== '0',
  ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : {})
};
const routes = ['/', '/program/', '/program/?slug=smka-jerlun-anjur-karnival-maulidur-rasul-generasi-madani-1448h', '/berita/?slug=smka-jerlun-anjur-karnival-maulidur-rasul-generasi-madani-1448h', '/kokurikulum/pencapaian/drone-edu-challenge-ir4/', '/kokurikulum/pencapaian/pidato-generasi-madani-2026/', '/pss/', '/pss/tentang-pss/pengawas-pss/', '/pss/program/kalendar/', '/pss/program/pengumuman/', '/pss/digital/katalog/', '/pss/digital/nilam/', '/pss/nilam/', '/pss/digital/iq-nilam/', '/pss/pinjaman/', '/pss/organisasi/', '/perkhidmatan/portal-pss/', '/pss/admin/', '/tempahan/', '/tempahan/senarai/', '/tempahan/admin/', '/perkhidmatan/tempahan-bilik/', '/perkhidmatan/klinik/', '/kokurikulum/', '/info/?tab=profil', '/info-sekolah/profil-sekolah/', '/info-sekolah/lagu-sekolah/', '/info-sekolah/pengurusan/', '/info-sekolah/warga-sekolah/', '/info-sekolah/takwim/', '/profil/', '/carian/'];
const legacyRedirects = new Map([
  ['/perkhidmatan/portal-pss/', '/pss/'],
  ['/perkhidmatan/tempahan-bilik/', '/tempahan/'],
  ['/pss/katalog/', '/pss/digital/katalog/'],
  ['/pss/pinjaman/', '/pss/perkhidmatan/borang-pinjaman/'],
  ['/pss/organisasi/', '/pss/tentang-pss/jawatankuasa-guru/'],
  ['/pss/nilam/', '/pss/digital/nilam/'],
  ['/pss/digital/iq-nilam/', '/pss/digital/nilam/'],
  ['/info-sekolah/profil-sekolah/', '/info/?tab=profil'],
  ['/info-sekolah/lagu-sekolah/', '/info/?tab=lagu'],
  ['/info-sekolah/pengurusan/', '/info/?tab=pengurusan'],
  ['/info-sekolah/warga-sekolah/', '/info/?tab=warga'],
  ['/info-sekolah/takwim/', '/info/?tab=takwim'],
  ['/profil/', '/info/?tab=profil']
]);
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
  const asyncMounts = {
    '/': '#home-program-list .achievement-card, #home-program-list .achievement-empty',
    '/program/': '#program-list .achievement-card, #program-list .achievement-empty',
    '/pss/digital/katalog/': '#book-list .catalog-book-card, #book-list .catalog-empty'
  };
  if (asyncMounts[route]) {
    await page.locator(asyncMounts[route]).first().waitFor({ state: 'attached', timeout: 6000 }).catch(() => {});
  }
  const result = await page.evaluate(() => ({
    h1: document.querySelectorAll('h1').length,
    overflow: document.documentElement.scrollWidth > innerWidth + 2,
    title: document.title
  }));
  if (!response || response.status() >= 400) failures.push(`${route}: HTTP ${response?.status()}`);
  const expectedRedirect = legacyRedirects.get(route);
  if (expectedRedirect) {
    const actualUrl = new URL(page.url());
    const expectedUrl = new URL(expectedRedirect, base);
    if (actualUrl.pathname !== expectedUrl.pathname || actualUrl.search !== expectedUrl.search) {
      failures.push(`${route}: did not resolve to ${expectedRedirect} (got ${actualUrl.pathname}${actualUrl.search})`);
    }
  }
  if (!result.h1) failures.push(`${route}: missing h1`);
  if (result.overflow) failures.push(`${route}: horizontal overflow`);
  if (errors.length) failures.push(`${route}: ${errors.slice(0, 2).join(' | ')}`);
  if (route === '/tempahan/senarai/' && supabaseRequests.some((url) => url.includes('/rest/v1/tempahan_awam'))) {
    failures.push(`${route}: anonymous list queried private booking details`);
  }
  if (route === '/perkhidmatan/klinik/' && !await page.locator('#clinic-access-title').count()) {
    failures.push(`${route}: clinic route is missing kiosk state markup`);
  }
  if (route === '/') {
    const homepageMarkup = await page.evaluate(() => ({
      hero: Boolean(document.querySelector('.ios-hero[aria-labelledby="hero-title"]')),
      heroTitle: document.querySelector('#hero-title')?.textContent.includes('Selamat datang ke'),
      heroImage: getComputedStyle(document.querySelector('.ios-hero')).backgroundImage.includes('hero-sekolah.jpg'),
      alertStrip: Boolean(document.querySelector('#home-alert-strip')),
      serviceDock: Boolean(document.querySelector('.ios-service-dock')),
      program: document.querySelector('#home-program-list .achievement-card')?.textContent.includes('Karnival Maulidur Rasul') || false,
      announcementMoved: !document.querySelector('#notis-list')?.textContent.includes('Drone Edu Challenge'),
      announcementWhiteSpace: (() => {
        const item = document.createElement('div');
        item.className = 'notis-item';
        const paragraph = document.createElement('p');
        item.appendChild(paragraph);
        document.body.appendChild(item);
        const value = getComputedStyle(paragraph).whiteSpace;
        item.remove();
        return value;
      })()
    }));
    if (!homepageMarkup.hero) failures.push(`${route}: school hero markup is missing`);
    if (!homepageMarkup.heroTitle) failures.push(`${route}: school welcome wording is missing`);
    if (!homepageMarkup.heroImage) failures.push(`${route}: school aerial hero image is missing`);
    if (!homepageMarkup.alertStrip) failures.push(`${route}: announcement alert strip is missing`);
    if (!homepageMarkup.serviceDock) failures.push(`${route}: service dock is missing`);
    if (!homepageMarkup.program) failures.push(`${route}: school program highlight is missing`);
    if (!homepageMarkup.announcementMoved) failures.push(`${route}: achievement still appears as a general announcement`);
    if (homepageMarkup.announcementWhiteSpace !== 'pre-line') failures.push(`${route}: announcement line breaks are not preserved`);
  }
  if (route === '/kokurikulum/' && (await page.locator('#koku-pencapaian, #koku-achievement-list').count() || await page.locator('nav.tabs details').filter({ hasText: 'Pencapaian' }).count())) {
    failures.push(`${route}: retired Pencapaian section or submenu is still present`);
  }
  if (route === '/program/?slug=smka-jerlun-anjur-karnival-maulidur-rasul-generasi-madani-1448h') await page.locator('#achievement-article:not([hidden])').waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
  if (route === '/program/?slug=smka-jerlun-anjur-karnival-maulidur-rasul-generasi-madani-1448h' && (!await page.locator('#achievement-title').count() || !(await page.locator('#achievement-title').textContent()).includes('Karnival Maulidur Rasul') || (await page.locator('#achievement-gallery-grid img').count()) !== 6)) {
    failures.push(`${route}: program article or gallery is incomplete`);
  }
  if (route.startsWith('/berita/') || route.startsWith('/kokurikulum/pencapaian/')) {
    if (!page.url().includes('/program/?slug=')) failures.push(`${route}: legacy article route did not redirect to Program Sekolah`);
  }
  if (route === '/pss/digital/katalog/') {
    const duplicateFilters = await page.evaluate(() => ['book-category', 'book-status'].flatMap((id) => {
      const values = [...document.querySelectorAll(`#${id} option`)].slice(1).map((option) => option.textContent.trim().toLocaleLowerCase('ms-MY'));
      return new Set(values).size === values.length ? [] : [id];
    }));
    if (duplicateFilters.length) failures.push(`${route}: duplicate filter options (${duplicateFilters.join(', ')})`);
    const catalogLayout = await page.evaluate(() => ({
      cards: document.querySelectorAll('#book-list .catalog-book-card').length,
      columns: getComputedStyle(document.querySelector('#book-list')).gridTemplateColumns.split(' ').length
    }));
    if (catalogLayout.cards > 10) failures.push(`${route}: more than 10 book cards displayed (${catalogLayout.cards})`);
    if (catalogLayout.columns !== 5 && page.viewportSize().width >= 1101) failures.push(`${route}: catalog is not five columns on desktop (${catalogLayout.columns})`);
    const statusAlignment = await page.evaluate(() => {
      const rows = new Map();
      document.querySelectorAll('#book-list .catalog-book-card').forEach((card) => {
        const badge = card.querySelector('.catalog-book-status');
        if (!badge) return;
        const top = Math.round(card.getBoundingClientRect().top);
        const bottom = Math.round(badge.getBoundingClientRect().bottom);
        const row = rows.get(top) || [];
        row.push(bottom);
        rows.set(top, row);
      });
      return Math.max(0, ...[...rows.values()].map((bottoms) => Math.max(...bottoms) - Math.min(...bottoms)));
    });
    if (statusAlignment > 3 && page.viewportSize().width >= 1101) failures.push(`${route}: status badges are misaligned (${statusAlignment}px)`);
    const pagination = page.locator('#book-pagination');
    if (await pagination.isVisible()) {
      const initialPage = await page.locator('#book-page').textContent();
      await page.locator('#book-next').click();
      if ((await page.locator('#book-page').textContent()) === initialPage) failures.push(`${route}: next page control did not update catalog`);
      await page.locator('#book-previous').click();
      if ((await page.locator('#book-page').textContent()) !== initialPage) failures.push(`${route}: previous page control did not restore catalog`);
    }
  }
  if (route === '/pss/program/kalendar/' && (!await page.locator('#pss-calendar-grid').count() || !await page.locator('#pss-calendar-list').count())) {
    failures.push(`${route}: calendar markup is missing`);
  }
  if (route === '/pss/program/pengumuman/' && (!await page.locator('#notis-list').count() || !(await page.locator('h1').textContent()).includes('Pengumuman PSS'))) {
    failures.push(`${route}: announcement page markup is missing`);
  }
  if (route === '/pss/tentang-pss/pengawas-pss/') {
    const rosterText = await page.locator('#pelajar').textContent();
    const requiredNames = ["Nur I'rdina Wilda binti Fauodzi", 'Ahmadinejad bin Khairul Anuar', "Nur Ali'yah Nafeesah binti Mohamad Najid", 'Ahmad Hasani bin Mohd Nazir', 'Aisyah Dhia Amani binti Khairul Nizam', 'Aina Afifah binti Harun', 'Muhammad Faiz Danial bin Muhammad Fakhrurazi'];
    if (requiredNames.some((name) => !rosterText.includes(name))) failures.push(`${route}: corrected PSS roster details are missing`);
  }
  if (route === '/pss/') {
    if (page.viewportSize().width >= 821) {
      const networkMenu = page.locator('nav.pss-links details').filter({ hasText: 'Jaringan Perpustakaan' });
      await networkMenu.hover();
      await page.waitForTimeout(220);
      if (!(await networkMenu.evaluate((node) => node.hasAttribute('open')))) failures.push(`${route}: library network submenu did not open on hover`);
    }
    const digitalTitles = await page.locator('nav.pss-links details').evaluateAll((menus) => {
      const menu = menus.find((item) => item.querySelector('summary')?.textContent.trim() === 'Digital');
      return menu ? [...menu.querySelectorAll('.pss-mega-links b')].map((title) => title.textContent.trim()) : [];
    });
    if (digitalTitles.length !== 3 || digitalTitles.some((title) => /AINS|iQ-NILAM/i.test(title))) failures.push(`${route}: Digital menu still contains a retired NILAM link`);
    const networkLinks = await page.locator('.pss-links .pss-mega-links a').evaluateAll((links) => links
      .filter((link) => ['AINS NILAM', 'u-Pustaka', 'Perpustakaan Digital Kedah', 'DELIMa', 'Baucar Buku MADANI'].includes(link.querySelector('b')?.textContent.trim()))
      .map((link) => ({ title: link.querySelector('b')?.textContent.trim(), href: link.href, target: link.target, rel: link.rel })));
    const expectedNetwork = ['https://ains.moe.gov.my/', 'https://www.u-pustaka.gov.my/', 'https://opac.kedahlib.gov.my/', 'https://d2.delima.edu.my/', 'https://delima.bookcapital.com.my/'];
    if (networkLinks.length !== 5 || !expectedNetwork.every((href) => networkLinks.some((link) => link.href === href && link.target === '_blank' && link.rel.includes('noopener')))) {
      failures.push(`${route}: library network submenu links are incomplete or unsafe`);
    }
  }
  if (route === '/pss/digital/nilam/' && (!await page.locator('a[href*="ains.moe.gov.my"]').count() || (await page.locator('.nilam-links > a').count()) !== 1)) {
    failures.push(`${route}: AINS NILAM card is missing or duplicated`);
  }
  if (route === '/pss/nilam/' && !page.url().includes('/pss/digital/nilam/')) {
    failures.push(`${route}: legacy NILAM route did not redirect to canonical route`);
  }
  if (route === '/pss/digital/iq-nilam/' && !page.url().includes('/pss/digital/nilam/')) {
    failures.push(`${route}: retired iQ-NILAM route did not redirect to canonical NILAM route`);
  }
  if (route === '/pss/program/kalendar/') {
    const calendarMonth = page.locator('#pss-calendar-month');
    const initialMonth = await calendarMonth.textContent();
    await page.locator('#pss-calendar-next').click();
    const nextMonth = await calendarMonth.textContent();
    if (initialMonth === nextMonth) failures.push(`${route}: next month control did not update calendar`);
    await page.locator('#pss-calendar-previous').click();
    if ((await calendarMonth.textContent()) !== initialMonth) failures.push(`${route}: previous month control did not restore calendar`);
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
      const programLink = page.locator('#home-program-list a.achievement-card').filter({ hasText: 'Karnival Maulidur Rasul' }).first();
      if (await programLink.count()) {
        const href = await programLink.getAttribute('href');
        if (!href?.includes('/program/?slug=smka-jerlun-anjur-karnival-maulidur-rasul-generasi-madani-1448h')) failures.push('website desktop: program card does not link to the Program Sekolah article');
        await programLink.click();
        if (!page.url().includes('/program/?slug=smka-jerlun-anjur-karnival-maulidur-rasul-generasi-madani-1448h')) failures.push('website desktop: program card did not open the article');
      }
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
await printPage.goto(`${base}/pss/perkhidmatan/borang-pinjaman/`, { waitUntil: 'domcontentloaded' });
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
