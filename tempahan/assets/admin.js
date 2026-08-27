const { hariIni, esok } = tarikhInfo();
const adminUI = window.adminUI;
let adminAllEntries = [];

function setBookingHealth(state, message) {
  const health = document.getElementById('booking-admin-health');
  if (!health) return;
  health.dataset.state = state;
  const label = health.querySelector('span:last-child');
  if (label) label.textContent = message;
}

function parseIsoDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date) { return date.toISOString().slice(0, 10); }

function addDays(value, days) {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

function getWeekRange(value) {
  const date = parseIsoDate(value);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  const from = toIsoDate(date);
  return { from, to: addDays(from, 6), label: `${formatMalayDateShort(from)} - ${formatMalayDateShort(addDays(from, 6))}` };
}

function getMonthRange(value) {
  const [year, month] = value.split('-').map(Number);
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(year, month, 0));
  return { from, to: toIsoDate(last), label: new Intl.DateTimeFormat('ms-MY', { month:'long', year:'numeric', timeZone:'UTC' }).format(parseIsoDate(from)) };
}

function getYearRange(value) {
  const year = Number(value);
  return { from: `${year}-01-01`, to: `${year}-12-31`, label: `Tahun ${year}` };
}

function getStatsRange() {
  const period = document.getElementById('stats-period').value;
  if (period === 'minggu') return getWeekRange(hariIni);
  if (period === 'bulan') return getMonthRange(hariIni.slice(0, 7));
  if (period === 'tahun') return getYearRange(hariIni.slice(0, 4));
  return { from: '', to: '', label: 'Semua rekod' };
}

function getReportRange() {
  const period = document.getElementById('report-period').value;
  if (period === 'mingguan') return getWeekRange(document.getElementById('report-week').value || hariIni);
  if (period === 'bulanan') {
    const year = document.getElementById('report-year').value || hariIni.slice(0, 4);
    const month = document.getElementById('report-month').value || hariIni.slice(5, 7);
    return getMonthRange(`${year}-${month}`);
  }
  return getYearRange(document.getElementById('report-year').value || hariIni.slice(0, 4));
}

function roomName(id) {
  const room = findBookable(id);
  return room ? (room.parent ? `${room.parent} - ${room.id}` : room.id) : id;
}

async function fetchAllBookings() {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await sb.from('tempahan').select('*')
      .order('tarikh', { ascending: false }).order('masa_mula').range(from, from + pageSize - 1);
    if (error) return { rows: [], error };
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return { rows, error: null };
}

function activeInRange(range) {
  return adminAllEntries.filter(e => e.status !== 'dibatalkan' && (!range.from || (e.tarikh >= range.from && e.tarikh <= range.to)));
}

function getAdminListRange(period) {
  if (period === 'minggu') return getWeekRange(hariIni);
  if (period === 'bulan') return getMonthRange(hariIni.slice(0, 7));
  if (period === 'tahun') return { from: hariIni.slice(0, 4) + '-01-01', to: hariIni.slice(0, 4) + '-12-31', label: 'Tahun ' + hariIni.slice(0, 4) };
  return { from: '', to: '', label: 'Semua tempoh' };
}

