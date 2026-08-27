const ui = window.adminUI;
const PSS_PORTAL = 'pss';
const BOOK_STATUSES = ['Tersedia', 'Dipinjam', 'Rujukan', 'Hilang', 'Rosak', 'Dipulangkan'];
const LOAN_STATUSES = ['Direkodkan', 'Dipinjam', 'Dipulangkan', 'Lewat', 'Hilang', 'Dibatalkan'];
const PSS_AUDIT_TABLES = new Set(['pengumuman', 'takwim', 'pss_book', 'pss_pinjaman', 'cadangan_buku', 'nilam_stat']);
const BOOK_PAGE_SIZE = 25;

let loanRows = [];
let suggestionRows = [];
let nilamRows = [];
let bookRows = [];
let bookPage = 1;
let noticeRows = [];
let calendarRows = [];
const dirtyForms = new Set();

function setHealth(state, message) {
  const health = document.getElementById('pss-admin-health');
  if (!health) return;
  health.dataset.state = state;
  const label = health.querySelector('span:last-child');
  if (label) label.textContent = message;
}

function todayIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const value = function (type) { return parts.find(function (part) { return part.type === type; }).value; };
  return value('year') + '-' + value('month') + '-' + value('day');
}

function isoDate(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function weekRange() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  const from = isoDate(date);
  date.setDate(date.getDate() + 6);
  return { from: from, to: isoDate(date) };
}

function bookStatusSlug(status) {
  const value = String(status || '').toLocaleLowerCase('ms-MY');
  if (value.includes('tersedia') || value === 'ada') return 'available';
  if (value === 'rujukan') return 'reference';
  if (value.includes('pinjam') || value.includes('rekod')) return 'loaned';
  if (value.includes('hilang')) return 'lost';
  if (value.includes('rosak')) return 'damaged';
  if (value.includes('pulang')) return 'returned';
  if (value.includes('lewat')) return 'overdue';
  if (value.includes('batal')) return 'cancelled';
  return 'neutral';
}

function normalizeBookStatus(status) {
  const value = String(status || '').toLocaleLowerCase('ms-MY');
  if (value.includes('tersedia') || value === 'ada') return 'Tersedia';
  if (value.includes('pinjam')) return 'Dipinjam';
  if (value.includes('rujukan')) return 'Rujukan';
  if (value.includes('hilang')) return 'Hilang';
  if (value.includes('rosak')) return 'Rosak';
  if (value.includes('pulang')) return 'Dipulangkan';
  return status || 'Tersedia';
}

function statusClass(status) {
  return 'status-badge status-' + bookStatusSlug(status);
}

function renderBookStatusSummary() {
  const mount = document.getElementById('book-status-summary');
  if (!mount) return;
  const counts = BOOK_STATUSES.reduce(function (result, status) {
    result[status] = 0;
    return result;
  }, {});
  bookRows.forEach(function (book) {
    if (Object.prototype.hasOwnProperty.call(counts, book.status)) counts[book.status] += 1;
  });
  mount.replaceChildren();
  BOOK_STATUSES.forEach(function (status) {
    const item = document.createElement('span');
    item.className = 'book-status-chip status-' + bookStatusSlug(status);
    const label = document.createElement('span');
    label.textContent = status;
    const count = document.createElement('b');
    count.textContent = counts[status];
    item.append(label, count);
    mount.appendChild(item);
  });
}

function actionCell(onEdit, onDelete) {
  const cell = document.createElement('td');
  cell.className = 'admin-table-actions';
  cell.append(
    ui.createButton('Ubah', 'btn-edit', onEdit),
    ui.createButton('Padam', 'btn-danger', onDelete)
  );
  return cell;
}

function setDirty(formId, value) {
  if (value) dirtyForms.add(formId);
  else dirtyForms.delete(formId);
}

function canReplaceForm(formId) {
  return !dirtyForms.has(formId) || window.confirm('Perubahan dalam borang ini belum disimpan. Teruskan dan gantikan perubahan tersebut?');
}

function resetWithConfirmation(formId, reset) {
  if (!canReplaceForm(formId)) return;
  reset();
}

async function fetchAllRows(table, configure) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    let query = sb.from(table).select('*');
    if (configure) query = configure(query);
    const response = await query.range(from, from + pageSize - 1);
    if (response.error) return { data: null, error: response.error };
    const page = response.data || [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
  }
}

