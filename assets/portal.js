(function () {
  var view = document.body.dataset.portalView;
  if (!view || !window.cms) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = window.cmsEsc || function (v) { return v; };
  function safeUrl(value, fallback) {
    var raw = String(value || '').trim();
    if (!raw) return fallback || '#';
    try {
      var parsed = new URL(raw, location.origin);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
    } catch (error) { /* invalid CMS URL */ }
    return fallback || '#';
  }
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
    list('resource_file', 'resource-list', function (r) { return '<article class="portal-row"><div><b>' + esc(r.tajuk) + '</b><p>' + esc(r.penerangan || r.kategori) + '</p></div><a href="' + esc(safeUrl(r.url, '#')) + '" target="_blank" rel="noopener">Buka</a></article>'; });
    list('achievement', 'achievement-list', function (r) { return '<article class="portal-row"><div><b>' + esc(r.tajuk) + '</b><p>' + esc(r.penerangan || r.kategori) + '</p><small>' + esc(r.tarikh || '') + '</small></div></article>'; }, 'tarikh');
    list('gallery_item', 'gallery-list', function (r) { return '<figure><img src="' + esc(safeUrl(r.image_url, '/assets/pss-hero.jpg')) + '" alt="' + esc(r.alt_text || r.tajuk) + '"><figcaption>' + esc(r.tajuk) + '</figcaption></figure>'; }, 'tarikh');
  }
  if (view === 'catalog') {
    var bookSearch = $('book-search');
    var bookCategory = $('book-category');
    var bookStatus = $('book-status');
    var bookCount = $('book-count');
    var bookMount = $('book-list');
    var bookTotal = $('book-total');
    var bookCategoryTotal = $('book-category-total');
    var bookRackTotal = $('book-rack-total');
    var bookReset = $('book-reset');
    var allBooks = [];
    function labelValue(value) {
      return String(value == null ? '' : value).trim();
    }
    function labelKey(value) {
      return labelValue(value).toLocaleLowerCase('ms-MY');
    }
    function fillBookFilter(select, values, emptyLabel) {
      if (!select) return;
      select.innerHTML = '<option value="">' + esc(emptyLabel) + '</option>';
      var unique = values.reduce(function (seen, value) {
        var label = labelValue(value), key = labelKey(label);
        if (label && !seen[key]) seen[key] = label;
        return seen;
      }, {});
      Object.keys(unique).map(function (key) { return unique[key]; }).sort(function (a, b) { return a.localeCompare(b, 'ms-MY'); }).forEach(function (value) {
        var option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
    }
    function uniqueCount(values) {
      return values.reduce(function (seen, value) {
        var key = labelKey(value);
        if (key) seen[key] = true;
        return seen;
      }, {});
    }
    function catalogEmpty(title, copy) {
      if (!bookMount) return;
      bookMount.innerHTML = '<div class="catalog-empty"><span class="catalog-empty-mark" aria-hidden="true">+</span><div><b>' + esc(title) + '</b><p>' + esc(copy) + '</p></div></div>';
    }
    function statusClass(status) {
      var value = String(status || '').toLocaleLowerCase('ms-MY');
      if (value.indexOf('tersedia') !== -1 || value === 'ada') return 'is-available';
      if (value.indexOf('pinjam') !== -1) return 'is-loaned';
      if (value.indexOf('hilang') !== -1) return 'is-lost';
      if (value.indexOf('rosak') !== -1) return 'is-damaged';
      if (value.indexOf('pulang') !== -1) return 'is-returned';
      return 'is-neutral';
    }
    function coverMark(title) {
      return String(title || 'PSS').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(function (word) { return word.charAt(0); }).join('').toUpperCase() || 'PSS';
    }
    function renderBooks() {
      if (!bookMount) return;
      var categories = uniqueCount(allBooks.map(function (book) { return book.kategori; }));
      var racks = uniqueCount(allBooks.map(function (book) { return book.rak; }));
      if (bookTotal) bookTotal.textContent = allBooks.length;
      if (bookCategoryTotal) bookCategoryTotal.textContent = Object.keys(categories).length;
      if (bookRackTotal) bookRackTotal.textContent = Object.keys(racks).length;
      var query = (bookSearch && bookSearch.value || '').trim().toLocaleLowerCase('ms-MY');
      var category = labelKey(bookCategory && bookCategory.value);
      var status = labelKey(bookStatus && bookStatus.value);
      var books = allBooks.filter(function (book) {
        if (category && labelKey(book.kategori) !== category) return false;
        if (status && labelKey(book.status) !== status) return false;
        if (!query) return true;
        return [book.tajuk, book.pengarang, book.kategori, book.rak].some(function (value) {
          return String(value || '').toLocaleLowerCase('ms-MY').indexOf(query) !== -1;
        });
      });
      if (bookCount) bookCount.textContent = books.length + ' koleksi dipaparkan' + (allBooks.length !== books.length ? ' daripada ' + allBooks.length : '');
      if (!allBooks.length) return catalogEmpty('Koleksi sedang disusun', 'Buku dan bahan rujukan akan dipaparkan di sini selepas rekod katalog ditambah oleh PSS.');
      if (!books.length) return catalogEmpty('Tiada padanan ditemui', 'Cuba kata carian lain atau pilih semula kategori dan status.');
      bookMount.innerHTML = books.map(function (r, index) {
        var status = r.status || 'Status belum ditetapkan';
        return '<article class="catalog-book-card"><div class="catalog-cover cover-' + (index % 5) + '" aria-hidden="true"><span>PSS</span><strong>' + esc(coverMark(r.tajuk)) + '</strong></div><div class="catalog-book-body"><p class="catalog-book-kicker">' + esc(r.kategori || 'Umum') + '</p><h3>' + esc(r.tajuk || 'Tanpa tajuk') + '</h3><p class="catalog-book-author">' + esc(r.pengarang || 'Pengarang belum dinyatakan') + '</p><div class="catalog-book-meta"><span>Rak ' + esc(r.rak || '-') + '</span><span>' + esc(r.kod || 'Koleksi PSS') + '</span></div></div><span class="catalog-book-status ' + statusClass(status) + '">' + esc(status) + '</span></article>';
      }).join('');
    }
    if (bookMount) {
      bookMount.innerHTML = '<div class="portal-empty">Memuatkan katalog PSS...</div>';
      cms.from('pss_book').select('*').order('tajuk').then(function (res) {
        if (res.error) {
          if (bookCount) bookCount.textContent = 'Katalog tidak dapat dimuatkan';
          return catalogEmpty('Katalog tidak tersedia', 'Cuba muat semula halaman atau hubungi pengurusan PSS.');
        }
        allBooks = (res.data || []).map(function (book) {
          return Object.assign({}, book, {
            tajuk: labelValue(book.tajuk),
            pengarang: labelValue(book.pengarang),
            kategori: labelValue(book.kategori),
            rak: labelValue(book.rak),
            status: labelValue(book.status)
          });
        });
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
    if (bookReset) bookReset.addEventListener('click', function () {
      if (bookSearch) bookSearch.value = '';
      if (bookCategory) bookCategory.value = '';
      if (bookStatus) bookStatus.value = '';
      renderBooks();
      if (bookSearch) bookSearch.focus();
    });
    list('nilam_stat', 'nilam-list', function (r) { return '<article><b>' + esc(r.kelas) + '</b><span>' + esc(r.jumlah_bacaan) + '</span><small>' + esc(r.murid_aktif) + ' murid aktif</small></article>'; }, 'kelas');
  }
  if (view === 'search' || view === 'home') {
    var input = $('site-search'), results = $('search-results'), searchTimer;
    if (input) input.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(async function () {
        var q = input.value.trim();
        if (q.length < 2) return empty(results, 'Masukkan sekurang-kurangnya dua huruf untuk mencari.');
        results.innerHTML = '<div class="portal-empty">Mencari maklumat sekolah...</div>';
        var sources = [
          ['pengumuman', 'tajuk', 'Pengumuman', '/#notis-title'],
          ['takwim', 'tajuk', 'Takwim', '/info/?tab=takwim'],
          ['resource_file', 'tajuk', 'Muat turun', '/perkhidmatan/muat-turun/'],
          ['achievement', 'tajuk', 'Pencapaian', '/kokurikulum/'],
          ['pss_book', 'tajuk', 'Katalog PSS', '/pss/digital/katalog/?cari=' + encodeURIComponent(q)],
          ['staff', 'nama', 'Warga sekolah', '/info/?tab=warga'],
          ['content_block', 'tajuk', 'Maklumat sekolah', '/info/']
        ];
        var all = await Promise.all(sources.map(function (s) {
          return cms.from(s[0]).select('*').ilike(s[1], '%' + q + '%').limit(8).then(function (r) {
            return (r.data || []).map(function (x) { return { label:s[2], title:x.tajuk || x.nama, detail:x.keterangan || x.penerangan || x.pengarang || x.kandungan || x.jawatan || '', href:s[3] }; });
          });
        }));
        var items = all.flat();
        results.innerHTML = items.length ? items.map(function (x) { return '<article class="portal-row"><div><small>' + esc(x.label) + '</small><b>' + esc(x.title) + '</b><p>' + esc(String(x.detail).slice(0, 180)) + '</p></div><a href="' + esc(safeUrl(x.href, '/')) + '">Buka</a></article>'; }).join('') : '<div class="portal-empty">Tiada padanan ditemui.</div>';
      }, 220);
    });
  }
}());
