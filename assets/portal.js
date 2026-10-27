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
  function loadError(mount, retry, title) {
    mount.innerHTML = '<div class="portal-empty portal-load-error" role="status"><b>' + esc(title || 'Maklumat tidak dapat dimuatkan.') + '</b><p>Semak sambungan internet dan cuba semula.</p><button class="portal-retry" type="button">Cuba semula</button></div>';
    mount.querySelector('button').addEventListener('click', async function () {
      this.disabled = true;
      await retry();
      // Restore keyboard focus only if replacing the button left it on the body.
      if (document.activeElement === document.body) {
        var target = mount.querySelector('.portal-retry') || mount;
        if (target === mount) target.setAttribute('tabindex', '-1');
        target.focus();
      }
    });
  }
  function list(table, mountId, render, order, filter) {
    var mount = $(mountId); if (!mount) return Promise.resolve();
    mount.setAttribute('aria-busy', 'true');
    empty(mount, 'Memuatkan maklumat...');
    function failed() {
      loadError(mount, function () { return list(table, mountId, render, order, filter); });
    }
    var request = cms.from(table).select('*');
    if (filter) request = filter(request);
    return request.order(order || 'susunan').then(function (res) {
      if (res.error) return failed();
      if (!res.data || !res.data.length) return empty(mount, 'Belum ada maklumat untuk dipaparkan.');
      mount.innerHTML = res.data.map(render).join('');
    }).catch(failed).finally(function () { mount.setAttribute('aria-busy', 'false'); });
  }
  function renderSchoolDirectory(mountId) {
    var mount = $(mountId); if (!mount) return;
    var schoolProfile = [
      '<article class="portal-row"><div><b>Sekolah Menengah Kebangsaan Agama Jerlun</b><p>Kod sekolah: KRA 4002</p><small>Kategori: Sekolah Menengah Kebangsaan Agama</small></div></article>',
      '<article class="portal-row"><div><b>Alamat</b><p>Jalan Kodiang, 06100 Kodiang</p><small>Kedah Darul Aman, Malaysia</small></div></article>',
      '<article class="portal-row"><div><b>Hubungan</b><p>Telefon: <a href="tel:+6049250925">04-9250925</a> &middot; Faks: 04-9250926</p><small><a href="mailto:kra4002@moe.edu.my">kra4002@moe.edu.my</a></small></div></article>',
      '<article class="portal-row"><div><b>Media Sosial</b><p>SMK AGAMA Jerlun - FB</p><small>Facebook rasmi sekolah</small></div></article>'
    ];
    mount.innerHTML = schoolProfile.join('');
    cms.from('school_directory').select('*').order('susunan').order('nama').then(function (response) {
      if (response.error || !response.data || !response.data.length) return;
      var contacts = response.data.map(function (row) {
        var contact = [row.telefon, row.emel].filter(Boolean).map(esc).join(' &middot; ');
        return '<article class="portal-row"><div><b>' + esc(row.nama) + '</b><p>' + esc(row.jawatan) + '</p>' +
          '<small>' + (contact || esc(row.kategori)) + '</small></div></article>';
      });
      mount.innerHTML = schoolProfile.concat(contacts).join('');
    });
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
    list('resource_file', 'resource-list', function (r) { return '<article class="portal-row" data-resource-category="' + esc(r.kategori || 'umum') + '"><div><b>' + esc(r.tajuk) + '</b><p>' + esc(r.penerangan || r.kategori) + '</p></div><a href="' + esc(safeUrl(r.url, '#')) + '" target="_blank" rel="noopener">Buka</a></article>'; });
    list('achievement', 'achievement-list', function (r) {
      var href = r.slug ? '/program/?slug=' + encodeURIComponent(r.slug) : safeUrl(r.pautan, '/program/');
      return '<article class="portal-row"><div><b>' + esc(r.tajuk) + '</b><p>' + esc(r.penerangan || 'Program dan aktiviti rasmi sekolah.') + '</p><small>' + esc(r.tarikh || '') + '</small></div><a href="' + esc(href) + '">Baca</a></article>';
    }, 'tarikh', function (query) { return query.eq('kategori', 'sekolah'); });
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
    var bookAvailableTotal = $('book-available-total');
    var bookReset = $('book-reset');
    var bookPagination = $('book-pagination');
    var bookPrevious = $('book-previous');
    var bookNext = $('book-next');
    var bookPageLabel = $('book-page');
    var allBooks = [];
    var bookState = 'loading';
    var bookPage = 1;
    var BOOK_PAGE_SIZE = 10;
    var BOOK_STATUSES = ['Tersedia', 'Dipinjam', 'Rujukan', 'Hilang', 'Rosak', 'Dipulangkan'];
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
    function normalizeBookStatus(status) {
      var value = labelKey(status);
      if (!value) return 'Status belum ditetapkan';
      if (value.indexOf('tersedia') !== -1 || value === 'ada') return 'Tersedia';
      if (value.indexOf('pinjam') !== -1) return 'Dipinjam';
      if (value.indexOf('rujukan') !== -1) return 'Rujukan';
      if (value.indexOf('hilang') !== -1) return 'Hilang';
      if (value.indexOf('rosak') !== -1) return 'Rosak';
      if (value.indexOf('pulang') !== -1) return 'Dipulangkan';
      return labelValue(status);
    }
    function statusClass(status) {
      var value = labelKey(normalizeBookStatus(status));
      if (value === 'tersedia') return 'is-available';
      if (value === 'dipinjam') return 'is-loaned';
      if (value === 'rujukan') return 'is-reference';
      if (value === 'hilang') return 'is-lost';
      if (value === 'rosak') return 'is-damaged';
      if (value === 'dipulangkan') return 'is-returned';
      return 'is-neutral';
    }
    function coverMark(title) {
      return String(title || 'PSS').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(function (word) { return word.charAt(0); }).join('').toUpperCase() || 'PSS';
    }
    function updateBookPagination(totalMatches) {
      var pageCount = Math.max(1, Math.ceil(totalMatches / BOOK_PAGE_SIZE));
      bookPage = Math.min(bookPage, pageCount);
      if (bookPagination) bookPagination.hidden = pageCount <= 1;
      if (bookPageLabel) bookPageLabel.textContent = 'Halaman ' + bookPage + ' daripada ' + pageCount;
      if (bookPrevious) bookPrevious.disabled = bookPage <= 1;
      if (bookNext) bookNext.disabled = bookPage >= pageCount;
    }
    function renderBooks() {
      if (!bookMount || bookState !== 'ready') return;
      var categories = uniqueCount(allBooks.map(function (book) { return book.kategori; }));
      var racks = uniqueCount(allBooks.map(function (book) { return book.rak; }));
      if (bookTotal) bookTotal.textContent = allBooks.length;
      if (bookCategoryTotal) bookCategoryTotal.textContent = Object.keys(categories).length;
      if (bookRackTotal) bookRackTotal.textContent = Object.keys(racks).length;
      if (bookAvailableTotal) bookAvailableTotal.textContent = allBooks.filter(function (book) { return normalizeBookStatus(book.status) === 'Tersedia'; }).length;
      var query = (bookSearch && bookSearch.value || '').trim().toLocaleLowerCase('ms-MY');
      var category = labelKey(bookCategory && bookCategory.value);
      var status = labelKey(bookStatus && bookStatus.value);
      var matches = allBooks.filter(function (book) {
        if (category && labelKey(book.kategori) !== category) return false;
        if (status && labelKey(book.status) !== status) return false;
        if (!query) return true;
        return [book.tajuk, book.pengarang, book.kategori, book.rak].some(function (value) {
          return String(value || '').toLocaleLowerCase('ms-MY').indexOf(query) !== -1;
        });
      });
      updateBookPagination(matches.length);
      var start = (bookPage - 1) * BOOK_PAGE_SIZE;
      var books = matches.slice(start, start + BOOK_PAGE_SIZE);
      if (bookCount) bookCount.textContent = books.length + ' judul dipaparkan' + (matches.length > books.length ? ' daripada ' + matches.length + ' padanan' : '');
      if (!allBooks.length) return catalogEmpty('Koleksi sedang disusun', 'Buku dan bahan rujukan akan dipaparkan di sini selepas rekod katalog ditambah oleh PSS.');
      if (!books.length) return catalogEmpty('Tiada padanan ditemui', 'Cuba kata carian lain atau pilih semula kategori dan status.');
      bookMount.innerHTML = books.map(function (r, index) {
        var status = normalizeBookStatus(r.status);
        return '<article class="catalog-book-card"><div class="catalog-cover cover-' + (index % 5) + '" aria-hidden="true"><span>PSS</span><strong>' + esc(coverMark(r.tajuk)) + '</strong></div><div class="catalog-book-body"><p class="catalog-book-kicker">' + esc(r.kategori || 'Umum') + '</p><h3>' + esc(r.tajuk || 'Tanpa tajuk') + '</h3><p class="catalog-book-author">' + esc(r.pengarang || 'Pengarang belum dinyatakan') + '</p><div class="catalog-book-meta"><span>Rak ' + esc(r.rak || '-') + '</span><span>' + esc(r.kod || 'Koleksi PSS') + '</span></div></div><span class="catalog-book-status ' + statusClass(status) + '">' + esc(status) + '</span></article>';
      }).join('');
    }
    async function loadBooks() {
      bookState = 'loading';
      bookMount.setAttribute('aria-busy', 'true');
      if (bookPagination) bookPagination.hidden = true;
      if (bookCount) bookCount.textContent = 'Memuatkan katalog...';
      bookMount.innerHTML = '<div class="portal-empty">Memuatkan katalog PSS...</div>';
      try {
        var res = await cms.from('pss_book').select('*').order('tajuk');
        if (res.error) throw res.error;
        allBooks = (res.data || []).map(function (book) {
          return Object.assign({}, book, {
            tajuk: labelValue(book.tajuk),
            pengarang: labelValue(book.pengarang),
            kategori: labelValue(book.kategori),
            rak: labelValue(book.rak),
            status: normalizeBookStatus(book.status)
          });
        });
        fillBookFilter(bookCategory, allBooks.map(function (book) { return book.kategori; }), 'Semua kategori');
        fillBookFilter(bookStatus, BOOK_STATUSES, 'Semua status');
        bookState = 'ready';
        renderBooks();
      } catch (error) {
        bookState = 'error';
        if (bookCount) bookCount.textContent = 'Katalog tidak dapat dimuatkan';
        loadError(bookMount, loadBooks, 'Katalog tidak tersedia');
      } finally {
        bookMount.setAttribute('aria-busy', 'false');
      }
    }
    if (bookMount) loadBooks();
    if (bookSearch) {
      bookSearch.value = new URLSearchParams(location.search).get('cari') || '';
      bookSearch.addEventListener('input', function () { bookPage = 1; renderBooks(); });
    }
    if (bookCategory) bookCategory.addEventListener('change', function () { bookPage = 1; renderBooks(); });
    if (bookStatus) bookStatus.addEventListener('change', function () { bookPage = 1; renderBooks(); });
    if (bookPrevious) bookPrevious.addEventListener('click', function () { if (bookPage > 1) { bookPage -= 1; renderBooks(); } });
    if (bookNext) bookNext.addEventListener('click', function () { bookPage += 1; renderBooks(); });
    if (bookReset) bookReset.addEventListener('click', function () {
      if (bookSearch) bookSearch.value = '';
      if (bookCategory) bookCategory.value = '';
      if (bookStatus) bookStatus.value = '';
      bookPage = 1;
      renderBooks();
      if (bookSearch) bookSearch.focus();
    });
    list('nilam_stat', 'nilam-list', function (r) { return '<article><b>' + esc(r.nama || 'Nama murid belum dinyatakan') + '</b><span>' + esc(r.jumlah_bacaan) + '</span><small>' + esc([r.tingkatan, r.kelas].filter(Boolean).join(' · ') || 'Maklumat kelas belum dinyatakan') + '</small></article>'; }, 'kedudukan');
  }
  if (view === 'search' || view === 'home') {
    var input = $('site-search'), results = $('search-results'), count = $('search-count'), searchTimer;
    if (input) input.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(async function () {
        var q = input.value.trim();
        if (count) count.textContent = '';
        if (q.length < 2) return empty(results, 'Masukkan sekurang-kurangnya dua huruf untuk mencari.');
        if (count) count.textContent = 'Mencari...';
        results.innerHTML = '<div class="portal-empty">Mencari maklumat sekolah...</div>';
        var incomplete = false;
        var sources = [
          ['pengumuman', 'tajuk', 'Pengumuman', '/hub/#notis-title'],
          ['takwim', 'tajuk', 'Takwim', '/info/?tab=takwim'],
          ['resource_file', 'tajuk', 'Muat turun', '/perkhidmatan/muat-turun/'],
          ['achievement', 'tajuk', 'Program sekolah', '/program/'],
          ['pss_book', 'tajuk', 'Katalog PSS', '/pss/digital/katalog/?cari=' + encodeURIComponent(q)],
          ['staff', 'nama', 'Warga sekolah', '/info/?tab=warga'],
          ['content_block', 'tajuk', 'Maklumat sekolah', '/info/']
        ];
        var all = await Promise.all(sources.map(function (s) {
          var request = cms.from(s[0]).select('*').ilike(s[1], '%' + q + '%');
          if (s[0] === 'achievement') request = request.eq('kategori', 'sekolah');
          return request.limit(8).then(function (r) {
            if (r.error) incomplete = true;
            return (r.data || []).map(function (x) {
              var href = s[3], label = s[2];
              if (s[0] === 'achievement') href = x.slug ? '/program/?slug=' + encodeURIComponent(x.slug) : (x.pautan || href);
              if (x.portal === 'pss' && s[0] === 'takwim') { href = '/pss/program/kalendar/'; label = 'Kalendar PSS'; }
              if (x.portal === 'pss' && s[0] === 'pengumuman') { href = '/pss/program/pengumuman/'; label = 'Pengumuman PSS'; }
              return { label:label, title:x.tajuk || x.nama, detail:x.keterangan || x.penerangan || x.pengarang || x.kandungan || x.jawatan || '', href:href };
            });
          }).catch(function () { incomplete = true; return []; });
        }));
        if (input.value.trim() !== q) return;
        var pages = [
          ['Profil sekolah', '/info/?tab=profil'], ['Warga sekolah', '/info/?tab=warga'],
          ['Hubungi sekolah', '/info/?tab=hubungi'], ['Akademik', '/akademik/'],
          ['Hal Ehwal Murid', '/hem/', 'HEM'], ['Kokurikulum', '/kokurikulum/'], ['Asrama', '/asrama/'],
          ['Program sekolah', '/program/'], ['Portal Warga', '/hub/'],
          ['Portal PSS', '/pss/', 'pusat sumber perpustakaan'], ['Katalog buku PSS', '/pss/digital/katalog/'],
          ['NILAM', '/pss/digital/nilam/'], ['Kalendar PSS', '/pss/program/kalendar/'],
          ['Pengumuman PSS', '/pss/program/pengumuman/'],
          ['Tempahan bilik', '/tempahan/'], ['Takwim sekolah', '/info/?tab=takwim'],
          ['Borang dan dokumen', '/perkhidmatan/muat-turun/', 'muat turun'],
          ['Direktori sekolah', '/perkhidmatan/direktori/'], ['Rekod klinik', '/perkhidmatan/klinik/'],
          ['Log masuk', '/log-masuk/']
        ].filter(function (item) { return (item[0] + ' ' + (item[2] || '')).toLocaleLowerCase('ms-MY').includes(q.toLocaleLowerCase('ms-MY')); })
          .map(function (item) { return { label: 'Halaman sekolah', title: item[0], detail: 'Maklumat dan perkhidmatan SMK Agama Jerlun.', href: item[1] }; });
        var items = pages.concat(all.flat());
        if (count) count.textContent = items.length + ' hasil dipaparkan.' + (incomplete ? ' Sebahagian maklumat belum dapat dimuatkan. Cuba carian semula.' : '');
        results.innerHTML = items.length ? items.map(function (x) { return '<article class="portal-row"><div><small>' + esc(x.label) + '</small><b>' + esc(x.title) + '</b><p>' + esc(String(x.detail).slice(0, 180)) + '</p></div><a href="' + esc(safeUrl(x.href, '/')) + '" aria-label="Buka ' + esc(x.title) + '">Buka</a></article>'; }).join('') : '<div class="portal-empty">' + (incomplete ? 'Carian belum lengkap. Semak sambungan dan cuba lagi.' : 'Tiada padanan ditemui. Cuba kata yang lebih ringkas atau gunakan pautan rujukan di atas.') + '</div>';
      }, 220);
    });
  }
}());
