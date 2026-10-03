(() => {
  'use strict';
  const media = window.matchMedia('(display-mode: standalone)');
  const standalone = () => media.matches || navigator.standalone === true;
  const bookingBar = document.querySelector('.topnav .bar');
  const booking = location.pathname.startsWith('/tempahan/') && bookingBar;
  const panel = document.createElement('section');
  panel.className = booking ? 'app-install' : 'pwa-install';
  panel.setAttribute('aria-label', 'Pasang aplikasi SMKAJ');
  panel.innerHTML = '<div><strong>SMKAJ dalam telefon anda</strong><p>Satu app untuk laman sekolah, Portal PSS dan tempahan bilik.</p></div><button type="button" id="app-install-button">Pasang App</button>';
  if (booking) bookingBar.append(panel);
  else document.body.append(panel);
  const install = panel.querySelector('button');
  const dialog = document.createElement('dialog');
  dialog.className = 'pwa-help';
  dialog.setAttribute('aria-labelledby', 'pwa-help-title');
  dialog.innerHTML = `<h2 id="pwa-help-title">Pasang App SMKAJ</h2>
    <p>Akses seluruh laman sekolah dari skrin utama telefon anda.</p>
    <h3>iPhone · Safari</h3><ol><li>Tekan <b>Kongsi (Share)</b> dalam menu Safari.</li><li>Pilih <b>Add to Home Screen</b> / Tambah ke Skrin Utama. Jika tiada, semak <b>Edit Actions</b>.</li><li>Aktifkan <b>Open as Web App</b> jika dipaparkan, kemudian tekan <b>Add</b>.</li></ol>
    <h3>Android · Chrome</h3><ol><li>Tekan menu tiga titik di penjuru pelayar.</li><li>Pilih <b>Install app</b> / Pasang apl atau <b>Add to Home screen</b>.</li><li>Ikut arahan pemasangan yang dipaparkan.</li></ol>
    <p>Pada komputer, gunakan ikon pemasangan atau menu pelayar. Jika pautan dibuka dalam WhatsApp atau Facebook, buka dahulu dalam Safari atau Chrome.</p>
    <p>Internet diperlukan untuk maklumat terkini, log masuk dan penghantaran borang. Pautan ke perkhidmatan luar menggunakan laman perkhidmatan tersebut.</p>
    <p id="app-install-status" role="status"></p><button type="button">Faham</button>`;
  document.body.append(dialog);
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    // This guide has one interactive control; keep Tab within the modal.
    if (event.key === 'Tab') {
      event.preventDefault();
      dialog.querySelector('button').focus();
    }
  });
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
    } catch { dialog.showModal(); }
  });

  const toolbar = document.createElement('nav');
  toolbar.className = 'pwa-toolbar';
  toolbar.setAttribute('aria-label', 'Navigasi aplikasi SMKAJ');
  toolbar.innerHTML = '<button type="button">← Kembali</button><a href="/">Laman Utama</a>';
  toolbar.querySelector('button').addEventListener('click', () => {
    if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) history.back();
    else location.assign('/');
  });
  document.body.prepend(toolbar);
  const syncInstalled = () => { panel.hidden = standalone(); toolbar.hidden = !standalone(); };
  syncInstalled();
  media.addEventListener('change', syncInstalled);
  window.addEventListener('appinstalled', () => { panel.hidden = true; promptEvent = null; });

  // Tempahan already owns an offline warning and disables booking submission.
  if (!booking) {
    const notice = document.createElement('p');
    notice.className = 'pwa-network';
    notice.setAttribute('role', 'status');
    notice.textContent = 'Tiada sambungan internet. Maklumat pada skrin mungkin tidak terkini. Sambung semula sebelum menghantar borang.';
    toolbar.after(notice);
    const syncNetwork = () => { notice.hidden = navigator.onLine; };
    syncNetwork();
    window.addEventListener('online', syncNetwork);
    window.addEventListener('offline', syncNetwork);
  }

  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  let applyingUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (applyingUpdate) location.reload();
  });
  navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(async registration => {
    const update = document.createElement('div');
    update.className = 'pwa-update';
    update.hidden = true;
    update.setAttribute('role', 'status');
    update.innerHTML = '<span>Versi baharu app tersedia. Selesaikan borang anda sebelum mengemas kini.</span><button type="button">Kemas kini app</button>';
    document.body.append(update);
    update.querySelector('button').addEventListener('click', () => {
      if (!registration.waiting) return;
      applyingUpdate = true;
      registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
    });
    const checkUpdate = () => { update.hidden = !registration.waiting; };
    checkUpdate();
    registration.addEventListener('updatefound', () => {
      registration.installing?.addEventListener('statechange', checkUpdate);
    });
    // Retire only our old booking worker, after the root worker is active.
    const retireBookingWorker = async () => {
      if (!registration.active) return;
      const workers = await navigator.serviceWorker.getRegistrations();
      for (const worker of workers) {
        if (worker.scope === new URL('/tempahan/', location.origin).href &&
            worker.active?.scriptURL === new URL('/tempahan/sw.js', location.origin).href) await worker.unregister();
      }
    };
    if (registration.active) await retireBookingWorker();
    else registration.installing?.addEventListener('statechange', () => {
      if (registration.active) retireBookingWorker().catch(() => {});
    });
  }).catch(() => {
    document.getElementById('app-install-status').textContent = 'Persediaan app belum selesai. Muat semula apabila sambungan internet stabil.';
  });
})();