function confirmDelete(label) {
  return window.confirm('Padam ' + label + '? Tindakan ini akan direkodkan dalam log perubahan.');
}

async function deleteScopedRow(table, id, label, reload, scoped) {
  if (!confirmDelete(label)) return;
  let request = sb.from(table).delete().eq('id', id);
  if (scoped) request = request.eq('portal', PSS_PORTAL);
  const response = await request;
  if (response.error) {
    showToast('Ralat', label + ' tidak dapat dipadam: ' + response.error.message, 'error');
    return;
  }
  await reload();
  showToast('Rekod dipadam', label + ' telah dipadam.', 'success');
}

function renderStats() {
  const today = new Date();
  const month = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
  const range = weekRange();
  document.getElementById('stat-all').textContent = loanRows.length;
  document.getElementById('stat-month').textContent = loanRows.filter(function (row) {
    return String(row.tarikh_pinjam || '').startsWith(month);
  }).length;
  document.getElementById('stat-return-week').textContent = loanRows.filter(function (row) {
    return row.tarikh_pulang >= range.from && row.tarikh_pulang <= range.to;
  }).length;
  document.getElementById('stat-suggestions').textContent = suggestionRows.length;
  document.getElementById('stat-suggestion-new').textContent = suggestionRows.filter(function (row) {
    return row.status === 'Baru';
  }).length;
}

// ---------------------------------------------------------------------------
// Kandungan PSS
// ---------------------------------------------------------------------------
function resetNoticeForm() {
  document.getElementById('pss-notice-form').reset();
  document.getElementById('pss-notice-id').value = '';
  document.getElementById('pss-notice-date').value = todayIso();
  document.getElementById('pss-notice-save').textContent = 'Simpan Pengumuman';
  setDirty('pss-notice-form', false);
}

function editNotice(row) {
  if (!canReplaceForm('pss-notice-form')) return;
  document.getElementById('pss-notice-id').value = row.id;
  document.getElementById('pss-notice-date').value = row.tarikh;
  document.getElementById('pss-notice-title').value = row.tajuk || '';
  document.getElementById('pss-notice-content').value = row.kandungan || '';
  document.getElementById('pss-notice-save').textContent = 'Kemas Kini Pengumuman';
  setDirty('pss-notice-form', false);
  document.getElementById('pss-notice-title').focus();
}

function renderNotices() {
  const tbody = document.getElementById('pss-notice-tbody');
  tbody.replaceChildren();
  noticeRows.forEach(function (row) {
    const tr = document.createElement('tr');
    tr.append(
      ui.createCell(ui.formatDate(row.tarikh)),
      ui.createCell(row.tajuk, 'admin-table-title'),
      actionCell(function () { editNotice(row); }, function () {
        deleteScopedRow('pengumuman', row.id, 'pengumuman ' + row.tajuk, loadNotices, true);
      })
    );
    tbody.appendChild(tr);
  });
  ui.showEmpty('pss-notice-empty', !noticeRows.length);
}

async function loadNotices() {
  ui.setMessage('pss-notice-message', 'Memuatkan pengumuman PSS...', 'loading');
  const response = await sb.from('pengumuman').select('*').eq('portal', PSS_PORTAL)
    .order('tarikh', { ascending: false }).order('id', { ascending: false });
  if (response.error) {
    noticeRows = [];
    document.getElementById('pss-notice-tbody').replaceChildren();
    ui.showLoadError('pss-notice-empty', 'pss-notice-message', 'Pengumuman PSS', response.error);
    return false;
  }
  noticeRows = response.data || [];
  renderNotices();
  ui.setMessage('pss-notice-message', noticeRows.length + ' pengumuman PSS.', 'success');
  return true;
}

async function saveNotice(event) {
  event.preventDefault();
  const id = document.getElementById('pss-notice-id').value;
  const tarikh = document.getElementById('pss-notice-date').value;
  const tajuk = document.getElementById('pss-notice-title').value.trim();
  if (!tarikh || !tajuk) {
    ui.setMessage('pss-notice-message', 'Sila isi tarikh dan tajuk pengumuman.', 'error');
    return;
  }
  const payload = {
    portal: PSS_PORTAL,
    tarikh: tarikh,
    tajuk: tajuk,
    kandungan: document.getElementById('pss-notice-content').value.trim() || null
  };
  const button = document.getElementById('pss-notice-save');
  ui.setBusy(button, true, 'Menyimpan...');
  const response = id
    ? await sb.from('pengumuman').update(payload).eq('id', id).eq('portal', PSS_PORTAL)
    : await sb.from('pengumuman').insert(payload);
  ui.setBusy(button, false);
  if (response.error) {
    ui.setMessage('pss-notice-message', 'Pengumuman tidak dapat disimpan: ' + response.error.message, 'error');
    return;
  }
  resetNoticeForm();
  await loadNotices();
  showToast('Berjaya', 'Pengumuman PSS disimpan.', 'success');
}

