/* A submenu URL is a focused view, not a scroll position on the overview. */
(function () {
  'use strict';
  const route = location.pathname.replace(/\/?$/, '/');
  const sections = {
    '/hem/': {
      label: 'Hal Ehwal Murid',
      views: {
        kebajikan: { title: 'Kebajikan Murid', panel: '#kebajikan', art: 'care' },
        sahsiah: { title: 'Sahsiah dan Disiplin', panel: '#sahsiah', art: 'cadet' },
        selamat: { title: 'Kesihatan dan Keselamatan', panel: '#selamat', art: 'safety' },
        sokongan: { title: 'Kaunseling dan PPDa', panel: '#sokongan', art: 'career' }
      },
      panels: '#kebajikan,#sahsiah,#selamat,#sokongan', extras: '#hem-content'
    },
    '/akademik/': {
      label: 'Akademik',
      views: {
        'academic-calendar': { title: 'Tarikh Penting Akademik', panel: '.academic-calendar-card', art: 'calendar' },
        'page-content': { title: 'Kurikulum dan Panitia', panel: '#page-content', art: 'book' }
      },
      panels: '.academic-calendar-card,.academic-notice-card,#page-content'
    },
    '/kokurikulum/': {
      label: 'Kokurikulum',
      views: {
        'koku-uniform-section': { title: 'Unit Beruniform', panel: '#koku-uniform-section', art: 'scout' },
        'koku-persatuan-section': { title: 'Kelab dan Persatuan', panel: '#koku-persatuan-section', art: 'language' },
        'koku-permainan-section': { title: 'Sukan dan Permainan', panel: '#koku-permainan-section', art: 'football' }
      },
      panels: '.koku-column', extras: '.koku-intro'
    }
  };
  const config = sections[route];
  if (!config) return;
  const requested = new URLSearchParams(location.search).get('section');
  const view = Object.hasOwn(config.views, requested) ? config.views[requested] : null;
  const main = document.querySelector('main');
  if (!main) return;
  if (requested && !view) {
    const notice = document.createElement('p'); notice.className = 'school-section-status';
    notice.setAttribute('role', 'status'); notice.textContent = 'Bahagian ini tidak ditemui. Sila pilih bahagian daripada menu di bawah.';
    main.prepend(notice); return;
  }
  if (!view) return;
  document.body.classList.add('school-focused-view');
  document.body.dataset.section = requested;
  document.title = view.title + ' | ' + config.label + ' | SMK Agama Jerlun';
  const heading = document.querySelector('.pagehead h2');
  if (heading) heading.textContent = view.title;
  document.querySelectorAll(config.panels).forEach(panel => { panel.hidden = !panel.matches(view.panel); });
  if (config.extras) document.querySelectorAll(config.extras).forEach(panel => { panel.hidden = true; });
  if (route === '/akademik/') {
    document.querySelector('.academic-live-grid').hidden = requested !== 'academic-calendar';
  }
  const breadcrumb = document.createElement('nav'); breadcrumb.className = 'school-breadcrumb';
  breadcrumb.setAttribute('aria-label', 'Jejak halaman');
  const home = document.createElement('a'); home.href = '/'; home.textContent = 'Utama';
  const overview = document.createElement('a'); overview.href = route; overview.textContent = config.label;
  const current = document.createElement('span'); current.textContent = view.title; current.setAttribute('aria-current', 'page');
  breadcrumb.append(home, overview, current);
  document.querySelector('.pagehead-inner').prepend(breadcrumb);
  const art = document.createElement('img'); art.src = '/assets/ajer-icons/' + view.art + '.svg'; art.alt = ''; art.width = 96; art.height = 96; art.className = 'school-section-symbol';
  document.querySelector('.pagehead-inner').append(art);
  document.querySelectorAll('a[href]').forEach(link => {
    const url = new URL(link.href, location.origin);
    if (url.origin === location.origin && url.pathname === route && url.searchParams.get('section') === requested) link.setAttribute('aria-current', 'page');
  });
  // cms.js schedules legacy anchor scrolling; focused views begin at their title.
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));
}());
