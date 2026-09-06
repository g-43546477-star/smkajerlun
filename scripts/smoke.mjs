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
const routes = ['/', '/program/', '/program/?slug=smka-jerlun-anjur-karnival-maulidur-rasul-generasi-madani-1448h', '/program/?slug=pasukan-smk-agama-jerlun-mara-ke-grand-final-cabaran-sains-kebangsaan-2026', '/berita/?slug=smka-jerlun-anjur-karnival-maulidur-rasul-generasi-madani-1448h', '/kokurikulum/pencapaian/drone-edu-challenge-ir4/', '/kokurikulum/pencapaian/pidato-generasi-madani-2026/', '/pss/', '/pss/tentang-pss/pengawas-pss/', '/pss/program/kalendar/', '/pss/program/pengumuman/', '/pss/digital/katalog/', '/pss/digital/nilam/', '/pss/nilam/', '/pss/digital/iq-nilam/', '/pss/pinjaman/', '/pss/organisasi/', '/perkhidmatan/portal-pss/', '/pss/admin/', '/tempahan/', '/tempahan/senarai/', '/tempahan/admin/', '/perkhidmatan/tempahan-bilik/', '/perkhidmatan/klinik/', '/kokurikulum/', '/info/?tab=profil', '/info-sekolah/profil-sekolah/', '/info-sekolah/lagu-sekolah/', '/info-sekolah/pengurusan/', '/info-sekolah/warga-sekolah/', '/info-sekolah/takwim/', '/profil/', '/carian/'];
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
    '/pss/': '#home-nilam-list .pss-nilam-rank, #home-nilam-list .pss-widget-empty',
    '/pss/digital/nilam/': '#nilam-leaderboard-body tr, #nilam-leaderboard-status',
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
      hero: Boolean(document.querySelector('.ajer-hero[aria-labelledby="hero-title"]')),
      heroTitle: document.querySelector('#hero-title')?.textContent.replace(/\s+/g, ' ').includes('Adab Dulu Baru Ilmu'),
      heroImage: Boolean(document.querySelector('.ajer-hero-art img[src="/assets/hero-sekolah.jpg"]')),
      alertStrip: Boolean(document.querySelector('#home-alert-strip')),
      serviceDock: Boolean(document.querySelector('.ajer-entry')),
      program: [...document.querySelectorAll('#home-program-list .achievement-card')].some((card) => card.textContent.includes('Karnival Maulidur Rasul')),
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
    if (!homepageMarkup.heroTitle) failures.push(`${route}: school tagline is missing`);
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
  if (route === '/program/?slug=pasukan-smk-agama-jerlun-mara-ke-grand-final-cabaran-sains-kebangsaan-2026') {
    await page.locator('#achievement-article:not([hidden])').waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
    const articleImageSrc = await page.locator('#achievement-image').getAttribute('src');
    if (!await page.locator('#achievement-title').count() || !(await page.locator('#achievement-title').textContent()).includes('Grand Final Cabaran Sains Kebangsaan') || !(await page.locator('#achievement-prose ul li').count()) || !articleImageSrc?.includes('pasukan-grand-final-cabaran-sains-kebangsaan-2026.png')) {
      failures.push(`${route}: Cabaran Sains article, list or image is incomplete`);
    }
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
  if (route === '/pss/' && !(await page.locator('#home-nilam-list .pss-nilam-rank').count())) {
    failures.push(`${route}: NILAM leaderboard widget is missing student rows`);
  }
  if (route === '/pss/' && (await page.locator('#pss-notis-tajuk').textContent())?.trim() === 'Memuatkan pengumuman PSS…') {
    failures.push(`${route}: announcement preview is stuck in its loading state`);
  }
  if (route === '/pss/') {
    const heroArt = page.locator('.reading-scene img');
    const heroArtLoaded = await heroArt.evaluate((image) => Boolean(image.complete && image.naturalWidth > 0)).catch(() => false);
    if (!(await heroArt.count()) || !heroArtLoaded) {
      failures.push(`${route}: custom PSS hero graphic is missing or failed to load`);
    } else {
      const heroArtLayout = await heroArt.evaluate((image) => ({
        display: getComputedStyle(image).display,
        width: image.getBoundingClientRect().width,
        left: image.getBoundingClientRect().left
      }));
      if (heroArtLayout.display === 'none' || heroArtLayout.width <= 0 || heroArtLayout.left < 0 || heroArtLayout.left + heroArtLayout.width > page.viewportSize().width) {
        failures.push(`${route}: reading room illustration is hidden or extends outside the viewport`);
      }
    }
  }
  if (route === '/pss/') {
    const illustratedCards = await page.locator('.pss-home-card .pss-card-illustration').evaluateAll((images) => images.map((image) => ({
      src: image.getAttribute('src'),
      loaded: image.complete && image.naturalWidth > 0
    })));
    if (illustratedCards.length !== 4 || illustratedCards.some((image) => !image.src?.endsWith('.svg') || !image.loaded)) {
      failures.push(`${route}: PSS card illustration set is missing or failed to load`);
    }
    const illustrationBackgrounds = await page.evaluate(() => [
      ['.pss-weekly-book', 'reading-pick.svg'],
      ['.pss-weekly-activity', 'events.svg'],
      ['.pss-weekly-nilam', 'podium.svg']
    ].map(([selector, asset]) => ({ asset, loaded: getComputedStyle(document.querySelector(selector), '::after').backgroundImage.includes(asset) })));
    if (illustrationBackgrounds.some((illustration) => !illustration.loaded)) {
      failures.push(`${route}: decorative SVG illustration references are incomplete`);
    }
  }
  if (route === '/pss/' && page.viewportSize().width <= 760) {
    const widgetColumns = await page.locator('.pss-home-widgets').evaluate((widget) => getComputedStyle(widget).gridTemplateColumns.trim().split(/\s+/).length);
    if (widgetColumns !== 1) failures.push(`${route}: homepage widgets do not stack on a narrow viewport`);
  }
  if (route === '/pss/digital/nilam/' && (!(await page.locator('#nilam-leaderboard').count()) || !(await page.locator('#nilam-leaderboard-body tr').count()))) {
    failures.push(`${route}: full NILAM leaderboard table is missing student rows`);
  }
  if (route === '/pss/digital/nilam/') {
    const captionBox = await page.locator('.nilam-leaderboard-table caption.sr-only').evaluate((caption) => {
      const box = caption.getBoundingClientRect();
      return { width: box.width, height: box.height };
    });
    if (captionBox.width > 2 || captionBox.height > 2) failures.push(`${route}: NILAM table caption is visibly leaking into the layout`);
  }
  if (route === '/pss/digital/nilam/' && page.viewportSize().width <= 600) {
    const mobileLeaderboard = await page.locator('.nilam-leaderboard-table').evaluate((table) => ({
      width: Math.ceil(table.getBoundingClientRect().width),
      viewport: window.innerWidth,
      rowDisplay: getComputedStyle(table.querySelector('tbody tr')).display,
      wrapperOverflow: getComputedStyle(table.closest('.nilam-table-wrap')).overflowX
    }));
    const longMetadataOverflow = await page.locator('.nilam-leaderboard-table').evaluate((table) => {
      table.querySelector('.nilam-form').textContent = 'TingkatanEmpatDenganNamaKelasYangSangatPanjangTanpaRuang';
      table.querySelector('.nilam-class').textContent = 'ImtiyazDenganKodProgramYangSangatPanjangTanpaRuang';
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    const longPodiumMetadataOverflow = await page.locator('#nilam-podium').evaluate((podium) => {
      const metadata = podium.querySelectorAll('.nilam-podium-card small');
      metadata[0].textContent = 'Tingkatan'.repeat(80);
      metadata[1].textContent = 'Kelas'.repeat(80);
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    if (longMetadataOverflow) failures.push(`${route}: long NILAM metadata causes horizontal page overflow`);
    if (longPodiumMetadataOverflow) failures.push(`${route}: long NILAM podium metadata causes horizontal page overflow`);
    if (mobileLeaderboard.width > mobileLeaderboard.viewport || mobileLeaderboard.rowDisplay !== 'grid' || mobileLeaderboard.wrapperOverflow !== 'visible') {
      failures.push(`${route}: NILAM leaderboard is not a mobile-friendly card list`);
    }
  }
  if (route === '/pss/digital/nilam/') {
    const podiumRanks = await page.locator('#nilam-podium .nilam-podium-card').evaluateAll((cards) => cards.map((card) => Number(card.dataset.rank)));
    if (podiumRanks.length !== 3 || podiumRanks.join(',') !== '1,2,3') {
      failures.push(`${route}: NILAM podium must render the top three ranks in order`);
    }
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
      await dropdown.locator('summary').click();
      await page.waitForTimeout(220);
      if (!(await dropdown.evaluate((node) => node.hasAttribute('open')))) failures.push('website desktop: click menu did not open');
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
      const focusMovedIntoMenu = await page.evaluate(() => Boolean(document.activeElement && document.querySelector('.pss-links')?.contains(document.activeElement)));
      if (!focusMovedIntoMenu) failures.push('PSS mobile: opening the menu did not move keyboard focus into it');
      const scrollPadding = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        return { top: parseFloat(style.scrollPaddingTop), bottom: parseFloat(style.scrollPaddingBottom) };
      });
      if (!(scrollPadding.top >= 76) || !(scrollPadding.bottom >= 80)) {
        failures.push('PSS mobile: anchor scrolling lacks safe space for the sticky header and dock');
      }
      const mobileDock = await page.locator('.pss-mobile-dock').evaluate((dock) => ({
        actions: dock.querySelectorAll('a, button').length,
        active: dock.querySelector('a[aria-current="page"]')?.textContent.trim(),
        smallestTarget: Math.min(...[...dock.querySelectorAll('a, button')].map((item) => item.getBoundingClientRect().height))
      }));
      if (mobileDock.actions !== 5 || mobileDock.active !== 'Utama' || mobileDock.smallestTarget < 44) {
        failures.push('PSS mobile: dock must expose five 44px actions and mark the current page');
      }
      await page.keyboard.press('Escape');
      if ((await toggle.getAttribute('aria-expanded')) !== 'false') failures.push('PSS mobile: Escape did not close the menu');
      const menuControls = await page.evaluate(() => ({
        navId: document.querySelector('.pss-links')?.id,
        header: document.querySelector('.menu-toggle')?.getAttribute('aria-controls'),
        dock: document.querySelector('.pss-mobile-dock button')?.getAttribute('aria-controls')
      }));
      if (!menuControls.navId || menuControls.header !== menuControls.navId || menuControls.dock !== menuControls.navId) {
        failures.push('PSS mobile: menu invokers are not linked to the controlled navigation');
      }
      const dockMenu = page.locator('.pss-mobile-dock button');
      await dockMenu.focus();
      await page.keyboard.press('Enter');
      if ((await dockMenu.getAttribute('aria-expanded')) !== 'true') failures.push('PSS mobile: dock Menu did not open navigation');
      await page.keyboard.press('Escape');
      const dockFocusRestored = await page.evaluate(() => document.activeElement === document.querySelector('.pss-mobile-dock button'));
      if (!dockFocusRestored) failures.push('PSS mobile: Escape did not restore focus to the dock Menu invoker');
    }
    await page.close();
  }
  await context.close();
}

const motionContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const motionPage = await motionContext.newPage();
await motionPage.emulateMedia({ reducedMotion: 'no-preference' });
await motionPage.goto(`${base}/pss/digital/nilam/`, { waitUntil: 'domcontentloaded' });
await motionPage.locator('#nilam-podium .nilam-podium-card').first().waitFor({ state: 'attached', timeout: 6000 }).catch(() => {});
const motionName = await motionPage.locator('#nilam-podium .nilam-podium-card').first().evaluate((card) => getComputedStyle(card).animationName).catch(() => 'none');
if (motionName === 'none') failures.push('PSS NILAM: podium has no motion when reduced motion is not requested');
await motionContext.close();

const reducedMotionContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const reducedMotionPage = await reducedMotionContext.newPage();
await reducedMotionPage.emulateMedia({ reducedMotion: 'reduce' });
await reducedMotionPage.goto(`${base}/pss/digital/nilam/`, { waitUntil: 'domcontentloaded' });
await reducedMotionPage.locator('#nilam-podium .nilam-podium-card').first().waitFor({ state: 'attached', timeout: 6000 }).catch(() => {});
const reducedMotionName = await reducedMotionPage.locator('#nilam-podium .nilam-podium-card').first().evaluate((card) => getComputedStyle(card).animationName).catch(() => 'none');
const reducedMotionScrollBehavior = await reducedMotionPage.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
if (reducedMotionName !== 'none') failures.push('PSS NILAM: podium motion remains active when reduced motion is requested');
if (reducedMotionScrollBehavior !== 'auto') failures.push('PSS: smooth scrolling remains active when reduced motion is requested');
await reducedMotionContext.close();

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
