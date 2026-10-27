import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';

const serverInfo = await startStaticServer();
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const launchOptions = {
  headless: process.env.ADMIN_HEADLESS !== '0',
  ...(process.env.ADMIN_DOWNLOADS_DIR ? { downloadsPath: process.env.ADMIN_DOWNLOADS_DIR } : {}),
  ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : {})
};
const browser = await chromium.launch(launchOptions);
const failures = [];
const screenshotDir = process.env.ADMIN_SCREENSHOTS_DIR;
if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });

const commonStub = String.raw`
(function () {
  window.__xss = false;
  var books = [];
  for (var index = 1; index <= 60; index += 1) {
    books.push({ id: index, tajuk: 'Buku ' + String(index).padStart(3, '0'), pengarang: 'Pengarang ' + index, kategori: index % 2 ? 'Fiksyen' : 'Rujukan', rak: 'R' + Math.ceil(index / 10), status: 'Tersedia', susunan: index });
  }
  window.__db = {
    staff: [{ id: 1, kategori: 'pentadbir', tier: 'pengetua', jawatan: 'Pengetua', nama: '<img src=x onerror="window.__xss=true">', gred: 'DG14', susunan: 1 }],
    pengumuman: [
      { id: 1, portal: 'sekolah', tarikh: '2026-08-24', tajuk: 'Makluman sekolah', kandungan: 'Untuk warga sekolah' },
      { id: 2, portal: 'pss', tarikh: '2026-08-23', tajuk: 'Makluman PSS', kandungan: 'Untuk pengguna PSS' }
    ],
    content_block: [{ id: 1, laman: 'akademik', tajuk: 'Kurikulum', jenis: 'paragraf', kandungan: 'Kandungan contoh', susunan: 10 }],
    takwim: [
      { id: 1, portal: 'sekolah', kategori: 'aktiviti', tarikh_mula: '2026-08-25', tarikh_tamat: null, tajuk: 'Aktiviti sekolah', keterangan: null, susunan: 10 },
      { id: 2, portal: 'pss', kategori: 'aktiviti', tarikh_mula: '2026-08-26', tarikh_tamat: null, tajuk: 'Aktiviti PSS', keterangan: 'Ruang bacaan', susunan: 10 }
    ],
    achievement: [{ id: 1, tarikh: '2026-08-17', tajuk: 'Program sekolah', kategori: 'sekolah', penerangan: 'Ringkasan', pautan: '/program/', susunan: 1, slug: null, kandungan: null, image_url: null, galeri: [] }],
    school_directory: [{ id: 1, kategori: 'pentadbiran', nama: 'Pejabat Sekolah', jawatan: 'Urusan Am', telefon: '04-9250925', emel: 'kra4002@moe.edu.my', susunan: 1 }],
    resource_file: [{ id: 1, kategori: 'borang', tajuk: 'Borang Contoh', penerangan: 'Dokumen contoh', url: 'https://example.com/borang.pdf', susunan: 1 }],
    pss_book: books,
    pss_pinjaman: [{ id: 1, rujukan: 'PSS-001', nama: 'Murid Contoh', kelas: '3 Itqan', bahan: 'Buku Contoh', kod_bahan: 'B001', tarikh_pinjam: '2026-08-20', tarikh_pulang: '2026-08-27', status: 'Direkodkan', catatan: '' }],
    cadangan_buku: [{ id: 1, sumber: 'Pelajar', tajuk: 'Cadangan Contoh', pengarang: 'Penulis', nama: 'Murid Contoh', kelas: '3 Itqan', kategori: 'Fiksyen', sebab: 'Menarik', status: 'Baru', created_at: '2026-08-24T01:00:00Z' }],
    nilam_stat: [{ id: 1, kedudukan: 1, nama: 'Murid Contoh', tingkatan: 'Tingkatan 4', kelas: 'Imtiyaz', jumlah_bacaan: 120, murid_aktif: 0, dikemas_kini: '2026-09-04' }],
    admin_audit_log: [
      { id: 1, action: 'UPDATE', table_name: 'pengumuman', record_id: '2', metadata: { new: { portal: 'pss', tajuk: 'Makluman PSS' } }, created_at: '2026-08-24T01:00:00Z' },
      { id: 2, action: 'INSERT', table_name: 'achievement', record_id: '1', metadata: { new: { tajuk: 'Program sekolah' } }, created_at: '2026-08-23T01:00:00Z' }
    ],
    tempahan: [
      { id: 't1', bilik: 'Bilik PAK 21', tarikh: '2026-08-24', masa_mula: '08:00', masa_tamat: '08:30', label: '08:00-08:30', kumpulan: 'Pagi', nama_pemohon: 'Guru Contoh', kelas: '3 Itqan', tujuan: 'PdPc', guna_lcd: true, status: 'aktif', created_at: '2026-08-23T01:00:00Z' }
    ]
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  var allowedValues = {
    achievement: { kategori: ['akademik', 'kokurikulum', 'sukan', 'sahsiah', 'sekolah'] },
    content_block: { laman: ['akademik', 'kokurikulum', 'asrama', 'hem', 'rujukan_akademik', 'profil'] },
    resource_file: { kategori: ['borang', 'surat', 'pekeliling', 'modul', 'program'] },
    school_directory: { kategori: ['pentadbiran', 'hal_ehwal_murid', 'asrama', 'kaunseling', 'pusat_sumber'] }
  };
  function constraintError(table, payload) {
    var rules = allowedValues[table];
    var items = Array.isArray(payload) ? payload : [payload];
    if (!rules) return null;
    for (var itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      var item = items[itemIndex] || {};
      var columns = Object.keys(rules);
      for (var columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
        var column = columns[columnIndex];
        if (item[column] != null && !rules[column].includes(item[column])) {
          return { message: table + '_' + column + '_check violated' };
        }
      }
    }
    return null;
  }
  function Query(table) {
    this.table = table;
    this.filters = [];
    this.orders = [];
    this.max = null;
    this.slice = null;
    this.action = 'select';
    this.payload = null;
    this.single = false;
  }
  Query.prototype.select = function () { return this; };
  Query.prototype.eq = function (column, value) { this.filters.push(function (row) { return row[column] === value; }); return this; };
  Query.prototype.neq = function (column, value) { this.filters.push(function (row) { return row[column] !== value; }); return this; };
  Query.prototype.order = function (column, options) { this.orders.push({ column: column, ascending: !options || options.ascending !== false }); return this; };
  Query.prototype.limit = function (value) { this.max = value; return this; };
  Query.prototype.range = function (from, to) { this.slice = [from, to + 1]; return this; };
  Query.prototype.or = function () { return this; };
  Query.prototype.maybeSingle = function () { this.single = true; return this; };
  Query.prototype.update = function (payload) { this.action = 'update'; this.payload = payload; return this; };
  Query.prototype.insert = function (payload) { this.action = 'insert'; this.payload = payload; return this; };
  Query.prototype.delete = function () { this.action = 'delete'; return this; };
  Query.prototype.upsert = function (payload, options) { this.action = 'upsert'; this.payload = payload; this.conflict = options && options.onConflict; return this; };
  Query.prototype.run = function () {
    var rows = window.__db[this.table] || [];
    var matches = rows.filter(function (row) { return this.filters.every(function (filter) { return filter(row); }); }, this);
    if (this.action === 'insert' || this.action === 'update' || this.action === 'upsert') {
      var validationError = constraintError(this.table, this.payload);
      if (validationError) return { data: null, error: validationError };
    }
    if (this.action === 'insert') {
      var items = Array.isArray(this.payload) ? this.payload : [this.payload];
      items.forEach(function (item) {
        var next = Object.assign({ id: Math.max(0, ...rows.map(function (row) { return Number(row.id) || 0; })) + 1 }, clone(item));
        rows.push(next);
      });
      return { data: clone(items), error: null };
    }
    if (this.action === 'update') {
      matches.forEach(function (row) { Object.assign(row, clone(this.payload)); }, this);
      return { data: clone(matches), error: null };
    }
    if (this.action === 'delete') {
      window.__db[this.table] = rows.filter(function (row) { return !matches.includes(row); });
      return { data: clone(matches), error: null };
    }
    if (this.action === 'upsert') {
      var existing = rows.find(function (row) { return row[this.conflict] === this.payload[this.conflict]; }, this);
      if (existing) Object.assign(existing, clone(this.payload));
      else rows.push(Object.assign({ id: rows.length + 1 }, clone(this.payload)));
      return { data: clone(this.payload), error: null };
    }
    var output = matches.slice();
    this.orders.slice().reverse().forEach(function (order) {
      output.sort(function (a, b) {
        var result = String(a[order.column] == null ? '' : a[order.column]).localeCompare(String(b[order.column] == null ? '' : b[order.column]), 'ms');
        return order.ascending ? result : -result;
      });
    });
    if (this.slice) output = output.slice(this.slice[0], this.slice[1]);
    if (this.max != null) output = output.slice(0, this.max);
    if (this.single) return { data: output[0] || null, error: null };
    return { data: clone(output), error: null };
  };
  Query.prototype.then = function (resolve, reject) { return Promise.resolve(this.run()).then(resolve, reject); };

  window.sb = {
    from: function (table) { return new Query(table); },
    auth: {
      getUser: async function () { return { data: { user: { id: 'admin-1', email: 'admin@guru.smkajerlun.my' } } }; },
      signOut: async function () {}
    }
  };
  window.refreshAuthBox = async function () {
    var box = document.getElementById('authbox');
    if (box) box.textContent = 'Log masuk sebagai Pentadbir Ujian';
    return { user: { id: 'admin-1' }, admin: true, teacher: { user_id: 'admin-1', nama: 'Pentadbir Ujian', aktif: true } };
  };
  window.showToast = function (title, message, type) {
    var box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'success');
    toast.textContent = title + ': ' + message;
    box.appendChild(toast);
  };
  window.ROOMS = [
    { id: 'Bilik PAK 21', desc: 'Bilik pembelajaran' },
    { id: 'Makmal Bahasa', desc: 'Makmal bahasa' }
  ];
  window.BOOKABLE = window.ROOMS.slice();
  window.findBookable = function (id) { return window.BOOKABLE.find(function (room) { return room.id === id; }); };
  window.tarikhInfo = function () { return { hariIni: '2026-08-24', esok: '2026-08-25', bukaEsok: true }; };
  window.formatMalayDate = function (value) {
    var parts = String(value).split('-').map(Number);
    return new Intl.DateTimeFormat('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])));
  };
  window.formatMalayDateShort = function (value) {
    var parts = String(value).split('-').map(Number);
    return new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])));
  };
}());
`;