function resetCalendarForm() {
  document.getElementById('pss-calendar-form').reset();
  document.getElementById('pss-calendar-id').value = '';
  document.getElementById('pss-calendar-order').value = 10;
  document.getElementById('pss-calendar-save').textContent = 'Simpan Aktiviti';
  setDirty('pss-calendar-form', false);
}

function editCalendar(row) {
  if (!canReplaceForm('pss-calendar-form')) return;
  document.getElementById('pss-calendar-id').value = row.id;
  document.getElementById('pss-calendar-start').value = row.tarikh_mula;
  document.getElementById('pss-calendar-end').value = row.tarikh_tamat || '';
  document.getElementById('pss-calendar-title').value = row.tajuk || '';
  document.getElementById('pss-calendar-detail').value = row.keterangan || '';
  document.getElementById('pss-calendar-order').value = row.susunan || 0;
  document.getElementById('pss-calendar-save').textContent = 'Kemas Kini Aktiviti';
  setDirty('pss-calendar-form', false);
  document.getElementById('pss-calendar-title').focus();
}

function renderCalendarRows() {
  const tbody = document.getElementById('pss-calendar-tbody');
  tbody.replaceChildren();
  calendarRows.forEach(function (row) {
    const tr = document.createElement('tr');
    const range = ui.formatDate(row.tarikh_mula) +
      (row.tarikh_tamat && row.tarikh_tamat !== row.tarikh_mula ? ' - ' + ui.formatDate(row.tarikh_tamat) : '');
    tr.append(
      ui.createCell(range),
      ui.createCell(row.tajuk, 'admin-table-title'),
      actionCell(function () { editCalendar(row); }, function () {
        deleteScopedRow('takwim', row.id, 'aktiviti ' + row.tajuk, loadCalendar, true);
      })
    );
    tbody.appendChild(tr);
  });
  ui.showEmpty('pss-calendar-empty', !calendarRows.length);
}

async function loadCalendar() {
  ui.setMessage('pss-calendar-message', 'Memuatkan kalendar PSS...', 'loading');
  const response = await sb.from('takwim').select('*').eq('portal', PSS_PORTAL)
    .eq('kategori', 'aktiviti').order('tarikh_mula').order('susunan');
  if (response.error) {
    calendarRows = [];
    document.getElementById('pss-calendar-tbody').replaceChildren();
    ui.showLoadError('pss-calendar-empty', 'pss-calendar-message', 'Kalendar PSS', response.error);
    return false;
  }
  calendarRows = response.data || [];
  renderCalendarRows();
  ui.setMessage('pss-calendar-message', calendarRows.length + ' aktiviti PSS.', 'success');
  return true;
}

async function saveCalendar(event) {
  event.preventDefault();
  const id = document.getElementById('pss-calendar-id').value;
  const start = document.getElementById('pss-calendar-start').value;
  const end = document.getElementById('pss-calendar-end').value;
  const title = document.getElementById('pss-calendar-title').value.trim();
  if (!start || !title) {
    ui.setMessage('pss-calendar-message', 'Sila isi tarikh mula dan tajuk aktiviti.', 'error');
    return;
  }
  if (end && end < start) {
    ui.setMessage('pss-calendar-message', 'Tarikh tamat tidak boleh lebih awal daripada tarikh mula.', 'error');
    return;
  }
  const payload = {
    portal: PSS_PORTAL,
    kategori: 'aktiviti',
    tarikh_mula: start,
    tarikh_tamat: end || null,
    tajuk: title,
    keterangan: document.getElementById('pss-calendar-detail').value.trim() || null,
    susunan: Number(document.getElementById('pss-calendar-order').value || 0)
  };
  const button = document.getElementById('pss-calendar-save');
  ui.setBusy(button, true, 'Menyimpan...');
  const response = id
    ? await sb.from('takwim').update(payload).eq('id', id).eq('portal', PSS_PORTAL)
    : await sb.from('takwim').insert(payload);
  ui.setBusy(button, false);
  if (response.error) {
    ui.setMessage('pss-calendar-message', 'Aktiviti tidak dapat disimpan: ' + response.error.message, 'error');
    return;
  }
  resetCalendarForm();
  await loadCalendar();
  showToast('Berjaya', 'Aktiviti PSS disimpan.', 'success');
}

