let loanRows = [];
let suggestionRows = [];
let nilamRows = [];

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
function renderLoans() {
  const needle = document.getElementById('loan-search').value.trim().toLowerCase();
  const rows = loanRows.filter(row => [row.rujukan, row.nama, row.kelas, row.bahan, row.kod_bahan].join(' ').toLowerCase().includes(needle));
  const tbody = document.getElementById('loan-tbody');
  tbody.innerHTML = '';
  rows.forEach(row => {
    const tr = document.createElement('tr');
    const values = [row.rujukan || '-', `${row.nama || '-'}${row.kelas ? ' (' + row.kelas + ')' : ''}`, `${row.bahan || '-'}${row.kod_bahan ? ' · ' + row.kod_bahan : ''}`, formatDate(row.tarikh_pinjam), formatDate(row.tarikh_pulang), row.catatan || '-'];
    values.forEach(value => { const td = document.createElement('td'); td.textContent = value; tr.appendChild(td); });
    tbody.appendChild(tr);
  });
  document.getElementById('loan-empty').style.display = rows.length ? 'none' : 'block';
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
  document.getElementById('loan-refresh').addEventListener('click', loadLoans);
  document.getElementById('suggestion-search').addEventListener('input', renderSuggestions);
  document.getElementById('suggestion-refresh').addEventListener('click', loadSuggestions);
  document.getElementById('nilam-form').addEventListener('submit', saveNilam);
  loadLoans();
  loadSuggestions();
  loadNilam();
}());
