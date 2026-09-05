/* School-wide visual navigation. Data and editorial records stay unchanged. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const icon = name => {
    const image = document.createElement('img');
    image.src = '/assets/ajer-icons/' + name + '.svg';
    image.alt = ''; image.width = 64; image.height = 64;
    image.className = 'ajer-icon'; return image;
  };
  const route = location.pathname.replace(/\/?$/, '/');
  const routeGroups = { '/akademik/': 'akademik', '/hem/': 'hem', '/kokurikulum/': 'kokurikulum', '/asrama/': 'asrama', '/info/': 'info', '/hub/': 'perkhidmatan' };
  const groupKey = routeGroups[route];
  if (groupKey) document.body.classList.add('ajer-content-' + groupKey);
  const iconForText = text => {
    const value = text.toLowerCase();
    if (/jadual|masa/.test(value)) return 'clock';
    if (/takwim|tarikh|kalendar/.test(value)) return 'calendar';
    if (/dokumen|borang|peraturan|panduan/.test(value)) return 'document';
    if (/warga|guru|kaunseling|kebajikan/.test(value)) return 'people';
    if (/pengurusan|kepimpinan|organisasi/.test(value)) return 'org';
    if (/sukan|permainan/.test(value)) return 'football';
    if (/kelab|persatuan/.test(value)) return 'language';
    if (/uniform/.test(value)) return 'scout';
    if (/keselamatan|sahsiah/.test(value)) return 'cadet';
    if (/asrama/.test(value)) return 'bed';
    if (/lagu/.test(value)) return 'music';
    if (/hubungi/.test(value)) return 'phone';
    if (/profil/.test(value)) return 'building';
    return 'book';
  };
  // The main menu now opens the content itself. These are the same destinations as its submenu.
  if (groupKey && !['info', 'asrama'].includes(groupKey)) {
    const group = (window.schoolMenuGroups || {})[groupKey];
    const main = document.querySelector('main');
    if (group && main) {
      document.querySelectorAll('.page-guide,.school-quick-nav,.academic-access').forEach(node => node.hidden = true);
      const nav = document.createElement('nav'); nav.className = 'ajer-content-nav'; nav.setAttribute('aria-label', 'Bahagian ' + group.label);
      group.links.forEach(item => {
        const link = document.createElement('a'); link.href = item.href;
        const label = document.createElement('span'); label.textContent = item.title;
        link.append(icon(iconForText(item.title)), label); nav.append(link);
      });
      main.prepend(nav);
    }
  }
  document.querySelectorAll('.ajer-entry a').forEach((link, index) => {
    const old = link.querySelector('img'); if (old) old.replaceWith(icon(['book', 'language', 'calendar'][index]));
  });
  // Centralised Info School uses the existing panel IDs, data and tab contract.
  const infoTabs = [...document.querySelectorAll('.subtab')];
  infoTabs.forEach((tab, index) => {
    tab.prepend(icon(['building', 'music', 'org', 'people', 'calendar', 'phone'][index] || 'building'));
    tab.addEventListener('click', () => {
      if (route !== '/info/') return;
      const url = new URL(location.href); url.searchParams.set('tab', tab.dataset.panel.replace('panel-', '')); history.replaceState(null, '', url);
    });
  });
  function keyboardTabs(tabs) {
    if (!tabs.length) return;
    function update() { tabs.forEach(tab => tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1); }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', update);
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next === undefined) return;
        event.preventDefault(); tabs[next].click(); tabs[next].focus();
      });
    }); update();
  }
  keyboardTabs(infoTabs);
  keyboardTabs([...document.querySelectorAll('.schedule-tab')]);
  // Asrama: three focused views; all original rules and timetable text are retained.
  if (route === '/asrama/') {
    document.querySelectorAll('.page-guide,.school-quick-nav').forEach(node => node.hidden = true);
    const nav = document.createElement('div'); nav.className = 'ajer-content-nav asrama-tabs'; nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', 'Bahagian asrama');
    const targets = [['page-content', 'Pengurusan', 'bed'], ['jadual-harian', 'Jadual', 'clock'], ['peraturan', 'Panduan', 'document']];
    const select = id => {
      targets.forEach(([key]) => { const panel = $(key); if (panel) panel.hidden = id !== key; });
      nav.querySelectorAll('button').forEach(button => button.setAttribute('aria-selected', String(button.dataset.panel === id)));
    };
    targets.forEach(([id, title, image]) => {
      const button = document.createElement('button'); button.type = 'button'; button.setAttribute('role', 'tab'); button.id = 'asrama-tab-' + id; button.dataset.panel = id; button.setAttribute('aria-controls', id);
      const label = document.createElement('span'); label.textContent = title; button.append(icon(image), label);
      const panel = $(id); if (panel) { panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', button.id); }
      button.addEventListener('click', () => { select(id); const url = new URL(location.href); url.searchParams.set('section', id); history.replaceState(null, '', url); }); nav.append(button);
    });
    document.querySelector('main').prepend(nav);
    const requested = new URLSearchParams(location.search).get('section');
    select(targets.some(([id]) => id === requested) ? requested : 'jadual-harian');
    keyboardTabs([...nav.querySelectorAll('button')]);
    document.querySelectorAll('.rule-group').forEach(rule => { rule.open = false; });
  }
  // Activity graphics are illustrative badges, never fabricated official emblems.
  const badges = [
    [/pengakap/i, 'scout'], [/bsmm|sabit/i, 'care'], [/remaja/i, 'cadet'], [/polis/i, 'police'], [/puteri/i, 'flower'],
    [/bahasa melayu/i, 'language'], [/inggeris/i, 'english'], [/agama|arab/i, 'mosque'], [/jenayah/i, 'safety'], [/rukun/i, 'flag'],
    [/fotografi|inovasi|digital/i, 'camera'], [/kerjaya|prs/i, 'career'], [/pelaburan/i, 'finance'], [/bola sepak/i, 'football'],
    [/badminton/i, 'badminton'], [/jaring/i, 'netball'], [/takraw/i, 'sepak'], [/tampar/i, 'volleyball'], [/memanah/i, 'archery']
  ];
  function decorateUnits() {
    document.querySelectorAll('.koku-unit-card .kp-list li').forEach(item => {
      if (item.querySelector('.ajer-icon')) return;
      const title = item.querySelector('b'); const name = title ? title.textContent : '';
      const badge = badges.find(([pattern]) => pattern.test(name)); item.prepend(icon(badge ? badge[1] : 'people'));
    });
  }
  const units = $('koku-columns');
  if (units) { decorateUnits(); new MutationObserver(decorateUnits).observe(units, { childList: true, subtree: true }); }
  // Consistent chart tools for school leadership and both PSS charts.
  document.querySelectorAll('#org-chart-mount,.org-chart').forEach(chart => {
    const tools = document.createElement('div'); tools.className = 'ajer-chart-tools';
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Paparan senarai'; button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => { const list = chart.classList.toggle('ajer-org-list'); button.setAttribute('aria-pressed', String(list)); button.textContent = list ? 'Paparan carta' : 'Paparan senarai'; });
    tools.append(button); chart.before(tools);
  });
  document.querySelectorAll('.org-node').forEach(person => person.prepend(icon('people')));
  // Auto-advancing program strip: pauses for interaction, hidden tabs and reduced motion.
  const strip = $('home-program-list');
  if (strip && $('program-toggle')) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = reduce.matches, hover = false, focused = false, index = 0;
    const items = () => [...strip.querySelectorAll('.achievement-card')];
    const toggle = $('program-toggle');
    function state() {
      toggle.textContent = paused ? 'Main' : 'Jeda';
      toggle.setAttribute('aria-label', paused ? 'Main gerakan program' : 'Jeda gerakan program');
      toggle.setAttribute('aria-pressed', String(paused));
      const count = items().length;
      $('program-position').textContent = count ? (index + 1) + ' / ' + count : 'Tiada program';
      [$('program-prev'), $('program-next'), toggle].forEach(button => button.disabled = count < 2);
    }
    function move(next) {
      const cards = items(); if (!cards.length) return;
      index = (next + cards.length) % cards.length;
      strip.scrollTo({ left: cards[index].offsetLeft - cards[0].offsetLeft, behavior: reduce.matches ? 'instant' : 'smooth' }); state();
    }
    $('program-prev').addEventListener('click', () => { paused = true; move(index - 1); });
    $('program-next').addEventListener('click', () => { paused = true; move(index + 1); });
    toggle.addEventListener('click', () => { paused = !paused; state(); });
    strip.addEventListener('mouseenter', () => hover = true); strip.addEventListener('mouseleave', () => hover = false);
    strip.addEventListener('focusin', () => focused = true); strip.addEventListener('focusout', () => { focused = strip.contains(document.activeElement); setTimeout(() => { focused = strip.contains(document.activeElement); }, 0); });
    strip.addEventListener('pointerdown', () => { paused = true; state(); });
    strip.addEventListener('wheel', () => { paused = true; state(); }, { passive: true });
    strip.addEventListener('scroll', () => {
      const cards = items(); if (!cards.length) return;
      let closest = 0;
      cards.forEach((card, i) => { if (Math.abs(card.offsetLeft - cards[0].offsetLeft - strip.scrollLeft) < Math.abs(cards[closest].offsetLeft - cards[0].offsetLeft - strip.scrollLeft)) closest = i; });
      index = closest; state();
    }, { passive: true });
    reduce.addEventListener('change', () => { if (reduce.matches) paused = true; state(); });
    const observer = new MutationObserver(() => { index = 0; state(); }); observer.observe(strip, { childList: true });
    setInterval(() => { if (!paused && !hover && !focused && !document.hidden && items().length > 1) move(index + 1); }, 6000);
    state();
  }
}());