// ---------------------------------------------------------------------------
// Pinjaman
// ---------------------------------------------------------------------------
function filteredLoanRows() {
  const needle = document.getElementById('loan-search').value.trim().toLocaleLowerCase('ms-MY');
  const from = document.getElementById('loan-from').value;
  const to = document.getElementById('loan-to').value;
  const kelas = document.getElementById('loan-class').value.trim().toLocaleLowerCase('ms-MY');
  const murid = document.getElementById('loan-student').value.trim().toLocaleLowerCase('ms-MY');
  return loanRows.filter(function (row) {
    const haystack = [row.rujukan, row.nama, row.kelas, row.bahan, row.kod_bahan].join(' ').toLocaleLowerCase('ms-MY');
    return (!needle || haystack.includes(needle)) &&
      (!from || row.tarikh_pinjam >= from) &&
      (!to || row.tarikh_pinjam <= to) &&
      (!kelas || String(row.kelas || '').toLocaleLowerCase('ms-MY').includes(kelas)) &&
      (!murid || String(row.nama || '').toLocaleLowerCase('ms-MY').includes(murid));
  });
}

function renderLoans() {
  const rows = filteredLoanRows();
  const tbody = document.getElementById('loan-tbody');
  tbody.replaceChildren();
  rows.forEach(function (row) {
    const tr = document.createElement('tr');
    [
      row.rujukan,
      (row.nama || '-') + (row.kelas ? ' (' + row.kelas + ')' : ''),
      (row.bahan || '-') + (row.kod_bahan ? ' | ' + row.kod_bahan : ''),
      ui.formatDate(row.tarikh_pinjam),
      ui.formatDate(row.tarikh_pulang)
    ].forEach(function (value) { tr.appendChild(ui.createCell(value)); });
    const statusCell = document.createElement('td');
    const select = document.createElement('select');
    select.className = statusClass(row.status);
    select.setAttribute('aria-label', 'Status pinjaman ' + (row.rujukan || ''));
    LOAN_STATUSES.forEach(function (value) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      option.selected = row.status === value;
      select.appendChild(option);
    });
    select.addEventListener('change', function () { updateLoanStatus(row, select); });
    statusCell.appendChild(select);
    tr.append(statusCell, ui.createCell(row.catatan));
    tbody.appendChild(tr);
  });
  ui.showEmpty('loan-empty', !rows.length);
  ui.setMessage('loan-message', rows.length + ' daripada ' + loanRows.length + ' rekod dipaparkan.', 'success');
}

async function updateLoanStatus(row, select) {
  const previous = row.status;
  const status = select.value;
  select.disabled = true;
  const response = await sb.from('pss_pinjaman').update({ status: status }).eq('id', row.id);
  select.disabled = false;
  if (response.error) {
    select.value = previous;
    select.className = statusClass(previous);
    showToast('Ralat', 'Status pinjaman tidak dapat dikemas kini: ' + response.error.message, 'error');
    return;
  }
  row.status = status;
  select.className = statusClass(status);
  showToast('Status dikemas kini', 'Perubahan pinjaman telah direkodkan.', 'success');
}

async function loadLoans() {
  ui.setMessage('loan-message', 'Memuatkan rekod pinjaman...', 'loading');
  const response = await fetchAllRows('pss_pinjaman', function (query) {
    return query.order('tarikh_pinjam', { ascending: false }).order('id', { ascending: false });
  });
  if (response.error) {
    loanRows = [];
    document.getElementById('loan-tbody').replaceChildren();
    ui.showLoadError('loan-empty', 'loan-message', 'Rekod pinjaman', response.error);
    return false;
  }
  loanRows = response.data || [];
  renderStats();
  renderLoans();
  return true;
}