async function configurePage(page) {
  await page.addInitScript(function () {
    window.print = function () { window.__adminPrintCalled = true; };
  });
  await page.route('**/supabase.min.js', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.supabase = {};' });
  });
  await page.route('**/tempahan/assets/common.js*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: commonStub });
  });
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push('console: ' + message.text());
  });
  page.on('pageerror', (error) => failures.push('pageerror: ' + String(error)));
}

async function schoolAdminCheck(viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await configurePage(page);
  await page.goto(serverInfo.url + '/admin/?tab=pengumuman', { waitUntil: 'domcontentloaded' });
  await page.locator('#admin-main').waitFor({ state: 'visible' });
  if (!(await page.locator('#admin-health').getAttribute('data-state') === 'ready')) failures.push('school admin: health did not become ready');
  if (await page.locator('.tab-btn').filter({ hasText: 'Galeri' }).count() || await page.locator('#galeri-modal, #galeri-tambah').count()) {
    failures.push('school admin: retired gallery module is still visible');
  }
  const announcementText = await page.locator('#pengumuman-tbody').textContent();
  if (!announcementText.includes('Makluman sekolah') || announcementText.includes('Makluman PSS')) failures.push('school admin: announcement scope mixed');
  await page.locator('#pengumuman-tambah').click();
  if (!(await page.locator('#pengumuman-modal').isVisible())) failures.push('school admin: announcement modal did not open');
  if (await page.evaluate(() => document.activeElement?.id) !== 'f-pengumuman-tajuk') failures.push('school admin: modal focus was not moved to the title field');
  await page.locator('#f-pengumuman-tajuk').fill('Pengumuman baharu');
  await page.locator('#pengumuman-simpan').click();
  await page.locator('#pengumuman-modal').waitFor({ state: 'hidden' });
  if (!(await page.locator('#pengumuman-tbody').textContent()).includes('Pengumuman baharu')) failures.push('school admin: fake create flow did not update the list');

  await page.locator('.tab-btn[data-tab="staf"]').click();
  const staffText = await page.locator('#staf-tbody').textContent();
  if (!staffText.includes('<img src=x')) failures.push('school admin: literal unsafe staff text was lost');
  if (await page.locator('#staf-tbody img').count()) failures.push('school admin: database text was injected as HTML');
  if (await page.evaluate(() => window.__xss)) failures.push('school admin: injected script executed');

  const staffTab = page.locator('.tab-btn[data-tab="staf"]');
  await staffTab.focus();
  await page.keyboard.press('ArrowRight');
  if ((await page.evaluate(() => document.activeElement?.dataset.tab)) !== 'pengumuman') failures.push('school admin: keyboard tab navigation failed');

  await page.locator('.tab-btn[data-tab="kandungan"]').click();
  await page.locator('#kandungan-tambah').click();
  await page.locator('#f-kandungan-jenis').selectOption('definisi');
  await page.locator('#kandungan-contoh').click();
  if (!(await page.locator('#kandungan-preview').isVisible()) || !(await page.locator('#kandungan-preview-body').textContent()).includes('04-9250925')) {
    failures.push('school admin: structured content preview failed');
  }
  page.once('dialog', (dialog) => dialog.accept());
  await page.keyboard.press('Escape');
  await page.locator('#kandungan-modal').waitFor({ state: 'hidden' });

  await page.locator('.tab-btn[data-tab="media"]').click();
  await page.locator('#pencapaian-tambah').click();
  await page.locator('#f-pencapaian-tajuk').fill('Berita Pentadbir Baharu');
  await page.locator('#f-pencapaian-kandungan').fill('Perenggan pertama.\n\nPerenggan kedua.');
  await page.locator('#pencapaian-simpan').click();
  await page.locator('#pencapaian-modal').waitFor({ state: 'hidden' });
  const dynamicAchievement = await page.evaluate(() => window.__db.achievement.find((row) => row.tajuk === 'Berita Pentadbir Baharu'));
  if (!dynamicAchievement || dynamicAchievement.pautan !== '/program/?slug=berita-pentadbir-baharu' || dynamicAchievement.slug !== 'berita-pentadbir-baharu') {
    failures.push('school admin: new article did not receive a stable dynamic link');
  }

  await page.locator('.tab-btn[data-tab="pengumuman"]').click();
  await page.locator('#pengumuman-tambah').click();
  await page.locator('#f-pengumuman-tajuk').fill('Belum simpan');
  page.once('dialog', (dialog) => dialog.accept());
  await page.keyboard.press('Escape');
  await page.locator('#pengumuman-modal').waitFor({ state: 'hidden' });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
  if (overflow) failures.push('school admin: horizontal page overflow at ' + viewport.width + 'px');
  if (screenshotDir) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${screenshotDir}/school-${viewport.width}.png`, fullPage: true });
  }
  await context.close();
}

async function pssAdminCheck(viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await configurePage(page);
  await page.goto(serverInfo.url + '/pss/admin/?tab=kandungan', { waitUntil: 'domcontentloaded' });
  await page.locator('#pss-admin-main').waitFor({ state: 'visible' });
  if ((await page.locator('#pss-admin-health').getAttribute('data-state')) !== 'ready') failures.push('PSS admin: health did not become ready');
  const noticeText = await page.locator('#pss-notice-tbody').textContent();
  if (!noticeText.includes('Makluman PSS') || noticeText.includes('Makluman sekolah')) failures.push('PSS admin: announcement scope mixed');
  const calendarText = await page.locator('#pss-calendar-tbody').textContent();
  if (!calendarText.includes('Aktiviti PSS') || calendarText.includes('Aktiviti sekolah')) failures.push('PSS admin: calendar scope mixed');
  if (!calendarText.includes('Ogos')) failures.push('PSS admin: date did not use the full Malay month');

  await page.locator('.tab-btn[data-tab="katalog"]').click();
  if ((await page.locator('#book-tbody tr').count()) !== 25) failures.push('PSS admin: catalog admin page is not limited to 25 rows');
  await page.locator('#book-next').click();
  if (!(await page.locator('#book-page').textContent()).includes('Halaman 2')) failures.push('PSS admin: catalog next page failed');
  await page.locator('#book-previous').click();
  if (!(await page.locator('#book-page').textContent()).includes('Halaman 1')) failures.push('PSS admin: catalog previous page failed');

  await page.locator('.tab-btn[data-tab="nilam"]').click();
  const nilamText = await page.locator('#nilam-tbody').textContent();
  if (!nilamText.includes('Murid Contoh') || !nilamText.includes('Tingkatan 4') || !nilamText.includes('120')) failures.push('PSS admin: NILAM leaderboard fields did not render');
  await page.locator('#nilam-kedudukan').fill('2');
  await page.locator('#nilam-nama').fill('Murid Baharu');
  await page.locator('#nilam-tingkatan').fill('Tingkatan 5');
  await page.locator('#nilam-kelas').fill('Itqan');
  await page.locator('#nilam-jumlah').fill('80');
  await page.locator('#nilam-save').click();
  const newNilam = await page.evaluate(() => window.__db.nilam_stat.find((row) => row.nama === 'Murid Baharu'));
  if (!newNilam || newNilam.kedudukan !== 2 || newNilam.jumlah_bacaan !== 80) failures.push('PSS admin: NILAM leaderboard save flow did not persist student fields');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
  if (overflow) failures.push('PSS admin: horizontal page overflow at ' + viewport.width + 'px');
  if (screenshotDir) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${screenshotDir}/pss-${viewport.width}.png`, fullPage: true });
  }
  await context.close();
}

