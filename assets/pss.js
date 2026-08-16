(function () {
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.querySelector('.pss-links');
  var routePath = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/';

  function activeGroup() {
    if (routePath.indexOf('/pss/tentang-pss/') === 0 || routePath.indexOf('/pss/maklumat/') === 0 || routePath.indexOf('/pss/organisasi/') === 0) return 'tentang';
    if (routePath.indexOf('/pss/program/') === 0) return 'program';
    if (routePath.indexOf('/pss/digital/') === 0 || routePath.indexOf('/pss/katalog/') === 0 || routePath.indexOf('/pss/nilam/') === 0) return 'digital';
    if (routePath.indexOf('/pss/perkhidmatan/') === 0 || routePath.indexOf('/pss/pinjaman/') === 0) return 'perkhidmatan';
    return 'utama';
  }

  function dropdown(group, label, overview, intro, links) {
    return '<details class="pss-dropdown pss-mega' + (activeGroup() === group ? ' active' : '') + '"><summary>' + label + '</summary><div class="pss-mega-panel"><div class="pss-mega-copy"><strong>' + label + '</strong><small>' + intro + '</small><a class="pss-mega-overview" href="' + overview + '">Lihat ' + label + '</a></div><div class="pss-mega-links">' + links.map(function (link) {
      return '<a href="' + link.href + '"><b>' + link.title + '</b><small>' + link.copy + '</small></a>';
    }).join('') + '</div></div></details>';
  }

  if (nav) {
    nav.innerHTML = [
      '<a href="/pss/"' + (activeGroup() === 'utama' ? ' class="active"' : '') + '>Utama</a>',
      dropdown('tentang', 'Tentang PSS', '/pss/tentang-pss/maklumat/', 'Maklumat dan organisasi Maktabah Darul Hikmah.', [
        { href: '/pss/tentang-pss/maklumat/', title: 'Maklumat PSS', copy: 'Fungsi, masa dan hubungan' },
        { href: '/pss/tentang-pss/jawatankuasa-guru/', title: 'Jawatankuasa Guru', copy: 'Pengurusan dan penyelaras PSS' },
        { href: '/pss/tentang-pss/pengawas-pss/', title: 'Pengawas PSS', copy: 'Barisan pengawas pelajar' }
      ]),
      dropdown('program', 'Program', '/pss/program/kalendar/', 'Kalendar, aktiviti dan makluman PSS.', [
        { href: '/pss/program/kalendar/', title: 'Kalendar PSS', copy: 'Tarikh dan program semasa' },
        { href: '/pss/program/aktiviti/', title: 'Aktiviti dan Program', copy: 'Penyertaan dan pengayaan murid' },
        { href: '/pss/program/pengumuman/', title: 'Pengumuman', copy: 'Makluman rasmi PSS' }
      ]),
      dropdown('digital', 'Digital', '/pss/digital/katalog/', 'Koleksi digital dan perekodan bacaan NILAM.', [
        { href: '/pss/digital/katalog/', title: 'Katalog Buku', copy: 'Semak koleksi dan bahan rujukan' },
        { href: '/pss/rak-buku-maya/', title: 'Rak Buku Maya', copy: 'Teroka buku mengikut kategori' },
        { href: '/pss/digital/nilam/', title: 'NILAM', copy: 'Akses perekodan bacaan' },
        { href: '/pss/digital/portal-ains/', title: 'Portal AINS', copy: 'Sistem rasmi rekod NILAM KPM' },
        { href: '/pss/digital/iq-nilam/', title: 'iQ-NILAM', copy: 'Portal bacaan Kementerian Pendidikan' }
      ]),
      dropdown('perkhidmatan', 'Perkhidmatan', '/pss/perkhidmatan/borang-pinjaman/', 'Urusan pinjaman dan sokongan pengguna PSS.', [
        { href: '/pss/perkhidmatan/borang-pinjaman/', title: 'Borang Pinjaman', copy: 'Pinjaman bahan dan peralatan' },
        { href: '/pss/perkhidmatan/tempahan-ruang/', title: 'Tempahan Ruang', copy: 'Semak slot dan tempah ruang' },
        { href: '/pss/perkhidmatan/cadangan-buku/', title: 'Cadangan Buku', copy: 'Bantu tambah koleksi PSS' }
      ]),
      '<a class="back-link" href="/">Laman sekolah</a>'
    ].join('');
  }

  if (toggle && nav) toggle.addEventListener('click', function () { var open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); });
  if (nav && !document.querySelector('.pss-mobile-dock')) {
    var mobileDock = document.createElement('nav');
    mobileDock.className = 'pss-mobile-dock';
    mobileDock.setAttribute('aria-label', 'Akses pantas Portal PSS');
    mobileDock.innerHTML = '<a href="/pss/"' + (activeGroup() === 'utama' ? ' class="active"' : '') + '>Utama</a><a href="/pss/digital/katalog/?fokus=cari"' + (activeGroup() === 'digital' ? ' class="active"' : '') + '>Cari</a><a href="/pss/rak-buku-maya/">Rak Maya</a><a href="/pss/digital/nilam/">NILAM</a><button type="button" aria-label="Buka menu Portal PSS" aria-expanded="false">Menu</button>';
    document.body.appendChild(mobileDock);
    mobileDock.querySelector('button').addEventListener('click', function () {
      if (toggle) toggle.click();
      this.setAttribute('aria-expanded', String(nav.classList.contains('open')));
    });
  }
  (function () {
    var menus = document.querySelectorAll('.pss-dropdown');
    function closeMenus(except) { menus.forEach(function (menu) { if (menu !== except) menu.open = false; }); }
    function isDesktop() { return window.matchMedia('(min-width: 821px)').matches; }
    menus.forEach(function (menu) {
      menu.addEventListener('click', function (event) { if (isDesktop() && event.target.closest('summary')) { event.preventDefault(); menu.open = !menu.open; closeMenus(menu); } });
      menu.addEventListener('mouseenter', function () { if (isDesktop()) { closeMenus(menu); menu.open = true; } });
    });
    document.querySelectorAll('.pss-links > a').forEach(function (link) { link.addEventListener('mouseenter', function () { if (isDesktop()) closeMenus(); }); });
    document.addEventListener('click', function (event) { if (isDesktop() && nav && !nav.contains(event.target) && (!toggle || !toggle.contains(event.target))) closeMenus(); });
    window.addEventListener('scroll', function () { closeMenus(); }, { passive: true });
  }());
  document.querySelectorAll('.pss-links a').forEach(function (link) { link.addEventListener('click', function () { if (nav) nav.classList.remove('open'); if (toggle) toggle.setAttribute('aria-expanded', 'false'); }); });

  var footerShell = document.querySelector('.pss-footer .pss-shell');
  if (footerShell && !footerShell.querySelector('.pss-footer-admin')) {
    var staffLink = document.createElement('a');
    staffLink.className = 'pss-footer-admin';
    staffLink.href = '/pss/admin/';
    staffLink.textContent = 'Admin PSS';
    footerShell.appendChild(staffLink);
  }

  var main = document.querySelector('main');
  var pageTitle = main && main.querySelector('h1');
  if (main && pageTitle && !document.querySelector('.pss-home-hero') && !main.querySelector('.pss-breadcrumb')) {
    var groupLabels = { tentang: 'Tentang PSS', program: 'Program', digital: 'Digital', perkhidmatan: 'Perkhidmatan' };
    var breadcrumb = document.createElement('nav');
    breadcrumb.className = 'pss-breadcrumb';
    breadcrumb.setAttribute('aria-label', 'Jejak navigasi');
    breadcrumb.innerHTML = '<a href="/pss/">Portal PSS</a><span aria-hidden="true">/</span><span>' + (groupLabels[activeGroup()] || 'Portal PSS') + '</span>';
    main.insertBefore(breadcrumb, main.firstChild);
  }

  if (new URLSearchParams(location.search).get('fokus') === 'cari') {
    requestAnimationFrame(function () {
      var search = document.querySelector('input[type="search"]');
      if (search) search.focus();
    });
  }
  var toast = document.querySelector('.toast');
  document.querySelectorAll('form[data-message]').forEach(function (form) { form.addEventListener('submit', function (event) { event.preventDefault(); if (!toast) return; toast.textContent = form.dataset.message; toast.classList.add('show'); form.reset(); setTimeout(function () { toast.classList.remove('show'); }, 3600); }); });
  var routeTabs = { '/pss/tentang-pss/jawatankuasa-guru/': 'guru', '/pss/tentang-pss/pengawas-pss/': 'pelajar' };
  var routeAnchors = { '/pss/program/kalendar/': 'kalendar', '/pss/program/pengumuman/': 'pengumuman' };
  var selectedTab = routeTabs[routePath] || new URLSearchParams(location.search).get('tab');
  document.querySelectorAll('[data-pss-tab]').forEach(function (tab) {
    function showTab() {
      var selected = tab.dataset.pssTab;
      document.querySelectorAll('[data-pss-tab]').forEach(function (item) { var active = item === tab; item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active)); });
      document.querySelectorAll('[data-pss-panel]').forEach(function (panel) { panel.hidden = panel.dataset.pssPanel !== selected; });
    }
    tab.addEventListener('click', showTab);
    if (selectedTab === tab.dataset.pssTab) showTab();
  });
  if (routeAnchors[routePath]) {
    requestAnimationFrame(function () {
      var target = document.getElementById(routeAnchors[routePath]);
      if (target) target.scrollIntoView({ block: 'start' });
    });
  }
})();