function csvValue(value) {
  let text = String(value == null ? '' : value);
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function exportLoans() {
  const rows = filteredLoanRows();
  if (!rows.length) {
    showToast('Tiada rekod', 'Tiada rekod pinjaman dalam penapis semasa.', 'error');
    return;
  }
  const lines = [
    ['Laporan Pinjaman PSS SMK Agama Jerlun'],
    ['Jumlah rekod', rows.length],
    [],
    ['Rujukan', 'Nama', 'Kelas', 'Bahan', 'Kod Bahan', 'Tarikh Pinjam', 'Tarikh Pulang', 'Status', 'Catatan']
  ];
  rows.forEach(function (row) {
    lines.push([row.rujukan, row.nama, row.kelas, row.bahan, row.kod_bahan, row.tarikh_pinjam, row.tarikh_pulang, row.status, row.catatan]);
  });
  const blob = new Blob(['\ufeff' + lines.map(function (line) { return line.map(csvValue).join(','); }).join('\r\n')], {
    type: 'text/csv;charset=utf-8'
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'laporan-pinjaman-pss-' + todayIso() + '.csv';
  link.click();
  window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
}

// ---------------------------------------------------------------------------
// Katalog buku
// ---------------------------------------------------------------------------
function resetBookForm() {
  document.getElementById('book-form').reset();
  document.getElementById('book-id').value = '';
  document.getElementById('book-status').value = 'Tersedia';
  document.getElementById('book-order').value = 0;
  document.getElementById('book-submit').textContent = 'Simpan Buku';
  setDirty('book-form', false);
}

function filteredBooks() {
  const needle = document.getElementById('book-search').value.trim().toLocaleLowerCase('ms-MY');
  const status = document.getElementById('book-filter-status').value;
  return bookRows.filter(function (book) {
    const haystack = [book.tajuk, book.pengarang, book.kategori, book.rak].join(' ').toLocaleLowerCase('ms-MY');
    return (!needle || haystack.includes(needle)) && (!status || book.status === status);
  });
}

function editBook(book) {
  if (!canReplaceForm('book-form')) return;
  document.getElementById('book-id').value = book.id;
  document.getElementById('book-title').value = book.tajuk || '';
  document.getElementById('book-author').value = book.pengarang || '';
  document.getElementById('book-category').value = book.kategori || '';
  document.getElementById('book-rack').value = book.rak || '';
  document.getElementById('book-status').value = book.status || 'Tersedia';
  document.getElementById('book-order').value = book.susunan || 0;
  document.getElementById('book-submit').textContent = 'Kemas Kini Buku';
  setDirty('book-form', false);
  document.getElementById('book-title').focus();
}

function renderBooks() {
  renderBookStatusSummary();
  const matches = filteredBooks();
  const pageCount = Math.max(1, Math.ceil(matches.length / BOOK_PAGE_SIZE));
  bookPage = Math.min(bookPage, pageCount);
  const pageRows = matches.slice((bookPage - 1) * BOOK_PAGE_SIZE, bookPage * BOOK_PAGE_SIZE);
  const tbody = document.getElementById('book-tbody');
  tbody.replaceChildren();
  pageRows.forEach(function (book) {
    const tr = document.createElement('tr');
    [book.tajuk, book.pengarang, book.kategori, book.rak].forEach(function (value) {
      tr.appendChild(ui.createCell(value, value === book.tajuk ? 'admin-table-title' : ''));
    });
    const statusCell = document.createElement('td');
    const select = document.createElement('select');
    select.className = statusClass(book.status);
    select.setAttribute('aria-label', 'Status buku ' + book.tajuk);
    BOOK_STATUSES.forEach(function (value) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      option.selected = book.status === value;
      select.appendChild(option);
    });
    select.addEventListener('change', function () { updateBookStatus(book, select); });
    statusCell.appendChild(select);
    tr.append(
      statusCell,
      actionCell(function () { editBook(book); }, function () { deleteBook(book); })
    );
    tbody.appendChild(tr);
  });
  document.getElementById('book-page').textContent = 'Halaman ' + bookPage + ' daripada ' + pageCount;
  document.getElementById('book-previous').disabled = bookPage <= 1;
  document.getElementById('book-next').disabled = bookPage >= pageCount;
  document.getElementById('book-pagination').hidden = matches.length <= BOOK_PAGE_SIZE;
  ui.showEmpty('book-empty', !matches.length);
  ui.setMessage('book-message', matches.length + ' daripada ' + bookRows.length + ' bahan sepadan.', 'success');
}

async function loadBooks() {
  ui.setMessage('book-message', 'Memuatkan katalog...', 'loading');
  const response = await fetchAllRows('pss_book', function (query) {
    return query.order('susunan').order('tajuk').order('id');
  });
  if (response.error) {
    bookRows = [];
    document.getElementById('book-tbody').replaceChildren();
    renderBookStatusSummary();
    ui.showLoadError('book-empty', 'book-message', 'Katalog', response.error);
    return false;
  }
  bookRows = (response.data || []).map(function (book) {
    return Object.assign({}, book, { status: normalizeBookStatus(book.status) });
  });
  bookPage = 1;
  renderBooks();
  return true;
}

async function updateBookStatus(book, select) {
  const previous = book.status;
  const status = select.value;
  select.disabled = true;
  const response = await sb.from('pss_book').update({ status: status }).eq('id', book.id);
  select.disabled = false;
  if (response.error) {
    select.value = previous;
    select.className = statusClass(previous);
    showToast('Ralat', 'Status buku tidak dapat dikemas kini: ' + response.error.message, 'error');
    return;
  }
  book.status = status;
  select.className = statusClass(status);
  renderBookStatusSummary();
  showToast('Status buku dikemas kini', 'Perubahan telah direkodkan.', 'success');
}

async function deleteBook(book) {
  if (!confirmDelete('rekod buku ' + book.tajuk)) return;
  const response = await sb.from('pss_book').delete().eq('id', book.id);
  if (response.error) {
    showToast('Ralat', 'Buku tidak dapat dipadam: ' + response.error.message, 'error');
    return;
  }
  await loadBooks();
  showToast('Rekod dipadam', 'Buku telah dipadam daripada katalog.', 'success');
}

async function saveBook(event) {
  event.preventDefault();
  const id = document.getElementById('book-id').value;
  const title = document.getElementById('book-title').value.trim();
  if (!title) {
    ui.setMessage('book-message', 'Sila isi tajuk buku.', 'error');
    return;
  }
  const payload = {
    tajuk: title,
    pengarang: document.getElementById('book-author').value.trim() || null,
    kategori: document.getElementById('book-category').value.trim() || null,
    rak: document.getElementById('book-rack').value.trim() || null,
    status: document.getElementById('book-status').value,
    susunan: Number(document.getElementById('book-order').value || 0)
  };
  const button = document.getElementById('book-submit');
  ui.setBusy(button, true, 'Menyimpan...');
  const response = id
    ? await sb.from('pss_book').update(payload).eq('id', id)
    : await sb.from('pss_book').insert(payload);
  ui.setBusy(button, false);
  if (response.error) {
    ui.setMessage('book-message', 'Buku tidak dapat disimpan: ' + response.error.message, 'error');
    return;
  }
  resetBookForm();
  await loadBooks();
  showToast('Katalog disimpan', 'Rekod buku telah dikemas kini.', 'success');
}

// ---------------------------------------------------------------------------
// Cadangan buku
// ---------------------------------------------------------------------------
function renderSuggestions() {
  const needle = document.getElementById('suggestion-search').value.trim().toLocaleLowerCase('ms-MY');
  const rows = suggestionRows.filter(function (row) {
    return [row.tajuk, row.pengarang, row.nama, row.kelas].join(' ').toLocaleLowerCase('ms-MY').includes(needle);
  });
  const tbody = document.getElementById('suggestion-tbody');
  tbody.replaceChildren();
  rows.forEach(function (row) {
    const tr = document.createElement('tr');
    const titleCell = document.createElement('td');
    const title = document.createElement('b');
    title.textContent = row.tajuk || '-';
    const author = document.createElement('small');
    author.className = 'admin-table-meta';
    author.textContent = row.pengarang || 'Pengarang tidak dinyatakan';
    titleCell.append(title, author);
    tr.append(
      titleCell,
      ui.createCell((row.nama || '-') + (row.kelas ? ' (' + row.kelas + ')' : '')),
      ui.createCell(row.kategori),
      ui.createCell(row.sebab)
    );
    const statusCell = document.createElement('td');
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Status cadangan ' + (row.tajuk || ''));
    ['Baru', 'Dalam Semakan', 'Dipilih', 'Tidak Diteruskan'].forEach(function (value) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      option.selected = row.status === value;
      select.appendChild(option);
    });
    select.addEventListener('change', function () { updateSuggestionStatus(row, select); });
    statusCell.appendChild(select);
    tr.appendChild(statusCell);
    tbody.appendChild(tr);
  });
  ui.showEmpty('suggestion-empty', !rows.length);
  ui.setMessage('suggestion-message', rows.length + ' daripada ' + suggestionRows.length + ' cadangan dipaparkan.', 'success');
}

async function loadSuggestions() {
  ui.setMessage('suggestion-message', 'Memuatkan cadangan buku...', 'loading');
  const response = await fetchAllRows('cadangan_buku', function (query) {
    return query.eq('sumber', 'Pelajar').order('created_at', { ascending: false }).order('id', { ascending: false });
  });
  if (response.error) {
    suggestionRows = [];
    document.getElementById('suggestion-tbody').replaceChildren();
    ui.showLoadError('suggestion-empty', 'suggestion-message', 'Cadangan buku', response.error);
    return false;
  }
  suggestionRows = response.data || [];
  renderStats();
  renderSuggestions();
  return true;
}

async function updateSuggestionStatus(row, select) {
  const previous = row.status;
  const status = select.value;
  select.disabled = true;
  const response = await sb.from('cadangan_buku').update({ status: status }).eq('id', row.id);
  select.disabled = false;
  if (response.error) {
    select.value = previous;
    showToast('Ralat', 'Status cadangan tidak dapat dikemas kini: ' + response.error.message, 'error');
    return;
  }
  row.status = status;
  renderStats();
  showToast('Status dikemas kini', 'Cadangan murid telah dikemas kini.', 'success');
}

// ---------------------------------------------------------------------------
// NILAM
// ---------------------------------------------------------------------------
function renderNilam() {
  const tbody = document.getElementById('nilam-tbody');
  tbody.replaceChildren();
  nilamRows.forEach(function (row) {
    const tr = document.createElement('tr');
    [row.kelas, row.jumlah_bacaan, row.murid_aktif, ui.formatDate(row.dikemas_kini)].forEach(function (value) {
      tr.appendChild(ui.createCell(value));
    });
    tbody.appendChild(tr);
  });
  ui.showEmpty('nilam-empty', !nilamRows.length);
}

async function loadNilam() {
  ui.setMessage('nilam-message', 'Memuatkan statistik NILAM...', 'loading');
  const response = await sb.from('nilam_stat').select('*').order('jumlah_bacaan', { ascending: false });
  if (response.error) {
    nilamRows = [];
    document.getElementById('nilam-tbody').replaceChildren();
    ui.showLoadError('nilam-empty', 'nilam-message', 'Statistik NILAM', response.error);
    return false;
  }
  nilamRows = response.data || [];
  renderNilam();
  ui.setMessage('nilam-message', nilamRows.length + ' kelas direkodkan.', 'success');
  return true;
}

async function saveNilam(event) {
  event.preventDefault();
  const kelas = document.getElementById('nilam-kelas').value.trim();
  const jumlahBacaan = Number(document.getElementById('nilam-jumlah').value);
  const muridAktif = Number(document.getElementById('nilam-murid').value);
  if (!kelas || !Number.isFinite(jumlahBacaan) || !Number.isFinite(muridAktif) || jumlahBacaan < 0 || muridAktif < 0) {
    ui.setMessage('nilam-message', 'Sila isi maklumat NILAM yang sah.', 'error');
    return;
  }
  const button = document.getElementById('nilam-save');
  ui.setBusy(button, true, 'Menyimpan...');
  const response = await sb.from('nilam_stat').upsert({
    kelas: kelas,
    jumlah_bacaan: jumlahBacaan,
    murid_aktif: muridAktif,
    dikemas_kini: todayIso()
  }, { onConflict: 'kelas' });
  ui.setBusy(button, false);
  if (response.error) {
    ui.setMessage('nilam-message', 'Statistik NILAM tidak dapat disimpan: ' + response.error.message, 'error');
    return;
  }
  document.getElementById('nilam-form').reset();
  setDirty('nilam-form', false);
  await loadNilam();
  showToast('Berjaya', 'Statistik NILAM disimpan.', 'success');
}

// ---------------------------------------------------------------------------
// Audit log PSS
// ---------------------------------------------------------------------------
function auditSummary(row) {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const record = metadata.new || metadata.old || {};
  return record.tajuk || record.nama || record.rujukan || record.kelas ||
    (record.status ? 'Status: ' + record.status : 'Perubahan rekod direkodkan.');
}

async function loadAudit() {
  ui.setMessage('audit-message', 'Memuatkan log perubahan...', 'loading');
  const response = await sb.from('admin_audit_log')
    .select('id,action,table_name,record_id,metadata,created_at')
    .order('created_at', { ascending: false }).limit(200);
  const tbody = document.getElementById('audit-tbody');
  tbody.replaceChildren();
  if (response.error) {
    ui.showLoadError('audit-empty', 'audit-message', 'Log perubahan', response.error);
    return false;
  }
  const rows = (response.data || []).filter(function (row) {
    if (!PSS_AUDIT_TABLES.has(row.table_name)) return false;
    if (!['pengumuman', 'takwim'].includes(row.table_name)) return true;
    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const record = metadata.new || metadata.old || {};
    return record.portal === PSS_PORTAL;
  });
  rows.forEach(function (row) {
    const tr = document.createElement('tr');
    const actionCell = document.createElement('td');
    const action = document.createElement('span');
    action.className = 'audit-action';
    action.dataset.action = row.action;
    action.textContent = row.action;
    actionCell.appendChild(action);
    tr.append(
      ui.createCell(ui.formatDateTime(row.created_at)),
      actionCell,
      ui.createCell(row.table_name),
      ui.createCell(row.record_id),
      ui.createCell(auditSummary(row), 'audit-detail')
    );
    tbody.appendChild(tr);
  });
  ui.showEmpty('audit-empty', !rows.length);
  ui.setMessage('audit-message', rows.length ? rows.length + ' perubahan PSS dipaparkan.' : '', 'success');
  return true;
}

function bindEvents() {
  ui.bindTabs({ buttonSelector: '.tab-btn', paneSelector: '.admin-tabpane' });
  resetNoticeForm();
  resetCalendarForm();

  document.getElementById('pss-notice-form').addEventListener('submit', saveNotice);
  document.getElementById('pss-notice-cancel').addEventListener('click', function () {
    resetWithConfirmation('pss-notice-form', resetNoticeForm);
  });
  document.getElementById('pss-calendar-form').addEventListener('submit', saveCalendar);
  document.getElementById('pss-calendar-cancel').addEventListener('click', function () {
    resetWithConfirmation('pss-calendar-form', resetCalendarForm);
  });

  document.getElementById('loan-search').addEventListener('input', renderLoans);
  ['loan-from', 'loan-to', 'loan-class', 'loan-student'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', renderLoans);
  });
  document.getElementById('loan-refresh').addEventListener('click', loadLoans);
  document.getElementById('loan-export').addEventListener('click', exportLoans);

  document.getElementById('book-form').addEventListener('submit', saveBook);
  document.getElementById('book-cancel').addEventListener('click', function () {
    resetWithConfirmation('book-form', resetBookForm);
  });
  document.getElementById('book-refresh').addEventListener('click', loadBooks);
  ['book-search', 'book-filter-status'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function () { bookPage = 1; renderBooks(); });
  });
  document.getElementById('book-previous').addEventListener('click', function () {
    if (bookPage > 1) { bookPage -= 1; renderBooks(); }
  });
  document.getElementById('book-next').addEventListener('click', function () {
    const pageCount = Math.max(1, Math.ceil(filteredBooks().length / BOOK_PAGE_SIZE));
    if (bookPage < pageCount) { bookPage += 1; renderBooks(); }
  });

  document.getElementById('suggestion-search').addEventListener('input', renderSuggestions);
  document.getElementById('suggestion-refresh').addEventListener('click', loadSuggestions);
  document.getElementById('nilam-form').addEventListener('submit', saveNilam);
  document.getElementById('audit-refresh').addEventListener('click', loadAudit);

  ['pss-notice-form', 'pss-calendar-form', 'book-form', 'nilam-form'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function () { setDirty(id, true); });
  });
  window.addEventListener('beforeunload', function (event) {
    if (!dirtyForms.size) return;
    event.preventDefault();
    event.returnValue = '';
  });
}

(async function init() {
  const auth = await refreshAuthBox();
  if (!auth.admin) {
    document.getElementById('pss-admin-denied').style.display = 'block';
    return;
  }
  document.getElementById('pss-admin-main').style.display = 'block';
  bindEvents();
  const results = await Promise.all([
    loadNotices(),
    loadCalendar(),
    loadLoans(),
    loadBooks(),
    loadSuggestions(),
    loadNilam(),
    loadAudit()
  ]);
  if (results.every(Boolean)) setHealth('ready', 'Semua modul PSS bersambung');
  else setHealth('error', 'Ada modul PSS yang memerlukan perhatian');
}());
