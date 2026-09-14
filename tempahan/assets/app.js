(() => {
  'use strict';
  const main = document.querySelector('main');
  if (!main) return;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const panel = document.createElement('section');
  panel.className = 'app-install';
  panel.setAttribute('aria-label', 'Pasang aplikasi');
  panel.innerHTML = `<div><strong>Tempahan dalam telefon anda</strong><p>Pasang untuk akses pantas ke jadual dan tempahan bilik.</p></div><button type="button" class="btn-secondary" id="app-install-button">Pasang App</button>`;
  document.querySelector('.topnav .bar').append(panel);
  const install = panel.querySelector('button');
  const dialog = document.createElement('dialog');
  dialog.className = 'app-help';
  dialog.setAttribute('aria-labelledby', 'app-help-title');
  dialog.innerHTML = `<h2 id="app-help-title">Pasang App Tempahan</h2>
    <p>Gunakan pautan sistem tempahan sekolah dalam browser telefon.</p>
    <h3>iPhone · Safari</h3><ol><li>Tekan menu Kongsi (Share).</li><li>Pilih <b>Add to Home Screen</b> / Tambah ke Skrin Utama. Jika perlu, tekan Edit Actions untuk mencari pilihan ini.</li><li>Aktifkan <b>Open as Web App</b> jika dipaparkan, kemudian tekan <b>Add</b>.</li></ol>
    <h3>Android · Chrome</h3><ol><li>Tekan menu tiga titik di penjuru browser.</li><li>Pilih <b>Install app</b> / Pasang apl atau <b>Add to Home screen</b>.</li><li>Ikut arahan pemasangan yang dipaparkan.</li></ol>
    <p>Jika pautan dibuka dalam WhatsApp, buka dahulu dalam Safari atau Chrome. Sambungan internet diperlukan untuk melihat jadual terkini dan menghantar tempahan.</p>
    <p id="app-install-status" role="status"></p><button type="button" class="btn-primary">Faham</button>`;
  document.body.append(dialog);
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (!panel.hidden) install.focus(); });
  let promptEvent = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    promptEvent = event;
  });
  install.addEventListener('click', async () => {
    if (!promptEvent) { dialog.showModal(); return; }
    const pending = promptEvent;
    promptEvent = null;
    try {
      await pending.prompt();
      const choice = await pending.userChoice;
      if (choice.outcome === 'accepted') panel.hidden = true;
    } catch {
      dialog.showModal();
    }
  });
  const syncInstalled = () => { panel.hidden = standalone(); };
  syncInstalled();
  window.matchMedia('(display-mode: standalone)').addEventListener('change', syncInstalled);
  window.addEventListener('appinstalled', () => { panel.hidden = true; promptEvent = null; });

  const nav = document.createElement('nav');
  nav.className = 'app-nav';
  nav.setAttribute('aria-label', 'Menu aplikasi tempahan');
  const links = [
    ['/tempahan/jadual/', 'Jadual', '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-11 4h2m2 0h2"/>'],
    ['/tempahan/', 'Tempah bilik', '<rect x="4" y="4" width="16" height="16" rx="5"/><path d="M12 8v8m-4-4h8"/>'],
    ['/tempahan/senarai/?mine=1', 'Tempahan saya', '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6m-6 4h6m-6 4h4"/>']
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
    table.setAttribute('role', 'region');
    table.setAttribute('aria-label', 'Jadual tempahan. Leret ke sisi untuk melihat semua lajur.');
  });
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('/tempahan/sw.js', { scope: '/tempahan/', updateViaCache: 'none' }).catch(() => {
      document.getElementById('app-install-status').textContent = 'Persediaan app belum selesai. Muat semula apabila sambungan internet stabil.';
    });
  }
})();
