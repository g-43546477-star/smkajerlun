(function () {
  var view = document.body.dataset.portalView;
  if (!view || !window.cms) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = window.cmsEsc || function (v) { return v; };
  function empty(mount, text) { mount.innerHTML = '<div class="portal-empty">' + esc(text) + '</div>'; }
  function list(table, mountId, render, order) {
    var mount = $(mountId); if (!mount) return Promise.resolve();
    return cms.from(table).select('*').order(order || 'susunan').then(function (res) {
      if (res.error || !res.data || !res.data.length) return empty(mount, 'Belum ada maklumat untuk dipaparkan.');
      mount.innerHTML = res.data.map(render).join('');
    });
  }
  function renderSchoolDirectory(mountId) {
    var mount = $(mountId); if (!mount) return;
    mount.innerHTML = [
      '<article class="portal-row"><div><b>Sekolah Menengah Kebangsaan Agama Jerlun</b><p>Kod sekolah: KRA 4002</p><small>Kategori: Sekolah Menengah Kebangsaan Agama</small></div></article>',
      '<article class="portal-row"><div><b>Alamat</b><p>Jalan Kodiang, 06100 Kodiang</p><small>Kedah Darul Aman, Malaysia</small></div></article>',
      '<article class="portal-row"><div><b>Hubungan</b><p>Telefon: <a href="tel:+6049250925">04-9250925</a> &middot; Faks: 04-9250926</p><small><a href="mailto:kra4002@moe.edu.my">kra4002@moe.edu.my</a></small></div></article>',
      '<article class="portal-row"><div><b>Media Sosial</b><p>SMK AGAMA Jerlun - FB</p><small>Facebook rasmi sekolah</small></div></article>'
    ].join('');
  }
  function setupAccess() {
    var large = $('access-large'), contrast = $('access-contrast');
    if (large) large.onclick = function () { document.documentElement.classList.toggle('access-large'); localStorage.setItem('smkaj-access-large', document.documentElement.classList.contains('access-large')); };
    if (contrast) contrast.onclick = function () { document.body.classList.toggle('access-contrast'); localStorage.setItem('smkaj-access-contrast', document.body.classList.contains('access-contrast')); };
    if (localStorage.getItem('smkaj-access-large') === 'true') document.documentElement.classList.add('access-large');
    if (localStorage.getItem('smkaj-access-contrast') === 'true') document.body.classList.add('access-contrast');
  }
  setupAccess();
  if (view === 'hub' || view === 'home') {
    renderSchoolDirectory('directory-list');
    list('resource_file', 'resource-list', function (r) { return '<article class="portal-row"><div><b>' + esc(r.tajuk) + '</b><p>' + esc(r.penerangan || r.kategori) + '</p></div><a href="' + esc(r.url) + '" target="_blank" rel="noopener">Buka</a></article>'; });
    list('achievement', 'achievement-list', function (r) { return '<article class="portal-row"><div><b>' + esc(r.tajuk) + '</b><p>' + esc(r.penerangan || r.kategori) + '</p><small>' + esc(r.tarikh || '') + '</small></div></article>'; }, 'tarikh');
    list('gallery_item', 'gallery-list', function (r) { return '<figure><img src="' + esc(r.image_url) + '" alt="' + esc(r.alt_text || r.tajuk) + '"><figcaption>' + esc(r.tajuk) + '</figcaption></figure>'; }, 'tarikh');
  }
  if (view === 'catalog') {
    var bookSearch = $('book-search');
    var bookCategory = $('book-category');
    var bookStatus = $('book-status');
    var bookCount = $('book-count');
    var bookMount = $('book-list');
    var allBooks = [];
    function fillBookFilter(select, values, emptyLabel) {
      if (!select) return;
      select.innerHTML = '<option value="">' + esc(emptyLabel) + '</option>';
      values.filter(Boolean).sort(function (a, b) { return String(a).localeCompare(String(b), 'ms-MY'); }).forEach(function (value) {
        var option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
    }
    function renderBooks() {
      if (!bookMount) return;
      var query = (bookSearch && bookSearch.value || '').trim().toLocaleLowerCase('ms-MY');
      var category = bookCategory && bookCategory.value || '';
      var status = bookStatus && bookStatus.value || '';
      var books = allBooks.filter(function (book) {
        if (category && book.kategori !== category) return false;
        if (status && book.status !== status) return false;
        if (!query) return true;
        return [book.tajuk, book.pengarang, book.kategori, book.rak].some(function (value) {
          return String(value || '').toLocaleLowerCase('ms-MY').indexOf(query) !== -1;
        });
      });
      if (bookCount) bookCount.textContent = books.length + ' koleksi dipaparkan' + (allBooks.length !== books.length ? ' daripada ' + allBooks.length : '');
      if (!books.length) return empty(bookMount, query ? 'Tiada koleksi yang sepadan ditemui.' : 'Belum ada maklumat untuk dipaparkan.');
      bookMount.innerHTML = books.map(function (r) { return '<article class="portal-row"><div><b>' + esc(r.tajuk) + '</b><p>' + esc(r.pengarang || 'Pengarang belum dinyatakan') + '</p><small>' + esc(r.kategori || 'Umum') + ' | Rak ' + esc(r.rak || '-') + '</small></div><span class="portal-status">' + esc(r.status) + '</span></article>'; }).join('');
    }
    if (bookMount) {
      bookMount.innerHTML = '<div class="portal-empty">Memuatkan katalog PSS...</div>';
      cms.from('pss_book').select('*').order('tajuk').then(function (res) {
        allBooks = res.data || [];
        fillBookFilter(bookCategory, allBooks.map(function (book) { return book.kategori; }), 'Semua kategori');
        fillBookFilter(bookStatus, allBooks.map(function (book) { return book.status; }), 'Semua status');
        renderBooks();
      });
    }
    if (bookSearch) {
      bookSearch.value = new URLSearchParams(location.search).get('cari') || '';
      bookSearch.addEventListener('input', renderBooks);
    }
    if (bookCategory) bookCategory.addEventListener('change', renderBooks);
    if (bookStatus) bookStatus.addEventListener('change', renderBooks);
    list('nilam_stat', 'nilam-list', function (r) { return '<article><b>' + esc(r.kelas) + '</b><span>' + esc(r.jumlah_bacaan) + '</span><small>' + esc(r.murid_aktif) + ' murid aktif</small></article>'; }, 'kelas');
  }
  if (view === 'search' || view === 'home') {
    var input = $('site-search'), results = $('search-results');
    if (input) input.addEventListener('input', async function () {
      var q = input.value.trim(); if (q.length < 2) return empty(results, 'Masukkan sekurang-kurangnya dua huruf untuk mencari.');
      var sources = [['pengumuman','tajuk','Pengumuman'],['takwim','tajuk','Takwim'],['resource_file','tajuk','Muat turun'],['achievement','tajuk','Pencapaian']];
      var all = await Promise.all(sources.map(function (s) { return cms.from(s[0]).select('*').ilike(s[1], '%' + q + '%').limit(8).then(function (r) { return (r.data || []).map(function (x) { return { label:s[2], title:x.tajuk, detail:x.keterangan || x.pengarang || x.kandungan || '' }; }); }); }));
      var items = all.flat(); results.innerHTML = items.length ? items.map(function (x) { return '<article class="portal-row"><div><small>' + esc(x.label) + '</small><b>' + esc(x.title) + '</b><p>' + esc(x.detail) + '</p></div></article>'; }).join('') : '<div class="portal-empty">Tiada padanan ditemui.</div>';
    });
  }
}());
