(function () {
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.querySelector('.pss-links');
  var routePath = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/';
  var menuInvoker = null;
  if (nav) {
    if (!nav.id) nav.id = 'pss-navigation';
    if (toggle) toggle.setAttribute('aria-controls', nav.id);
  }

  function setMenuOpen(open, invoker) {
    if (!nav || !toggle) return;
    var isOpen = Boolean(open);
    if (isOpen) menuInvoker = invoker || toggle;
    nav.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    var dockButton = document.querySelector('.pss-mobile-dock button');
    if (dockButton) dockButton.setAttribute('aria-expanded', String(isOpen));
    if (isOpen && window.matchMedia('(max-width: 820px)').matches) {
      var firstMenuTarget = nav.querySelector('a, summary');
      if (firstMenuTarget) firstMenuTarget.focus();
    }
  }

  function dockLink(href, label, active) {
    return '<a href="' + href + '"' + (active ? ' class="active" aria-current="page"' : '') + '>' + label + '</a>';
  }

  function activeGroup() {
    if (routePath.indexOf('/pss/tentang-pss/') === 0 || routePath.indexOf('/pss/maklumat/') === 0 || routePath.indexOf('/pss/organisasi/') === 0) return 'tentang';
    if (routePath.indexOf('/pss/program/') === 0) return 'program';
    if (routePath.indexOf('/pss/jaringan-perpustakaan/') === 0) return 'jaringan';
    if (routePath.indexOf('/pss/rak-buku-maya/') === 0) return 'digital';
    if (routePath === '/pss/submenu/') return 'perkhidmatan';
    if (routePath.indexOf('/pss/digital/') === 0 || routePath.indexOf('/pss/katalog/') === 0 || routePath.indexOf('/pss/nilam/') === 0) return 'digital';
    if (routePath.indexOf('/pss/perkhidmatan/') === 0 || routePath.indexOf('/pss/pinjaman/') === 0) return 'perkhidmatan';
    return 'utama';
  }

  function dropdown(group, label, overview, intro, links) {
    var overviewLink = overview ? '<a class="pss-mega-overview" href="' + overview + '">Lihat ' + label + '</a>' : '';
    return '<details class="pss-dropdown pss-mega' + (activeGroup() === group ? ' active' : '') + '"><summary>' + label + '</summary><div class="pss-mega-panel"><div class="pss-mega-copy"><strong>' + label + '</strong><small>' + intro + '</small>' + overviewLink + '</div><div class="pss-mega-links">' + links.map(function (link) {
      var external = link.external ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + link.href + '"' + external + '><b>' + link.title + '</b><small>' + link.copy + '</small></a>';
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
        { href: '/pss/program/kalendar/', title: 'Kalendar PSS', copy: 'Aktiviti dan program semasa' },
        { href: '/pss/program/pengumuman/', title: 'Pengumuman', copy: 'Makluman rasmi PSS' }
      ]),
      dropdown('digital', 'Digital', '/pss/digital/katalog/', 'Koleksi digital dan perekodan bacaan NILAM.', [
        { href: '/pss/digital/katalog/', title: 'Katalog Buku', copy: 'Semak koleksi dan bahan rujukan' },
        { href: '/pss/rak-buku-maya/', title: 'Rak Buku Maya', copy: 'Teroka buku mengikut kategori' },
        { href: '/pss/digital/nilam/', title: 'NILAM', copy: 'Akses perekodan bacaan' }
      ]),
      dropdown('jaringan', 'Jaringan Perpustakaan', '/pss/jaringan-perpustakaan/', 'Pautan perpustakaan dan sumber bacaan rasmi untuk warga sekolah.', [
        { href: 'https://ains.moe.gov.my', title: 'AINS NILAM', copy: 'Sistem rekod bacaan rasmi KPM', external: true },
        { href: 'https://www.u-pustaka.gov.my', title: 'u-Pustaka', copy: 'E-buku, e-majalah dan e-akhbar percuma', external: true },
        { href: 'https://opac.kedahlib.gov.my', title: 'Perpustakaan Digital Kedah', copy: 'Katalog dan keahlian perpustakaan Kedah', external: true },
        { href: 'https://d2.delima.edu.my', title: 'DELIMa', copy: 'Buku teks digital dan bahan bacaan', external: true },
        { href: 'https://delima.bookcapital.com.my', title: 'Baucar Buku MADANI', copy: 'Akses e-baucar buku untuk pelajar yang layak', external: true }
      ]),
      dropdown('perkhidmatan', 'Perkhidmatan', '/pss/submenu/', 'Urusan pinjaman dan sokongan pengguna PSS.', [
        { href: '/pss/perkhidmatan/borang-pinjaman/', title: 'Borang Pinjaman', copy: 'Pinjaman bahan dan peralatan' },
        { href: '/pss/perkhidmatan/tempahan-ruang/', title: 'Tempahan Ruang', copy: 'Semak slot dan tempah ruang' },
        { href: '/pss/perkhidmatan/cadangan-buku/', title: 'Cadangan Buku', copy: 'Bantu tambah koleksi PSS' }
      ]),
      '<a class="back-link" href="/">Laman sekolah</a>'
    ].join('');
  }

  if (toggle && nav) toggle.addEventListener('click', function () { setMenuOpen(!nav.classList.contains('open'), toggle); });
  if (nav && !document.querySelector('.pss-mobile-dock')) {
    var mobileDock = document.createElement('nav');
    mobileDock.className = 'pss-mobile-dock';
    mobileDock.setAttribute('aria-label', 'Akses pantas Portal PSS');
    mobileDock.innerHTML = dockLink('/pss/', 'Utama', routePath === '/pss/') + dockLink('/pss/digital/katalog/?fokus=cari', 'Cari', routePath === '/pss/digital/katalog/') + dockLink('/pss/rak-buku-maya/', 'Rak Maya', routePath === '/pss/rak-buku-maya/') + dockLink('/pss/digital/nilam/', 'NILAM', routePath === '/pss/digital/nilam/') + '<button type="button" aria-label="Buka menu Portal PSS" aria-controls="' + nav.id + '" aria-expanded="false">Menu</button>';
    document.body.appendChild(mobileDock);
    var dockMenuButton = mobileDock.querySelector('button');
    dockMenuButton.addEventListener('click', function () {
      setMenuOpen(!nav.classList.contains('open'), dockMenuButton);
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
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !nav || !nav.classList.contains('open')) return;
    var focusTarget = menuInvoker || toggle;
    setMenuOpen(false);
    if (focusTarget) focusTarget.focus();
    menuInvoker = null;
  });
  document.querySelectorAll('.pss-links a').forEach(function (link) { link.addEventListener('click', function () { setMenuOpen(false); }); });

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
    var groupLabels = { jaringan: 'Jaringan Perpustakaan', tentang: 'Tentang PSS', program: 'Program', digital: 'Digital', perkhidmatan: 'Perkhidmatan' };
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
    tab.id = 'pss-tab-' + tab.dataset.pssTab;
    tab.setAttribute('aria-controls', tab.dataset.pssTab);
    tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
    function showTab() {
      var selected = tab.dataset.pssTab;
      document.querySelectorAll('[data-pss-tab]').forEach(function (item) { var active = item === tab; item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active)); item.tabIndex = active ? 0 : -1; });
      document.querySelectorAll('[data-pss-panel]').forEach(function (panel) { panel.hidden = panel.dataset.pssPanel !== selected; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', 'pss-tab-' + panel.dataset.pssPanel); });
    }
    tab.addEventListener('click', showTab);
    tab.addEventListener('keydown', function (event) {
      var tabs = Array.from(document.querySelectorAll('[data-pss-tab]'));
      var index = tabs.indexOf(tab);
      if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[index].click();
      tabs[index].focus();
    });
    if (selectedTab === tab.dataset.pssTab) showTab();
  });
  if (routeAnchors[routePath]) {
    requestAnimationFrame(function () {
      var target = document.getElementById(routeAnchors[routePath]);
      if (target) target.scrollIntoView({ block: 'start' });
    });
  }
})();
