let loanRows = [];
let suggestionRows = [];
let nilamRows = [];
let bookRows = [];

const BOOK_STATUSES = ['Tersedia', 'Dipinjam', 'Hilang', 'Rosak', 'Dipulangkan'];
const LOAN_STATUSES = ['Direkodkan', 'Dipinjam', 'Dipulangkan', 'Lewat', 'Hilang', 'Dibatalkan'];

function toDate(value) { return value ? new Date(value + 'T00:00:00') : null; }
function formatDate(value) {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat('ms-MY', { day:'numeric', month:'short', year:'numeric' }).format(date) : '-';
}
function isoDate(date) { return date.toISOString().slice(0, 10); }
function weekRange() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  const from = isoDate(date);
  date.setDate(date.getDate() + 6);
  return { from, to: isoDate(date) };
}
function filteredLoanRows() {
  const needle = document.getElementById('loan-search').value.trim().toLowerCase();
  const from = document.getElementById('loan-from').value;
  const to = document.getElementById('loan-to').value;
  const kelas = document.getElementById('loan-class').value.trim().toLowerCase();
  const murid = document.getElementById('loan-student').value.trim().toLowerCase();
  return loanRows.filter(row => {
    const haystack = [row.rujukan, row.nama, row.kelas, row.bahan, row.kod_bahan].join(' ').toLowerCase();
    return (!needle || haystack.includes(needle)) && (!from || row.tarikh_pinjam >= from) && (!to || row.tarikh_pinjam <= to)
      && (!kelas || String(row.kelas || '').toLowerCase().includes(kelas))
      && (!murid || String(row.nama || '').toLowerCase().includes(murid));
  });
}
function statusClass(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('tersedia') || value.includes('pulang')) return 'status-badge status-returned';
  if (value.includes('pinjam') || value.includes('rekod')) return 'status-badge status-borrowed';
  if (value.includes('hilang') || value.includes('rosak') || value.includes('batal')) return 'status-badge status-damaged';
  return 'status-badge';
}
function renderLoans() {
  const rows = filteredLoanRows();
  const tbody = document.getElementById('loan-tbody');
  tbody.innerHTML = '';
  rows.forEach(row => {
    const tr = document.createElement('tr');
    [row.rujukan || '-', `${row.nama || '-'}${row.kelas ? ' (' + row.kelas + ')' : ''}`, `${row.bahan || '-'}${row.kod_bahan ? ' · ' + row.kod_bahan : ''}`, formatDate(row.tarikh_pinjam), formatDate(row.tarikh_pulang)].forEach(value => { const td = document.createElement('td'); td.textContent = value; tr.appendChild(td); });
    const statusCell = document.createElement('td');
    const select = document.createElement('select');
    select.className = statusClass(row.status);
    LOAN_STATUSES.forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; option.selected = row.status === value; select.appendChild(option); });
    select.addEventListener('change', () => updateLoanStatus(row.id, select.value));
    statusCell.appendChild(select); tr.appendChild(statusCell);
    const note = document.createElement('td'); note.textContent = row.catatan || '-'; tr.appendChild(note);
    tbody.appendChild(tr);
  });
  document.getElementById('loan-empty').style.display = rows.length ? 'none' : 'block';
}
async function updateLoanStatus(id, status) {
  const { error } = await sb.from('pss_pinjaman').update({ status }).eq('id', id);
  if (error) { showToast('Ralat', 'Status pinjaman tidak dapat dikemas kini.', 'error'); await loadLoans(); return; }
  const row = loanRows.find(item => item.id === id); if (row) row.status = status;
  showToast('Status dikemas kini', 'Perubahan telah direkodkan dalam audit log.', 'success');
}
function csvValue(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
function exportLoans() {
  const rows = filteredLoanRows();
  const lines = [['Laporan Pinjaman PSS SMK Agama Jerlun'], ['Jumlah rekod', rows.length], [], ['Rujukan', 'Nama', 'Kelas', 'Bahan', 'Kod Bahan', 'Tarikh Pinjam', 'Tarikh Pulang', 'Status', 'Catatan']];
  rows.forEach(row => lines.push([row.rujukan, row.nama, row.kelas, row.bahan, row.kod_bahan, row.tarikh_pinjam, row.tarikh_pulang, row.status, row.catatan]));
  const blob = new Blob(['\ufeff' + lines.map(line => line.map(csvValue).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `laporan-pinjaman-pss-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
}
function renderStats() {
  const today = new Date();
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const range = weekRange();
  document.getElementById('stat-all').textContent = loanRows.length;
  document.getElementById('stat-month').textContent = loanRows.filter(row => (row.tarikh_pinjam || '').startsWith(month)).length;
  document.getElementById('stat-return-week').textContent = loanRows.filter(row => row.tarikh_pulang >= range.from && row.tarikh_pulang <= range.to).length;
  document.getElementById('stat-suggestions').textContent = suggestionRows.length;
  document.getElementById('stat-suggestion-new').textContent = suggestionRows.filter(row => row.status === 'Baru').length;
}
async function loadLoans() {
  const message = document.getElementById('loan-message');
  message.textContent = 'Memuatkan rekod pinjaman...';
  const { data, error } = await sb.from('pss_pinjaman').select('*').order('tarikh_pinjam', { ascending:false }).limit(500);
  if (error) {
    message.textContent = 'Rekod pinjaman tidak dapat dimuatkan: ' + error.message;
    return;
  }
  loanRows = data || [];
  message.textContent = `Dikemas kini: ${loanRows.length} rekod.`;
  renderStats();
  renderLoans();
}

function resetBookForm() {
  document.getElementById('book-form').reset();
  document.getElementById('book-id').value = '';
  document.getElementById('book-status').value = 'Tersedia';
}
function renderBooks() {
  const tbody = document.getElementById('book-tbody'); tbody.replaceChildren();
  bookRows.forEach(book => {
    const tr = document.createElement('tr');
    [book.tajuk || '-', book.pengarang || '-', book.kategori || '-', book.rak || '-'].forEach(value => { const td = document.createElement('td'); td.textContent = value; tr.appendChild(td); });
    const status = document.createElement('td'); const select = document.createElement('select'); select.className = statusClass(book.status);
    BOOK_STATUSES.forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; option.selected = book.status === value; select.appendChild(option); });
    select.addEventListener('change', () => updateBookStatus(book.id, select.value)); status.appendChild(select); tr.appendChild(status);
    const actions = document.createElement('td'); actions.style.textAlign = 'right';
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'btn-edit'; edit.textContent = 'Ubah'; edit.addEventListener('click', () => {
      document.getElementById('book-id').value = book.id; document.getElementById('book-title').value = book.tajuk || ''; document.getElementById('book-author').value = book.pengarang || ''; document.getElementById('book-category').value = book.kategori || ''; document.getElementById('book-rack').value = book.rak || ''; document.getElementById('book-status').value = book.status || 'Tersedia'; document.getElementById('book-order').value = book.susunan || 0; document.getElementById('book-title').focus();
    });
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn-danger'; remove.textContent = 'Padam'; remove.style.marginLeft = '6px'; remove.addEventListener('click', () => deleteBook(book.id));
    actions.append(edit, remove); tr.appendChild(actions); tbody.appendChild(tr);
  });
  document.getElementById('book-empty').style.display = bookRows.length ? 'none' : 'block';
}
async function loadBooks() {
  const { data, error } = await sb.from('pss_book').select('*').order('susunan').order('tajuk');
  if (error) { document.getElementById('book-message').textContent = 'Katalog tidak dapat dimuatkan: ' + error.message; return; }
  bookRows = data || []; document.getElementById('book-message').textContent = `${bookRows.length} bahan dalam katalog.`; renderBooks();
}
async function updateBookStatus(id, status) {
  const { error } = await sb.from('pss_book').update({ status }).eq('id', id);
  if (error) { showToast('Ralat', 'Status buku tidak dapat dikemas kini.', 'error'); await loadBooks(); return; }
  const row = bookRows.find(item => item.id === id); if (row) row.status = status;
  showToast('Status buku dikemas kini', 'Perubahan telah direkodkan.', 'success');
}
async function deleteBook(id) {
  if (!window.confirm('Padam rekod buku ini?')) return;
  const { error } = await sb.from('pss_book').delete().eq('id', id);
  if (error) { showToast('Ralat', 'Buku tidak dapat dipadam.', 'error'); return; }
  await loadBooks();
}
async function saveBook(event) {
  event.preventDefault();
  const id = document.getElementById('book-id').value;
  const payload = { tajuk: document.getElementById('book-title').value.trim(), pengarang: document.getElementById('book-author').value.trim() || null, kategori: document.getElementById('book-category').value.trim() || null, rak: document.getElementById('book-rack').value.trim() || null, status: document.getElementById('book-status').value, susunan: Number(document.getElementById('book-order').value || 0) };
  const response = id ? await sb.from('pss_book').update(payload).eq('id', id) : await sb.from('pss_book').insert(payload);
  if (response.error) { document.getElementById('book-message').textContent = 'Buku tidak dapat disimpan: ' + response.error.message; return; }
  resetBookForm(); await loadBooks(); showToast('Katalog disimpan', 'Rekod buku telah dikemas kini.', 'success');
}

function formatDateTime(value) { return value ? new Intl.DateTimeFormat('ms-MY', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-'; }
async function loadAudit() {
  const message = document.getElementById('audit-message');
  const { data, error } = await sb.from('admin_audit_log').select('id,action,table_name,record_id,metadata,created_at').order('created_at', { ascending: false }).limit(100);
  if (error) { message.textContent = 'Audit log tidak dapat dimuatkan: ' + error.message; return; }
  const tbody = document.getElementById('audit-tbody'); tbody.replaceChildren();
  (data || []).forEach(row => { const tr = document.createElement('tr'); [formatDateTime(row.created_at), row.action, row.table_name, row.record_id || '-', JSON.stringify(row.metadata || {}).slice(0, 180)].forEach(value => { const td = document.createElement('td'); td.textContent = value; tr.appendChild(td); }); tbody.appendChild(tr); });
  document.getElementById('audit-empty').style.display = data && data.length ? 'none' : 'block'; message.textContent = data && data.length ? `${data.length} perubahan terkini.` : '';
}

function renderSuggestions() {
  const needle = document.getElementById('suggestion-search').value.trim().toLowerCase();
  const rows = suggestionRows.filter(row => [row.tajuk, row.pengarang, row.nama, row.kelas].join(' ').toLowerCase().includes(needle));
  const tbody = document.getElementById('suggestion-tbody');
  tbody.innerHTML = '';
  rows.forEach(row => {
    const tr = document.createElement('tr');
    const title = document.createElement('td'); title.innerHTML = '<b></b><br><small></small>'; title.querySelector('b').textContent = row.tajuk; title.querySelector('small').textContent = row.pengarang || 'Pengarang tidak dinyatakan'; tr.appendChild(title);
    const sender = document.createElement('td'); sender.textContent = `${row.nama} (${row.kelas})`; tr.appendChild(sender);
    const category = document.createElement('td'); category.textContent = row.kategori; tr.appendChild(category);
    const reason = document.createElement('td'); reason.textContent = row.sebab || '-'; tr.appendChild(reason);
    const statusCell = document.createElement('td'); const select = document.createElement('select');
    ['Baru', 'Dalam Semakan', 'Dipilih', 'Tidak Diteruskan'].forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; option.selected = row.status === value; select.appendChild(option); });
    select.addEventListener('change', () => updateSuggestionStatus(row.id, select.value)); statusCell.appendChild(select); tr.appendChild(statusCell);
    tbody.appendChild(tr);
  });
  document.getElementById('suggestion-empty').style.display = rows.length ? 'none' : 'block';
}

async function loadSuggestions() {
  const message = document.getElementById('suggestion-message');
  message.textContent = 'Memuatkan cadangan buku...';
  const { data, error } = await sb.from('cadangan_buku').select('*').eq('sumber', 'Pelajar').order('created_at', { ascending:false }).limit(500);
  if (error) { message.textContent = 'Cadangan buku tidak dapat dimuatkan: ' + error.message; return; }
  suggestionRows = data || [];
  message.textContent = suggestionRows.length ? `${suggestionRows.length} cadangan murid direkodkan.` : '';
  renderStats();
  renderSuggestions();
}

async function updateSuggestionStatus(id, status) {
  const { error } = await sb.from('cadangan_buku').update({ status }).eq('id', id);
  if (error) { showToast('Ralat', 'Status tidak dapat dikemas kini.', 'error'); await loadSuggestions(); return; }
  const row = suggestionRows.find(item => item.id === id);
  if (row) row.status = status;
  renderStats();
}

function renderNilam() {
  const tbody = document.getElementById('nilam-tbody');
  tbody.innerHTML = '';
  nilamRows.forEach(row => {
    const tr = document.createElement('tr');
    [row.kelas, row.jumlah_bacaan, row.murid_aktif, formatDate(row.dikemas_kini)].forEach(value => { const td = document.createElement('td'); td.textContent = value; tr.appendChild(td); });
    tbody.appendChild(tr);
  });
  document.getElementById('nilam-empty').style.display = nilamRows.length ? 'none' : 'block';
}

async function loadNilam() {
  const message = document.getElementById('nilam-message');
  const { data, error } = await sb.from('nilam_stat').select('*').order('jumlah_bacaan', { ascending:false });
  if (error) { message.textContent = 'Statistik NILAM tidak dapat dimuatkan: ' + error.message; return; }
  nilamRows = data || [];
  message.textContent = '';
  renderNilam();
}

async function saveNilam(event) {
  event.preventDefault();
  const kelas = document.getElementById('nilam-kelas').value.trim();
  const jumlah_bacaan = Number(document.getElementById('nilam-jumlah').value);
  const murid_aktif = Number(document.getElementById('nilam-murid').value);
  const message = document.getElementById('nilam-message');
  if (!kelas || jumlah_bacaan < 0 || murid_aktif < 0) { message.textContent = 'Sila isi maklumat NILAM yang sah.'; return; }
  const { error } = await sb.from('nilam_stat').upsert({ kelas, jumlah_bacaan, murid_aktif, dikemas_kini: new Date().toISOString().slice(0,10) }, { onConflict:'kelas' });
  if (error) { message.textContent = 'Statistik NILAM tidak dapat disimpan: ' + error.message; return; }
  document.getElementById('nilam-form').reset();
  message.textContent = 'Statistik NILAM disimpan.';
  loadNilam();
}
(async function init() {
  const { admin } = await refreshAuthBox();
  if (!admin) { document.getElementById('pss-admin-denied').style.display = 'block'; return; }
  document.getElementById('pss-admin-main').style.display = 'block';
  document.getElementById('loan-search').addEventListener('input', renderLoans);
  ['loan-from', 'loan-to', 'loan-class', 'loan-student'].forEach(id => document.getElementById(id).addEventListener('input', renderLoans));
  document.getElementById('loan-refresh').addEventListener('click', loadLoans);
  document.getElementById('loan-export').addEventListener('click', exportLoans);
  document.getElementById('book-form').addEventListener('submit', saveBook);
  document.getElementById('book-cancel').addEventListener('click', resetBookForm);
  document.getElementById('book-refresh').addEventListener('click', loadBooks);
  document.getElementById('audit-refresh').addEventListener('click', loadAudit);
  document.getElementById('suggestion-search').addEventListener('input', renderSuggestions);
  document.getElementById('suggestion-refresh').addEventListener('click', loadSuggestions);
  document.getElementById('nilam-form').addEventListener('submit', saveNilam);
  loadLoans();
  loadBooks();
  loadAudit();
  loadSuggestions();
  loadNilam();
}());