function filteredAdminEntries() {
  const tarikh = document.getElementById('af-tarikh').value;
  const bilik = document.getElementById('af-bilik').value;
  const period = document.getElementById('af-tempoh').value;
  const status = document.getElementById('af-status').value;
  const q = document.getElementById('af-nama').value.trim().toLowerCase();
  const range = getAdminListRange(period);
  return adminAllEntries.filter(e => {
    if (tarikh && e.tarikh !== tarikh) return false;
    if (range.from && (e.tarikh < range.from || e.tarikh > range.to)) return false;
    if (bilik && e.bilik !== bilik) return false;
    if (status === 'aktif' && e.status === 'dibatalkan') return false;
    if (status === 'dibatalkan' && e.status !== 'dibatalkan') return false;
    if (q && !(e.nama_pemohon || '').toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => a.tarikh === b.tarikh ? a.masa_mula.localeCompare(b.masa_mula) : b.tarikh.localeCompare(a.tarikh));
}

function populateAdminBilikFilter() {
  ['af-bilik', 'report-bilik'].forEach(id => {
    const sel = document.getElementById(id);
    BOOKABLE.forEach(r => {
      const option = document.createElement('option');
      option.value = r.id;
      option.textContent = roomName(r.id);
      sel.appendChild(option);
    });
  });
}

function loadDashboard() {
  const active = adminAllEntries.filter(e => e.status !== 'dibatalkan');
  const cancelled = adminAllEntries.filter(e => e.status === 'dibatalkan');
  const todayActive = active.filter(e => e.tarikh === hariIni);
  const tomorrowActive = active.filter(e => e.tarikh === esok);
  const weekActive = activeInRange(getWeekRange(hariIni));
  const monthActive = activeInRange(getMonthRange(hariIni.slice(0, 7)));

  document.getElementById('stat-total').textContent = active.length;
  document.getElementById('stat-today').textContent = todayActive.length;
  document.getElementById('stat-tomorrow').textContent = tomorrowActive.length;
  document.getElementById('stat-week').textContent = weekActive.length;
  document.getElementById('stat-month').textContent = monthActive.length;
  document.getElementById('stat-cancelled').textContent = cancelled.length;

  const roomstats = document.getElementById('roomstats');
  roomstats.innerHTML = '';
  BOOKABLE.forEach(r => {
    const count = todayActive.filter(e => e.bilik === r.id).length + tomorrowActive.filter(e => e.bilik === r.id).length;
    const div = document.createElement('div');
    div.className = 'roomstat';
    div.innerHTML = '<div class="n"></div><div class="c"></div>';
    div.querySelector('.n').textContent = roomName(r.id);
    div.querySelector('.c').textContent = `${count} slot`;
    roomstats.appendChild(div);
  });

  const upcoming = [...todayActive, ...tomorrowActive].sort((a, b) => a.tarikh === b.tarikh ? a.masa_mula.localeCompare(b.masa_mula) : a.tarikh.localeCompare(b.tarikh));
  const tbody = document.getElementById('upcoming-tbody');
  tbody.innerHTML = '';
  document.getElementById('upcoming-empty').style.display = upcoming.length === 0 ? 'block' : 'none';
  upcoming.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td><span class="tarikh-pill kelas-pill"></span></td><td class="masa"></td><td></td><td style="font-weight:700"></td><td></td>';
    tr.children[0].querySelector('span').textContent = formatMalayDateShort(e.tarikh);
    tr.children[1].textContent = `${e.masa_mula} - ${e.masa_tamat}`;
    tr.children[2].textContent = roomName(e.bilik);
    tr.children[3].textContent = e.nama_pemohon;
    tr.children[4].textContent = e.kelas;
    tbody.appendChild(tr);
  });
}

