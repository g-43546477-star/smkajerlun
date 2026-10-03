(() => {
  'use strict';
  const main = document.querySelector('main');
  if (!main) return;
  const nav = document.createElement('nav');
  nav.className = 'app-nav';
  nav.setAttribute('aria-label', 'Menu aplikasi tempahan');
  const links = [
    ['/tempahan/jadual/', 'Jadual', '<path d="M4 8h16v3H4Z" fill="currentColor" opacity=".12" stroke="none"/><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-11 4h2m2 0h2"/>'],
    ['/tempahan/', 'Tempah bilik', '<rect x="6" y="6" width="16" height="16" rx="5" fill="currentColor" opacity=".12" stroke="none"/><rect x="4" y="4" width="16" height="16" rx="5"/><path d="M12 8v8m-4-4h8"/>'],
    ['/tempahan/senarai/?mine=1', 'Tempahan saya', '<path d="M8 6h14v17H8Z" fill="currentColor" opacity=".12" stroke="none"/><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6m-6 4h6m-6 4h4"/>']
  ];
  links.forEach(([href, label, icon]) => {
    const a = document.createElement('a');
    a.href = href;
    const symbol = document.createElement('span');
    symbol.setAttribute('aria-hidden', 'true');
    symbol.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
    a.append(symbol, document.createTextNode(label));
    if (location.pathname === new URL(href, location.origin).pathname) a.setAttribute('aria-current', 'page');
    nav.append(a);
  });
  document.body.append(nav);
  const rule = document.createElement('aside');
  rule.className = 'app-rule';
  main.prepend(rule);
  const syncRule = () => {
    const info = tarikhInfo();
    if (window.bookingAuth?.admin) {
      rule.dataset.mode = 'admin';
      rule.innerHTML = '<strong>Mod pentadbir</strong><span>Anda boleh menempah awal. Guru biasa tertakluk pada aturan 3 petang.</span>';
    } else {
      rule.dataset.mode = 'teacher';
      rule.innerHTML = `<strong>${info.bukaEsok ? 'Tempahan esok sudah dibuka' : 'Tempahan esok dibuka 3 petang'}</strong><span>Setiap tarikh dibuka sehari sebelumnya · Waktu Malaysia</span>`;
    }
  };
  syncRule();
  window.addEventListener('booking-auth-ready', syncRule);
  setInterval(syncRule, 30000);
  const version = document.createElement('p');
  version.className = 'app-version';
  version.textContent = 'Tempahan SMKAJ · Versi 8 Sep 2026.3';
  main.append(version);
  const notice = document.createElement('p');
  notice.className = 'app-network';
  notice.setAttribute('role', 'status');
  main.prepend(notice);
  const syncNetwork = () => {
    notice.hidden = navigator.onLine;
    notice.textContent = 'Tiada sambungan internet. Maklumat pada skrin mungkin tidak terkini. Sambung semula sebelum membuat tempahan.';
  };
  syncNetwork();
  window.addEventListener('online', syncNetwork);
  window.addEventListener('offline', syncNetwork);
  document.querySelectorAll('.tablewrap').forEach(table => {
    table.tabIndex = 0;
    if (table.tagName !== 'SECTION') table.setAttribute('role', 'region');
    if (!table.hasAttribute('aria-label')) table.setAttribute('aria-label', 'Jadual tempahan. Leret ke sisi untuk melihat semua lajur.');
  });
})();