async function bookingAdminCheck() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await configurePage(page);
  await page.goto(serverInfo.url + '/tempahan/admin/', { waitUntil: 'domcontentloaded' });
  await page.locator('#admin-main').waitFor({ state: 'visible' });
  if ((await page.locator('#booking-admin-health').getAttribute('data-state')) !== 'ready') failures.push('booking admin: health did not become ready');
  if (!(await page.locator('#booking-admin-status').textContent()).includes('1 rekod')) failures.push('booking admin: load status is missing');
  await page.locator('#report-bilik').selectOption('Bilik PAK 21');
  if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/booking-1440.png`, fullPage: true });
  await page.locator('#report-print').click();
  if (!(await page.evaluate(() => window.__adminPrintCalled === true))) failures.push('booking admin: print command was not triggered');
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  if (pdf.length < 5000) failures.push('booking admin: print/PDF output is too small');
  await context.close();
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  text = text.replace(/^\ufeff/, '');
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (!quoted && character === ',') { row.push(cell); cell = ''; }
    else if (!quoted && (character === '\r' || character === '\n')) {
      row.push(cell); rows.push(row); row = []; cell = '';
      if (character === '\r' && text[index + 1] === '\n') index += 1;
    } else cell += character;
  }
  assert.equal(quoted, false, 'CSV must end outside quoted text.');
  row.push(cell); rows.push(row);
  return rows;
}

async function downloadCsv(page, action, filename) {
  const pending = page.waitForEvent('download');
  await action();
  const download = await pending;
  assert.match(download.suggestedFilename(), filename);
  const text = fs.readFileSync(await download.path(), 'utf8');
  assert.equal(text.charCodeAt(0), 0xfeff, 'CSV keeps its UTF-8 BOM.');
  assert.ok(text.includes('\r\n'), 'CSV keeps CRLF record separators.');
  return parseCsv(text);
}

async function csvDownloadChecks() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await configurePage(page);
  await page.goto(serverInfo.url + '/pss/admin/?tab=pinjaman');
  await page.locator('#pss-admin-main').waitFor({ state: 'visible' });
  await page.evaluate(() => {
    const base = window.__db.pss_pinjaman[0];
    loanRows = [
      { ...base, nama: '\t=1+1', catatan: 'Nama\r=1+1' },
      { ...base, id: 2, nama: 'Nur, "Aisyah"', catatan: 'Baris 1\nBaris 2' },
      { ...base, id: 3, kelas: '4 Itqan', nama: 'Rekod ditapis' }
    ];
    document.getElementById('loan-class').value = '3 Itqan';
  });
  const loans = await downloadCsv(page, () => page.locator('#loan-export').click(), /^laporan-pinjaman-pss-\d{4}-\d{2}-\d{2}\.csv$/);
  assert.equal(loans.length, 6);
  assert.deepEqual(loans[1], ['Jumlah rekod', '2']);
  assert.ok(loans.slice(4).every(row => row.length === 9));
  assert.equal(loans[4][1], "'\t=1+1");
  assert.equal(loans[4][8], 'Nama\r=1+1');
  assert.equal(loans[5][1], 'Nur, "Aisyah"');
  assert.equal(loans[5][8], 'Baris 1\nBaris 2');

  await page.goto(serverInfo.url + '/tempahan/admin/');
  await page.locator('#admin-main').waitFor({ state: 'visible' });
  await page.evaluate(() => {
    const base = window.__db.tempahan[0];
    adminAllEntries = [
      { ...base, nama_pemohon: '\t=1+1', tujuan: 'Nama\r=1+1' },
      { ...base, id: 't2', masa_mula: '09:00', nama_pemohon: 'Nur, "Aisyah"', tujuan: 'Baris 1\nBaris 2' },
      { ...base, id: 't3', status: 'dibatalkan', nama_pemohon: ' \r@SUM(A1)' },
      { ...base, id: 't4', bilik: 'Makmal Bahasa', nama_pemohon: 'Bilik ditapis' }
    ];
    document.getElementById('af-bilik').value = 'Bilik PAK 21';
    document.getElementById('af-tempoh').value = 'semua';
    document.getElementById('af-status').value = 'semua';
    document.getElementById('report-bilik').value = 'Bilik PAK 21';
    document.getElementById('report-period').value = 'tahunan';
    document.getElementById('report-year').value = '2026';
  });
  const bookings = await downloadCsv(page, () => page.evaluate(() => exportFilteredBookings()), /^senarai-tempahan-semua-2026-08-24\.csv$/);
  assert.equal(bookings.length, 10);
  assert.deepEqual(bookings[4], ['Jumlah rekod', '3']);
  assert.ok(bookings.slice(7).every(row => row.length === 9));
  assert.equal(bookings[7][4], "'\t=1+1");
  assert.equal(bookings[7][6], 'Nama\r=1+1');
  assert.ok(bookings.slice(7).some(row => row[4] === 'Nur, "Aisyah"'));
  assert.ok(bookings.slice(7).some(row => row[4] === "' \r@SUM(A1)"));
  const room = await downloadCsv(page, () => page.evaluate(() => downloadRoomReport()), /^laporan-bilik-pak-21-2026-01-01-2026-12-31\.csv$/);
  assert.equal(room.length, 8);
  assert.deepEqual(room[3], ['Jumlah slot aktif', '2']);
  assert.ok(room.slice(6).every(row => row.length === 8));
  assert.equal(room[6][4], "'\t=1+1");
  assert.equal(room[6][6], 'Nama\r=1+1');
  assert.equal(room[7][4], 'Nur, "Aisyah"');
  await context.close();
}

await csvDownloadChecks();
await schoolAdminCheck({ width: 1440, height: 1000 });
await schoolAdminCheck({ width: 390, height: 844 });
await pssAdminCheck({ width: 1440, height: 1000 });
await pssAdminCheck({ width: 390, height: 844 });
await bookingAdminCheck();

await browser.close();
serverInfo.server.close();

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Authenticated admin smoke passed: school, PSS and booking desktop/mobile, keyboard, scope, XSS, PDF and all three CSV downloads');