function renderUsageStats() {
  const groupBy = document.getElementById('stats-group').value;
  const range = getStatsRange();
  const entries = activeInRange(range);
  const counts = new Map();
  entries.forEach(entry => {
    const key = groupBy === 'guru' ? (entry.nama_pemohon || 'Tidak dinyatakan') : entry.bilik;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const stats = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ms'));
  const container = document.getElementById('usage-stats');
  const empty = document.getElementById('usage-stats-empty');
  container.innerHTML = '';
  empty.style.display = stats.length ? 'none' : 'block';
  stats.forEach(([key, count]) => {
    const item = document.createElement('div');
    item.className = 'roomstat';
    item.innerHTML = '<div class="n"></div><div class="c"></div>';
    item.querySelector('.n').textContent = groupBy === 'guru' ? key : roomName(key);
    item.querySelector('.c').textContent = `${count} slot`;
    container.appendChild(item);
  });
  const label = groupBy === 'guru' ? 'guru' : 'bilik';
  document.getElementById('stats-description').textContent = `Bilangan slot tempahan aktif mengikut ${label} bagi ${range.label}.`;
}

function renderAdminSenarai() {
  const filtered = filteredAdminEntries();

  const tbody = document.getElementById('admin-senarai-tbody');
  tbody.innerHTML = '';
  document.getElementById('admin-senarai-empty').style.display = filtered.length === 0 ? 'block' : 'none';

  filtered.forEach(e => {
    const tr = document.createElement('tr');
    const tdT = document.createElement('td'); tdT.className = 'tarikh'; tdT.textContent = formatMalayDate(e.tarikh); tr.appendChild(tdT);
    const tdN = document.createElement('td'); tdN.className = 'nama'; tdN.textContent = e.nama_pemohon; tr.appendChild(tdN);
    const tdK = document.createElement('td'); const pill = document.createElement('span'); pill.className = 'kelas-pill'; pill.textContent = e.kelas; tdK.appendChild(pill); tr.appendChild(tdK);
    const tdB = document.createElement('td'); tdB.className = 'bilik'; tdB.textContent = roomName(e.bilik); tr.appendChild(tdB);
    const tdM = document.createElement('td'); tdM.className = 'masa'; tdM.textContent = e.masa_mula + ' - ' + e.masa_tamat; tr.appendChild(tdM);
    const tdL = document.createElement('td'); tdL.className = e.guna_lcd ? 'lcd-yes' : 'lcd-no'; tdL.textContent = e.guna_lcd ? 'Ya' : '-'; tr.appendChild(tdL);

    const tdS = document.createElement('td');
    if (e.status === 'dibatalkan') {
      const span = document.createElement('span');
      span.className = 'status-cancelled';
      span.textContent = 'Dibatalkan';
      tdS.appendChild(span);
    } else {
      const span = document.createElement('span');
      span.className = 'status-active';
      span.textContent = 'Aktif';
      tdS.appendChild(span);
    }
    tr.appendChild(tdS);

    const tdAction = document.createElement('td');
    tdAction.style.textAlign = 'right';
    if (e.status !== 'dibatalkan') {
      const btn = document.createElement('button');
      btn.className = 'btn-danger';
      btn.textContent = 'Batalkan';
      btn.onclick = () => onAdminCancel(e.id, btn);
      tdAction.appendChild(btn);
    } else { tdAction.textContent = '-'; }
    tr.appendChild(tdAction);

    tbody.appendChild(tr);
  });
  adminUI.setMessage('booking-admin-status', filtered.length + ' daripada ' + adminAllEntries.length + ' rekod dipaparkan.', 'success');
}

async function loadAdminSenarai() {
  adminUI.setMessage('booking-admin-status', 'Memuatkan semua rekod tempahan...', 'loading');
  setBookingHealth('checking', 'Memuatkan rekod tempahan');
  const result = await fetchAllBookings();
  if (result.error) {
    adminAllEntries = [];
    document.getElementById('admin-senarai-tbody').replaceChildren();
    document.getElementById('admin-senarai-empty').style.display = 'none';
    adminUI.setMessage('booking-admin-status', 'Rekod tempahan tidak dapat dimuatkan: ' + result.error.message, 'error');
    setBookingHealth('error', 'Sambungan rekod tempahan gagal');
    showToast('Ralat', 'Rekod tempahan tidak dapat dimuatkan.', 'error');
    return false;
  }
  adminAllEntries = result.rows;
  loadDashboard();
  renderUsageStats();
  renderAdminSenarai();
  setBookingHealth('ready', 'Rekod tempahan bersambung');
  return true;
}

async function onAdminCancel(id, button) {
  if (!confirm('Batalkan tempahan ini? Rekod akan disimpan untuk laporan.')) return;
  adminUI.setBusy(button, true, 'Membatalkan...');
  const { error } = await sb.from('tempahan').update({ status: 'dibatalkan' }).eq('id', id);
  adminUI.setBusy(button, false);
  if (error) { showToast('Ralat', 'Gagal membatalkan tempahan: ' + error.message, 'error'); return; }
  await loadAdminSenarai();
  showToast('Tempahan dibatalkan', 'Rekod dikekalkan untuk laporan dan audit.', 'success');
}

function updateReportControls() {
  const period = document.getElementById('report-period').value;
  document.getElementById('report-week').style.display = period === 'mingguan' ? 'block' : 'none';
  document.getElementById('report-month').style.display = period === 'bulanan' ? 'block' : 'none';
  document.getElementById('report-year').style.display = period === 'bulanan' || period === 'tahunan' ? 'block' : 'none';
  const range = getReportRange();
  document.getElementById('report-description').textContent = `Laporan untuk sebuah bilik sahaja bagi ${range.label}. Fail CSV boleh dibuka terus dalam Excel.`;
}

function csvValue(value) {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportFilteredBookings() {
  const rows = filteredAdminEntries();
  const period = document.getElementById('af-tempoh').value;
  const status = document.getElementById('af-status').value;
  const bilik = document.getElementById('af-bilik').value;
  const range = getAdminListRange(period);
  const lines = [
    ['Senarai Tempahan Bilik Khas SMK Agama Jerlun'],
    ['Tempoh', range.label],
    ['Bilik', bilik ? roomName(bilik) : 'Semua bilik'],
    ['Status', status === 'aktif' ? 'Aktif sahaja' : status === 'dibatalkan' ? 'Dibatalkan sahaja' : 'Semua status'],
    ['Jumlah rekod', rows.length],
    [],
    ['Tarikh', 'Hari', 'Masa', 'Bilik', 'Nama Guru', 'Kelas / Kumpulan', 'Tujuan / Aktiviti', 'LCD', 'Status']
  ];
  rows.forEach(entry => lines.push([
    entry.tarikh,
    formatMalayDate(entry.tarikh).split(',')[0],
    entry.masa_mula + ' - ' + entry.masa_tamat,
    roomName(entry.bilik),
    entry.nama_pemohon,
    entry.kelas,
    entry.tujuan,
    entry.guna_lcd ? 'Ya' : 'Tidak',
    entry.status === 'dibatalkan' ? 'Dibatalkan' : 'Aktif'
  ]));
  const csv = '\ufeff' + lines.map(row => row.map(csvValue).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'senarai-tempahan-' + period + '-' + hariIni + '.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  showToast('Senarai dieksport', rows.length + ' rekod tempahan telah dimasukkan dalam fail CSV.', 'success');
}

function downloadRoomReport() {
  const bilik = document.getElementById('report-bilik').value;
  if (!bilik) { showToast('Pilih bilik', 'Sila pilih bilik untuk laporan ini.', 'warning'); return; }
  const range = getReportRange();
  const rows = activeInRange(range).filter(entry => entry.bilik === bilik)
    .sort((a, b) => a.tarikh === b.tarikh ? a.masa_mula.localeCompare(b.masa_mula) : a.tarikh.localeCompare(b.tarikh));
  const lines = [
    ['Laporan Penggunaan Bilik Khas SMK Agama Jerlun'],
    ['Bilik', roomName(bilik)],
    ['Tempoh', range.label],
    ['Jumlah slot aktif', rows.length],
    [],
    ['Tarikh', 'Hari', 'Masa', 'Bilik', 'Nama Guru', 'Kelas / Kumpulan', 'Tujuan / Aktiviti', 'LCD']
  ];
  rows.forEach(entry => lines.push([
    entry.tarikh,
    formatMalayDate(entry.tarikh).split(',')[0],
    `${entry.masa_mula} - ${entry.masa_tamat}`,
    roomName(entry.bilik),
    entry.nama_pemohon,
    entry.kelas,
    entry.tujuan,
    entry.guna_lcd ? 'Ya' : 'Tidak'
  ]));
  const csv = '\ufeff' + lines.map(row => row.map(csvValue).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  const slug = bilik.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  link.href = URL.createObjectURL(blob);
  link.download = `laporan-${slug}-${range.from || 'semua'}-${range.to || 'rekod'}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  showToast('Laporan dimuat turun', `${rows.length} slot tempahan aktif bagi ${roomName(bilik)} telah dimasukkan.`, 'success');
}

function printRoomReport() {
  const bilik = document.getElementById('report-bilik').value;
  if (!bilik) { showToast('Pilih bilik', 'Sila pilih bilik untuk laporan ini.', 'warning'); return; }
  const range = getReportRange();
  const rows = activeInRange(range).filter(entry => entry.bilik === bilik)
    .sort((a, b) => a.tarikh === b.tarikh ? a.masa_mula.localeCompare(b.masa_mula) : a.tarikh.localeCompare(b.tarikh));
  const panel = document.getElementById('print-report');
  panel.replaceChildren();

  const title = document.createElement('h1');
  title.textContent = 'Laporan Penggunaan Bilik Khas';
  panel.appendChild(title);
  const school = document.createElement('p');
  school.className = 'print-report-school';
  school.textContent = 'SMK Agama Jerlun · ' + roomName(bilik);
  panel.appendChild(school);
  const meta = document.createElement('p');
  meta.className = 'print-report-meta';
  meta.textContent = range.label + ' · ' + rows.length + ' slot aktif';
  panel.appendChild(meta);

  const table = document.createElement('table');
  const headers = ['Tarikh', 'Masa', 'Nama Guru', 'Kelas / Kumpulan', 'Tujuan / Aktiviti', 'LCD'];
  const thead = document.createElement('thead');
  const headingRow = document.createElement('tr');
  headers.forEach(text => { const th = document.createElement('th'); th.textContent = text; headingRow.appendChild(th); });
  thead.appendChild(headingRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  rows.forEach(entry => {
    const tr = document.createElement('tr');
    [formatMalayDate(entry.tarikh), `${entry.masa_mula} - ${entry.masa_tamat}`, entry.nama_pemohon, entry.kelas, entry.tujuan, entry.guna_lcd ? 'Ya' : 'Tidak']
      .forEach(value => { const td = document.createElement('td'); td.textContent = value || '-'; tr.appendChild(td); });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  panel.appendChild(table);
  panel.hidden = false;
  panel.setAttribute('aria-hidden', 'false');
  window.print();
  window.setTimeout(() => { panel.hidden = true; panel.setAttribute('aria-hidden', 'true'); }, 700);
}

document.getElementById('af-tarikh').addEventListener('change', renderAdminSenarai);
document.getElementById('af-bilik').addEventListener('change', renderAdminSenarai);
document.getElementById('af-tempoh').addEventListener('change', renderAdminSenarai);
document.getElementById('af-status').addEventListener('change', renderAdminSenarai);
document.getElementById('af-nama').addEventListener('input', renderAdminSenarai);
document.getElementById('af-export').addEventListener('click', exportFilteredBookings);
document.getElementById('af-clear').addEventListener('click', () => {
  document.getElementById('af-tarikh').value = '';
  document.getElementById('af-bilik').value = '';
  document.getElementById('af-tempoh').value = 'semua';
  document.getElementById('af-status').value = 'semua';
  document.getElementById('af-nama').value = '';
  renderAdminSenarai();
});
document.getElementById('stats-group').addEventListener('change', renderUsageStats);
document.getElementById('stats-period').addEventListener('change', renderUsageStats);
document.getElementById('report-period').addEventListener('change', updateReportControls);
document.getElementById('report-week').addEventListener('change', updateReportControls);
document.getElementById('report-month').addEventListener('change', updateReportControls);
document.getElementById('report-year').addEventListener('change', updateReportControls);
document.getElementById('report-download').addEventListener('click', downloadRoomReport);
document.getElementById('report-print').addEventListener('click', printRoomReport);

(async function init() {
  const { admin } = await refreshAuthBox();
  if (!admin) {
    document.getElementById('admin-denied').style.display = 'block';
    return;
  }
  document.getElementById('admin-main').style.display = 'block';
  populateAdminBilikFilter();
  document.getElementById('report-week').value = hariIni;
  document.getElementById('report-month').value = hariIni.slice(5, 7);
  document.getElementById('report-year').value = hariIni.slice(0, 4);
  updateReportControls();
  await loadAdminSenarai();
})();
