const ui = window.adminUI;
const SCHOOL_PORTAL = 'sekolah';
const editIds = {
  staf: null,
  pengumuman: null,
  kandungan: null,
  takwim: null,
  galeri: null,
  pencapaian: null,
  direktori: null,
  fail: null
};

let auditRows = [];

const HINTS = {
  paragraf: 'Tulis perenggan biasa. Guna baris kosong untuk memulakan perenggan baharu.',
  senarai_ol: 'Satu item setiap baris. Item akan dipaparkan sebagai senarai bernombor.',
  senarai_ul: 'Satu item setiap baris. Item akan dipaparkan sebagai senarai berbulet.',
  definisi: 'Format setiap baris: Label :: Nilai. Contoh: Telefon :: 04-9250925',
  lagu: 'Pisahkan setiap rangkap dengan baris kosong. Mulakan lirik Arab dengan ARAB: dan rangkap korus dengan KORUS:.',
  panitia: 'Pisahkan setiap kumpulan dengan baris kosong. Gunakan BIDANG:, PENYELARAS: dan KP: Unit :: Nama.'
};

const CONTENT_TEMPLATES = {
  paragraf: 'Tulis perenggan pertama di sini.\n\nTulis perenggan kedua selepas satu baris kosong.',
  senarai_ol: 'Item pertama\nItem kedua\nItem ketiga',
  senarai_ul: 'Item pertama\nItem kedua\nItem ketiga',
  definisi: 'Telefon :: 04-9250925\nE-mel :: kra4002@moe.edu.my',
  lagu: 'Rangkap pertama baris pertama\nRangkap pertama baris kedua\n\nKORUS:\nBaris korus pertama\nBaris korus kedua',
  panitia: 'BIDANG: Unit Beruniform\nPENYELARAS: Nama Penyelaras\nKP: Nama Unit :: Nama Guru Penasihat'
};

const JENIS_LABEL = {
  paragraf: 'Perenggan',
  senarai_ol: 'Senarai Bernombor',
  senarai_ul: 'Senarai Bulet',
  definisi: 'Definisi',
  lagu: 'Lagu Sekolah',
  panitia: 'Panitia / Unit'
};

const TIER_LABEL = { pengetua: 'Pengetua', pk: 'Penolong Kanan', ketua: 'Ketua Bidang' };
const MODULE_LABEL = {
  achievement: 'Pencapaian',
  cadangan_buku: 'Cadangan buku',
  content_block: 'Kandungan halaman',
  gallery_item: 'Galeri',
  nilam_stat: 'Statistik NILAM',
  pengumuman: 'Pengumuman',
  pss_book: 'Buku PSS',
  pss_pinjaman: 'Pinjaman PSS',
  resource_file: 'Fail muat turun',
  school_directory: 'Direktori',
  staff: 'Staf',
  takwim: 'Takwim',
  tempahan: 'Tempahan bilik'
};

const CONTENT_LINKS = {
  akademik: '/akademik/',
  kokurikulum: '/kokurikulum/',
  asrama: '/asrama/',
  hem: '/hem/',
  rujukan_akademik: '/akademik/rujukan/',
  profil: '/info/?tab=profil'
};

function actionsCell(onEdit, onDelete) {
  const cell = document.createElement('td');
  cell.className = 'admin-table-actions';
  cell.append(
    ui.createButton('Ubah', 'btn-edit', onEdit),
    ui.createButton('Padam', 'btn-danger', onDelete)
  );
  return cell;
}

function clearTable(id) {
  const tbody = document.getElementById(id);
  tbody.replaceChildren();
  return tbody;
}

function setHealth(state, message) {
  const health = document.getElementById('admin-health');
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

function numberValue(id, fallback) {
  const value = Number(document.getElementById(id).value);
  return Number.isFinite(value) ? value : fallback;
}

function errorText(label, error) {
  return label + ' tidak dapat disimpan' + (error && error.message ? ': ' + error.message : '.');
}

function confirmDelete(label) {
  return window.confirm('Padam ' + label + '? Tindakan ini akan direkodkan dalam log perubahan.');
}

async function saveRow(table, id, payload) {
  return id
    ? sb.from(table).update(payload).eq('id', id)
    : sb.from(table).insert(payload);
}

async function saveScopedRow(table, id, payload, portal) {
  return id
    ? sb.from(table).update(payload).eq('id', id).eq('portal', portal)
    : sb.from(table).insert(payload);
}

async function deleteRow(table, id, label, reload, portal) {
  if (!confirmDelete(label)) return;
  let request = sb.from(table).delete().eq('id', id);
  if (portal) request = request.eq('portal', portal);
  const response = await request;
  if (response.error) {
    showToast('Ralat', 'Rekod tidak dapat dipadam: ' + response.error.message, 'error');
    return;
  }
  await reload();
  showToast('Rekod dipadam', label + ' telah dipadam.', 'success');
}

function openRecordModal(name, title, focusId) {
  ui.setMessage(name + '-msg', '', 'idle');
  document.getElementById(name + '-modal-title').textContent = title;
  ui.openModal(name + '-modal', focusId);
}

function closeRecordModal(name, force) {
  return ui.closeModal(name + '-modal', { force: Boolean(force) });
}

// ---------------------------------------------------------------------------
// Staf dan carta organisasi
// ---------------------------------------------------------------------------
function refreshStafTierVisibility() {
  document.getElementById('f-staf-tier-wrap').style.display =
    document.getElementById('f-staf-kategori').value === 'pentadbir' ? 'block' : 'none';
}

async function loadStaf() {
  const kategori = document.getElementById('staf-filter').value;
  ui.setMessage('staf-status', 'Memuatkan rekod staf...', 'loading');
  const response = await sb.from('staff').select('*').eq('kategori', kategori).order('susunan');
  const tbody = clearTable('staf-tbody');
  if (response.error) {
    ui.showLoadError('staf-empty', 'staf-status', 'Rekod staf', response.error);
    return false;
  }
  const rows = response.data || [];
  rows.forEach(function (row) {
    const tr = document.createElement('tr');
    tr.append(
      ui.createCell(row.susunan),
      ui.createCell(row.tier ? (TIER_LABEL[row.tier] || row.tier) : '-'),
      ui.createCell(row.jawatan),
      ui.createCell(row.nama, 'admin-table-title'),
      ui.createCell(row.gred),
      actionsCell(function () { openStafModal(row); }, function () {
        deleteRow('staff', row.id, 'rekod staf ' + row.nama, loadStaf);
      })
    );
    tbody.appendChild(tr);
  });
  ui.showEmpty('staf-empty', !rows.length);
  ui.setMessage('staf-status', rows.length + ' rekod dalam kategori ini.', 'success');
  return true;
}

function openStafModal(row) {
  editIds.staf = row ? row.id : null;
  document.getElementById('f-staf-kategori').value = row ? row.kategori : document.getElementById('staf-filter').value;
  document.getElementById('f-staf-tier').value = row && row.tier ? row.tier : 'pk';
  document.getElementById('f-staf-jawatan').value = row && row.jawatan ? row.jawatan : '';
  document.getElementById('f-staf-nama').value = row ? row.nama : '';
  document.getElementById('f-staf-gred').value = row && row.gred ? row.gred : '';
  document.getElementById('f-staf-susunan').value = row ? row.susunan : 10;
  refreshStafTierVisibility();
  openRecordModal('staf', row ? 'Ubah Staf' : 'Tambah Staf', 'f-staf-nama');
}

async function saveStaf() {
  const nama = document.getElementById('f-staf-nama').value.trim();
  if (!nama) {
    ui.setMessage('staf-msg', 'Sila isi nama staf.', 'error');
    document.getElementById('f-staf-nama').focus();
    return;
  }
  const kategori = document.getElementById('f-staf-kategori').value;
  const payload = {
    kategori: kategori,
    tier: kategori === 'pentadbir' ? document.getElementById('f-staf-tier').value : null,
    jawatan: document.getElementById('f-staf-jawatan').value.trim() || null,
    nama: nama,
    gred: document.getElementById('f-staf-gred').value.trim() || null,
    susunan: numberValue('f-staf-susunan', 0)
  };
  const button = document.getElementById('staf-simpan');
  ui.setBusy(button, true, 'Menyimpan...');
  const response = await saveRow('staff', editIds.staf, payload);
  ui.setBusy(button, false);
  if (response.error) {
    ui.setMessage('staf-msg', errorText('Rekod staf', response.error), 'error');
    return;
  }
  ui.markModalSaved('staf-modal');
  closeRecordModal('staf', true);
  document.getElementById('staf-filter').value = kategori;
  await loadStaf();
  showToast('Berjaya', 'Rekod staf disimpan.', 'success');
}

// ---------------------------------------------------------------------------
// Pengumuman sekolah
// ---------------------------------------------------------------------------
async function loadPengumuman() {
  ui.setMessage('pengumuman-status', 'Memuatkan pengumuman...', 'loading');
  const response = await sb.from('pengumuman').select('*').eq('portal', SCHOOL_PORTAL)
    .order('tarikh', { ascending: false }).order('id', { ascending: false });
  const tbody = clearTable('pengumuman-tbody');
  if (response.error) {
    ui.showLoadError('pengumuman-empty', 'pengumuman-status', 'Pengumuman sekolah', response.error);
    return false;
  }
  const rows = response.data || [];
  rows.forEach(function (row) {
    const tr = document.createElement('tr');
    tr.append(
      ui.createCell(ui.formatDate(row.tarikh), 'tarikh'),
      ui.createCell(row.tajuk, 'admin-table-title'),
      actionsCell(function () { openPengumumanModal(row); }, function () {
        deleteRow('pengumuman', row.id, 'pengumuman ' + row.tajuk, loadPengumuman, SCHOOL_PORTAL);
      })
    );
    tbody.appendChild(tr);
  });
  ui.showEmpty('pengumuman-empty', !rows.length);
  ui.setMessage('pengumuman-status', rows.length + ' pengumuman sekolah.', 'success');
  return true;
}

function openPengumumanModal(row) {
  editIds.pengumuman = row ? row.id : null;
  document.getElementById('f-pengumuman-tarikh').value = row ? row.tarikh : todayIso();
  document.getElementById('f-pengumuman-tajuk').value = row ? row.tajuk : '';
  document.getElementById('f-pengumuman-kandungan').value = row && row.kandungan ? row.kandungan : '';
  openRecordModal('pengumuman', row ? 'Ubah Pengumuman Sekolah' : 'Tambah Pengumuman Sekolah', 'f-pengumuman-tajuk');
}

async function savePengumuman() {
  const tarikh = document.getElementById('f-pengumuman-tarikh').value;
  const tajuk = document.getElementById('f-pengumuman-tajuk').value.trim();
  if (!tarikh || !tajuk) {
    ui.setMessage('pengumuman-msg', 'Sila isi tarikh dan tajuk.', 'error');
    return;
  }
  const payload = {
    portal: SCHOOL_PORTAL,
    tarikh: tarikh,
    tajuk: tajuk,
    kandungan: document.getElementById('f-pengumuman-kandungan').value.trim() || null
  };
  const button = document.getElementById('pengumuman-simpan');
  ui.setBusy(button, true, 'Menyimpan...');
  const response = await saveScopedRow('pengumuman', editIds.pengumuman, payload, SCHOOL_PORTAL);
  ui.setBusy(button, false);
  if (response.error) {
    ui.setMessage('pengumuman-msg', errorText('Pengumuman', response.error), 'error');
    return;
  }
  ui.markModalSaved('pengumuman-modal');
  closeRecordModal('pengumuman', true);
  await loadPengumuman();
  showToast('Berjaya', 'Pengumuman sekolah disimpan.', 'success');
}

// ---------------------------------------------------------------------------
// Kandungan halaman
// ---------------------------------------------------------------------------
function refreshKandunganHint() {
  document.getElementById('kandungan-hint').textContent =
    HINTS[document.getElementById('f-kandungan-jenis').value] || '';
  refreshKandunganPreview();
}

function appendPreviewList(parent, items, ordered) {
  const list = document.createElement(ordered ? 'ol' : 'ul');
  items.forEach(function (item) {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
  parent.appendChild(list);
}

function refreshKandunganPreview() {
  const preview = document.getElementById('kandungan-preview');
  const body = document.getElementById('kandungan-preview-body');
  const type = document.getElementById('f-kandungan-jenis').value;
  const text = document.getElementById('f-kandungan-kandungan').value.trim();
  body.replaceChildren();
  if (!text) {
    preview.hidden = true;
    return;
  }
  preview.hidden = false;
  if (type === 'paragraf' || type === 'lagu') {
    text.split(/\n\s*\n/).filter(Boolean).forEach(function (section) {
      const paragraph = document.createElement('p');
      paragraph.textContent = section.replace(/^(ARAB:|KORUS:)\s*/i, '').replace(/\n/g, ' / ');
      body.appendChild(paragraph);
    });
    return;
  }
  if (type === 'senarai_ol' || type === 'senarai_ul') {
    appendPreviewList(body, text.split('\n').map(function (line) { return line.trim(); }).filter(Boolean), type === 'senarai_ol');
    return;
  }
  if (type === 'definisi') {
    const list = document.createElement('dl');
    let invalid = 0;
    text.split('\n').filter(Boolean).forEach(function (line) {
      const separator = line.indexOf('::');
      if (separator < 0) { invalid += 1; return; }
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = line.slice(0, separator).trim();
      detail.textContent = line.slice(separator + 2).trim();
      list.append(term, detail);
    });
    body.appendChild(list);
    if (invalid) {
      const warning = document.createElement('p');
      warning.className = 'admin-preview-warning';
      warning.textContent = invalid + ' baris tidak mempunyai pemisah :: dan tidak akan dipaparkan.';
      body.appendChild(warning);
    }
    return;
  }
  if (type === 'panitia') {
    const lines = text.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
    appendPreviewList(body, lines, false);
    const hasStructure = lines.some(function (line) { return /^BIDANG:/.test(line); }) &&
      lines.some(function (line) { return /^(PENYELARAS:|GURU KANAN:)/.test(line); }) &&
      lines.some(function (line) { return /^KP:.*::/.test(line); });
    if (!hasStructure) {
      const warning = document.createElement('p');
      warning.className = 'admin-preview-warning';
      warning.textContent = 'Format panitia belum lengkap. Pastikan BIDANG, PENYELARAS atau GURU KANAN, dan sekurang-kurangnya satu KP diisi.';
      body.appendChild(warning);
    }
  }
}

function insertKandunganTemplate() {
  const textarea = document.getElementById('f-kandungan-kandungan');
  if (textarea.value.trim() && !window.confirm('Gantikan kandungan semasa dengan contoh format?')) return;
  textarea.value = CONTENT_TEMPLATES[document.getElementById('f-kandungan-jenis').value] || '';
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
}

function refreshKandunganDestination() {
  const laman = document.getElementById('kandungan-filter').value;
  document.getElementById('kandungan-preview-link').href = CONTENT_LINKS[laman] || '/';
}

async function loadKandungan() {
  const laman = document.getElementById('kandungan-filter').value;
  refreshKandunganDestination();
  ui.setMessage('kandungan-status', 'Memuatkan blok kandungan...', 'loading');
  const response = await sb.from('content_block').select('*').eq('laman', laman).order('susunan');
  const tbody = clearTable('kandungan-tbody');
  if (response.error) {
    ui.showLoadError('kandungan-empty', 'kandungan-status', 'Kandungan halaman', response.error);
    return false;
  }
  const rows = response.data || [];
  rows.forEach(function (row) {
    const tr = document.createElement('tr');
    tr.append(
      ui.createCell(row.susunan),
      ui.createCell(row.tajuk, 'admin-table-title'),
      ui.createCell(JENIS_LABEL[row.jenis] || row.jenis),
      actionsCell(function () { openKandunganModal(row); }, function () {
        deleteRow('content_block', row.id, 'blok ' + (row.tajuk || 'tanpa tajuk'), loadKandungan);
      })
    );
    tbody.appendChild(tr);
  });
  ui.showEmpty('kandungan-empty', !rows.length);
  ui.setMessage('kandungan-status', rows.length + ' blok pada halaman dipilih.', 'success');
  return true;
}

function openKandunganModal(row) {
  editIds.kandungan = row ? row.id : null;
  document.getElementById('f-kandungan-laman').value = row ? row.laman : document.getElementById('kandungan-filter').value;
  document.getElementById('f-kandungan-jenis').value = row ? row.jenis : 'paragraf';
  document.getElementById('f-kandungan-tajuk').value = row && row.tajuk ? row.tajuk : '';
  document.getElementById('f-kandungan-susunan').value = row ? row.susunan : 10;
  document.getElementById('f-kandungan-kandungan').value = row && row.kandungan ? row.kandungan : '';
  refreshKandunganHint();
  openRecordModal('kandungan', row ? 'Ubah Blok Kandungan' : 'Tambah Blok Kandungan', 'f-kandungan-tajuk');
}

async function saveKandungan() {
  const payload = {
    laman: document.getElementById('f-kandungan-laman').value,
    jenis: document.getElementById('f-kandungan-jenis').value,
    tajuk: document.getElementById('f-kandungan-tajuk').value.trim() || null,
    susunan: numberValue('f-kandungan-susunan', 0),
    kandungan: document.getElementById('f-kandungan-kandungan').value
  };
  if (!payload.kandungan.trim()) {
    ui.setMessage('kandungan-msg', 'Sila isi kandungan blok.', 'error');
    return;
  }
  const button = document.getElementById('kandungan-simpan');
  ui.setBusy(button, true, 'Menyimpan...');
  const response = await saveRow('content_block', editIds.kandungan, payload);
  ui.setBusy(button, false);
  if (response.error) {
    ui.setMessage('kandungan-msg', errorText('Blok kandungan', response.error), 'error');
    return;
  }
  ui.markModalSaved('kandungan-modal');
  closeRecordModal('kandungan', true);
  document.getElementById('kandungan-filter').value = payload.laman;
  await loadKandungan();
  showToast('Berjaya', 'Blok kandungan disimpan.', 'success');
}

// ---------------------------------------------------------------------------
// Takwim sekolah
// ---------------------------------------------------------------------------
async function loadTakwim() {
  const kategori = document.getElementById('takwim-filter').value;
  ui.setMessage('takwim-status', 'Memuatkan takwim sekolah...', 'loading');
  const response = await sb.from('takwim').select('*').eq('portal', SCHOOL_PORTAL)
    .eq('kategori', kategori).order('tarikh_mula');
  const tbody = clearTable('takwim-tbody');
  if (response.error) {
    ui.showLoadError('takwim-empty', 'takwim-status', 'Takwim sekolah', response.error);
    return false;
  }
  const rows = response.data || [];
  rows.forEach(function (row) {
    const tr = document.createElement('tr');
    tr.append(
      ui.createCell(ui.formatDate(row.tarikh_mula), 'tarikh'),
      ui.createCell(row.tarikh_tamat ? ui.formatDate(row.tarikh_tamat) : '-'),
      ui.createCell(row.tajuk, 'admin-table-title'),
      actionsCell(function () { openTakwimModal(row); }, function () {
        deleteRow('takwim', row.id, 'entri takwim ' + row.tajuk, loadTakwim, SCHOOL_PORTAL);
      })
    );
    tbody.appendChild(tr);
  });
  ui.showEmpty('takwim-empty', !rows.length);
  ui.setMessage('takwim-status', rows.length + ' entri takwim sekolah.', 'success');
  return true;
}

function openTakwimModal(row) {
  editIds.takwim = row ? row.id : null;
  document.getElementById('f-takwim-kategori').value = row ? row.kategori : document.getElementById('takwim-filter').value;
  document.getElementById('f-takwim-mula').value = row ? row.tarikh_mula : '';
  document.getElementById('f-takwim-tamat').value = row && row.tarikh_tamat ? row.tarikh_tamat : '';
  document.getElementById('f-takwim-tajuk').value = row ? row.tajuk : '';
  document.getElementById('f-takwim-keterangan').value = row && row.keterangan ? row.keterangan : '';
  document.getElementById('f-takwim-susunan').value = row ? row.susunan : 10;
  openRecordModal('takwim', row ? 'Ubah Entri Takwim Sekolah' : 'Tambah Entri Takwim Sekolah', 'f-takwim-mula');
}

async function saveTakwim() {
  const mula = document.getElementById('f-takwim-mula').value;
  const tamat = document.getElementById('f-takwim-tamat').value;
  const tajuk = document.getElementById('f-takwim-tajuk').value.trim();
  if (!mula || !tajuk) {
    ui.setMessage('takwim-msg', 'Sila isi tarikh mula dan tajuk.', 'error');
    return;
  }
  if (tamat && tamat < mula) {
    ui.setMessage('takwim-msg', 'Tarikh tamat tidak boleh lebih awal daripada tarikh mula.', 'error');
    return;
  }
  const payload = {
    portal: SCHOOL_PORTAL,
    kategori: document.getElementById('f-takwim-kategori').value,
    tarikh_mula: mula,
    tarikh_tamat: tamat || null,
    tajuk: tajuk,
    keterangan: document.getElementById('f-takwim-keterangan').value.trim() || null,
    susunan: numberValue('f-takwim-susunan', 0)
  };
  const button = document.getElementById('takwim-simpan');
  ui.setBusy(button, true, 'Menyimpan...');
  const response = await saveScopedRow('takwim', editIds.takwim, payload, SCHOOL_PORTAL);
  ui.setBusy(button, false);
  if (response.error) {
    ui.setMessage('takwim-msg', errorText('Entri takwim', response.error), 'error');
    return;
  }
  ui.markModalSaved('takwim-modal');
  closeRecordModal('takwim', true);
  document.getElementById('takwim-filter').value = payload.kategori;
  await loadTakwim();
  showToast('Berjaya', 'Entri takwim sekolah disimpan.', 'success');
}

// ---------------------------------------------------------------------------
// Galeri dan pencapaian
// ---------------------------------------------------------------------------
async function loadGaleri() {
  ui.setMessage('galeri-status', 'Memuatkan galeri...', 'loading');
  const response = await sb.from('gallery_item').select('*')
    .order('tarikh', { ascending: false }).order('susunan').order('id', { ascending: false });
  const tbody = clearTable('galeri-tbody');
  if (response.error) {
    ui.showLoadError('galeri-empty', 'galeri-status', 'Galeri', response.error);
    return false;
  }
  const rows = response.data || [];
  rows.forEach(function (row) {
    const tr = document.createElement('tr');
    tr.append(
      ui.createCell(ui.formatDate(row.tarikh)),
      ui.createCell(row.tajuk, 'admin-table-title'),
      ui.createCell(row.kategori),
      actionsCell(function () { openGaleriModal(row); }, function () {
        deleteRow('gallery_item', row.id, 'gambar ' + row.tajuk, loadGaleri);
      })
    );
    tbody.appendChild(tr);
  });
  ui.showEmpty('galeri-empty', !rows.length);
  ui.setMessage('galeri-status', rows.length + ' gambar galeri.', 'success');
  return true;
}

function updateGalleryPreview() {
  const raw = document.getElementById('f-galeri-url').value;
  const url = ui.validHttpUrl(raw);
  const preview = document.getElementById('galeri-preview');
  if (!url) {
    preview.hidden = true;
    return;
  }
  const image = document.getElementById('galeri-preview-image');
  image.src = url;
  image.alt = document.getElementById('f-galeri-alt').value.trim() || 'Pratonton gambar';
  document.getElementById('galeri-preview-title').textContent =
    document.getElementById('f-galeri-tajuk').value.trim() || 'Pratonton gambar';
  preview.hidden = false;
}

function openGaleriModal(row) {
  editIds.galeri = row ? row.id : null;
  document.getElementById('f-galeri-tarikh').value = row && row.tarikh ? row.tarikh : todayIso();
  document.getElementById('f-galeri-kategori').value = row && row.kategori ? row.kategori : 'aktiviti';
  document.getElementById('f-galeri-tajuk').value = row ? row.tajuk : '';
  document.getElementById('f-galeri-url').value = row ? row.image_url : '';
  document.getElementById('f-galeri-alt').value = row && row.alt_text ? row.alt_text : '';
  updateGalleryPreview();
  openRecordModal('galeri', row ? 'Ubah Gambar Aktiviti' : 'Tambah Gambar Aktiviti', 'f-galeri-tajuk');
}

async function saveGaleri() {
  const tajuk = document.getElementById('f-galeri-tajuk').value.trim();
  const imageUrl = ui.validHttpUrl(document.getElementById('f-galeri-url').value);
  const altText = document.getElementById('f-galeri-alt').value.trim();
  if (!tajuk || !imageUrl || !altText) {
    ui.setMessage('galeri-msg', 'Sila isi tajuk, URL gambar yang sah dan teks alternatif.', 'error');
    return;
  }
  const payload = {
    tajuk: tajuk,
    kategori: document.getElementById('f-galeri-kategori').value,
    image_url: imageUrl,
    alt_text: altText,
    tarikh: document.getElementById('f-galeri-tarikh').value || null
  };
  const button = document.getElementById('galeri-simpan');
  ui.setBusy(button, true, 'Menyimpan...');
  const response = await saveRow('gallery_item', editIds.galeri, payload);
  ui.setBusy(button, false);
  if (response.error) {
    ui.setMessage('galeri-msg', errorText('Gambar galeri', response.error), 'error');
    return;
  }
  ui.markModalSaved('galeri-modal');
  closeRecordModal('galeri', true);
  await loadGaleri();
  showToast('Berjaya', 'Gambar galeri disimpan.', 'success');
}

async function loadPencapaian() {
  ui.setMessage('pencapaian-status', 'Memuatkan pencapaian...', 'loading');
  const response = await sb.from('achievement').select('*')
    .order('tarikh', { ascending: false }).order('susunan').order('id', { ascending: false });
  const tbody = clearTable('pencapaian-tbody');
  if (response.error) {
    ui.showLoadError('pencapaian-empty', 'pencapaian-status', 'Pencapaian', response.error);
    return false;
  }
  const rows = response.data || [];
  rows.forEach(function (row) {
    const tr = document.createElement('tr');
    tr.append(
      ui.createCell(ui.formatDate(row.tarikh)),
      ui.createCell(row.tajuk, 'admin-table-title'),
      ui.createCell(row.kategori),
      actionsCell(function () { openPencapaianModal(row); }, function () {
        deleteRow('achievement', row.id, 'pencapaian ' + row.tajuk, loadPencapaian);
      })
    );
    tbody.appendChild(tr);
  });
  ui.showEmpty('pencapaian-empty', !rows.length);
  ui.setMessage('pencapaian-status', rows.length + ' pencapaian.', 'success');
  return true;
}

function openPencapaianModal(row) {
  editIds.pencapaian = row ? row.id : null;
  document.getElementById('f-pencapaian-tarikh').value = row && row.tarikh ? row.tarikh : todayIso();
  document.getElementById('f-pencapaian-kategori').value = row && row.kategori ? row.kategori : 'kokurikulum';
  document.getElementById('f-pencapaian-tajuk').value = row ? row.tajuk : '';
  document.getElementById('f-pencapaian-penerangan').value = row && row.penerangan ? row.penerangan : '';
  document.getElementById('f-pencapaian-kandungan').value = row && row.kandungan ? row.kandungan : '';
  const slug = document.getElementById('f-pencapaian-slug');
  slug.value = row && row.slug ? row.slug : articleSlug(row ? row.tajuk : '');
  slug.dataset.generated = row && row.slug ? 'false' : 'true';
  document.getElementById('f-pencapaian-image').value = row && row.image_url ? row.image_url : '';
  document.getElementById('f-pencapaian-galeri').value = galleryText(row && row.galeri);
  document.getElementById('f-pencapaian-pautan').value = row && row.pautan ? row.pautan : '';
  document.getElementById('f-pencapaian-susunan').value = row ? row.susunan : 0;
  openRecordModal('pencapaian', row ? 'Ubah Pencapaian' : 'Tambah Pencapaian', 'f-pencapaian-tajuk');
}

function articleSlug(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 140);
}

function galleryText(items) {
  if (!Array.isArray(items)) return '';
  return items.map(function (item) {
    if (typeof item === 'string') return item;
    return String(item && item.url || '') + (item && item.alt ? ' | ' + item.alt : '');
  }).filter(Boolean).join('\n');
}

function parseGallery(value) {
  const items = [];
  const lines = String(value || '').split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
  for (const line of lines) {
    const separator = line.indexOf('|');
    const rawUrl = (separator < 0 ? line : line.slice(0, separator)).trim();
    const url = ui.validHttpUrl(rawUrl);
    if (!url) return false;
    items.push({ url: url, alt: separator < 0 ? '' : line.slice(separator + 1).trim() });
  }
  return items;
}

function internalPath(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const url = ui.validHttpUrl(raw, { internalOnly: true });
  if (!url) return false;
  const parsed = new URL(url);
  return parsed.pathname + parsed.search + parsed.hash;
}

async function savePencapaian() {
  const tajuk = document.getElementById('f-pencapaian-tajuk').value.trim();
  const kandungan = document.getElementById('f-pencapaian-kandungan').value.trim();
  const slug = articleSlug(document.getElementById('f-pencapaian-slug').value);
  const pautan = internalPath(document.getElementById('f-pencapaian-pautan').value);
  const imageUrl = ui.validHttpUrl(document.getElementById('f-pencapaian-image').value);
  const galeri = parseGallery(document.getElementById('f-pencapaian-galeri').value);
  if (!tajuk) {
    ui.setMessage('pencapaian-msg', 'Sila isi tajuk pencapaian.', 'error');
    return;
  }
  if (pautan === false) {
    ui.setMessage('pencapaian-msg', 'Pautan berita mesti menggunakan laluan dalam smkajerlun.my.', 'error');
    return;
  }
  if (imageUrl === null && document.getElementById('f-pencapaian-image').value.trim()) {
    ui.setMessage('pencapaian-msg', 'URL gambar utama tidak sah.', 'error');
    return;
  }
  if (galeri === false) {
    ui.setMessage('pencapaian-msg', 'Setiap URL galeri perlu menggunakan pautan http atau https yang sah.', 'error');
    return;
  }
  if (kandungan && !slug) {
    ui.setMessage('pencapaian-msg', 'Kod pautan artikel perlu diisi untuk kandungan artikel.', 'error');
    return;
  }
  if (!kandungan && !pautan) {
    ui.setMessage('pencapaian-msg', 'Isi kandungan artikel atau gunakan pautan khas yang sedia ada.', 'error');
    return;
  }
  const payload = {
    kategori: document.getElementById('f-pencapaian-kategori').value.trim() || 'kokurikulum',
    tajuk: tajuk,
    tarikh: document.getElementById('f-pencapaian-tarikh').value || null,
    penerangan: document.getElementById('f-pencapaian-penerangan').value.trim() || null,
    kandungan: kandungan || null,
    slug: kandungan ? slug : null,
    image_url: imageUrl,
    galeri: galeri,
    pautan: kandungan ? '/berita/?slug=' + encodeURIComponent(slug) : pautan,
    susunan: numberValue('f-pencapaian-susunan', 0)
  };
  const button = document.getElementById('pencapaian-simpan');
  ui.setBusy(button, true, 'Menyimpan...');
  const response = await saveRow('achievement', editIds.pencapaian, payload);
  ui.setBusy(button, false);
  if (response.error) {
    ui.setMessage('pencapaian-msg', errorText('Pencapaian', response.error), 'error');
    return;
  }
  ui.markModalSaved('pencapaian-modal');
  closeRecordModal('pencapaian', true);
  await loadPencapaian();
  showToast('Berjaya', 'Pencapaian disimpan.', 'success');
}

// ---------------------------------------------------------------------------
// Direktori dan muat turun
// ---------------------------------------------------------------------------
async function loadDirektori() {
  ui.setMessage('direktori-status', 'Memuatkan direktori...', 'loading');
  const response = await sb.from('school_directory').select('*').order('susunan').order('nama');
  const tbody = clearTable('direktori-tbody');
  if (response.error) {
    ui.showLoadError('direktori-empty', 'direktori-status', 'Direktori sekolah', response.error);
    return false;
  }
  const rows = response.data || [];
  rows.forEach(function (row) {
    const tr = document.createElement('tr');
    tr.append(
      ui.createCell(row.susunan),
      ui.createCell(row.nama, 'admin-table-title'),
      ui.createCell(row.jawatan),
      ui.createCell(row.kategori),
      actionsCell(function () { openDirektoriModal(row); }, function () {
        deleteRow('school_directory', row.id, 'rekod direktori ' + row.nama, loadDirektori);
      })
    );
    tbody.appendChild(tr);
  });
  ui.showEmpty('direktori-empty', !rows.length);
  ui.setMessage('direktori-status', rows.length + ' rekod direktori.', 'success');
  return true;
}

function openDirektoriModal(row) {
  editIds.direktori = row ? row.id : null;
  document.getElementById('f-direktori-kategori').value = row ? row.kategori : 'pentadbiran';
  document.getElementById('f-direktori-nama').value = row ? row.nama : '';
  document.getElementById('f-direktori-jawatan').value = row ? row.jawatan : '';
  document.getElementById('f-direktori-telefon').value = row && row.telefon ? row.telefon : '';
  document.getElementById('f-direktori-emel').value = row && row.emel ? row.emel : '';
  document.getElementById('f-direktori-susunan').value = row ? row.susunan : 10;
  openRecordModal('direktori', row ? 'Ubah Rekod Direktori' : 'Tambah Rekod Direktori', 'f-direktori-nama');
}

async function saveDirektori() {
  const kategori = document.getElementById('f-direktori-kategori').value.trim();
  const nama = document.getElementById('f-direktori-nama').value.trim();
  const jawatan = document.getElementById('f-direktori-jawatan').value.trim();
  const emailInput = document.getElementById('f-direktori-emel');
  if (!kategori || !nama || !jawatan) {
    ui.setMessage('direktori-msg', 'Sila isi kategori, nama dan jawatan.', 'error');
    return;
  }
  if (emailInput.value && !emailInput.checkValidity()) {
    ui.setMessage('direktori-msg', 'Sila masukkan alamat e-mel yang sah.', 'error');
    return;
  }
  const payload = {
    kategori: kategori,
    nama: nama,
    jawatan: jawatan,
    telefon: document.getElementById('f-direktori-telefon').value.trim() || null,
    emel: emailInput.value.trim() || null,
    susunan: numberValue('f-direktori-susunan', 0)
  };
  const button = document.getElementById('direktori-simpan');
  ui.setBusy(button, true, 'Menyimpan...');
  const response = await saveRow('school_directory', editIds.direktori, payload);
  ui.setBusy(button, false);
  if (response.error) {
    ui.setMessage('direktori-msg', errorText('Rekod direktori', response.error), 'error');
    return;
  }
  ui.markModalSaved('direktori-modal');
  closeRecordModal('direktori', true);
  await loadDirektori();
  showToast('Berjaya', 'Rekod direktori disimpan.', 'success');
}

async function loadFail() {
  ui.setMessage('fail-status', 'Memuatkan senarai fail...', 'loading');
  const response = await sb.from('resource_file').select('*').order('susunan').order('tajuk');
  const tbody = clearTable('fail-tbody');
  if (response.error) {
    ui.showLoadError('fail-empty', 'fail-status', 'Senarai fail', response.error);
    return false;
  }
  const rows = response.data || [];
  rows.forEach(function (row) {
    const tr = document.createElement('tr');
    tr.append(
      ui.createCell(row.susunan),
      ui.createCell(row.tajuk, 'admin-table-title'),
      ui.createCell(row.kategori),
      actionsCell(function () { openFailModal(row); }, function () {
        deleteRow('resource_file', row.id, 'fail ' + row.tajuk, loadFail);
      })
    );
    tbody.appendChild(tr);
  });
  ui.showEmpty('fail-empty', !rows.length);
  ui.setMessage('fail-status', rows.length + ' fail untuk dimuat turun.', 'success');
  return true;
}

function openFailModal(row) {
  editIds.fail = row ? row.id : null;
  document.getElementById('f-fail-kategori').value = row ? row.kategori : 'Borang';
  document.getElementById('f-fail-tajuk').value = row ? row.tajuk : '';
  document.getElementById('f-fail-penerangan').value = row && row.penerangan ? row.penerangan : '';
  document.getElementById('f-fail-url').value = row ? row.url : '';
  document.getElementById('f-fail-susunan').value = row ? row.susunan : 10;
  openRecordModal('fail', row ? 'Ubah Fail' : 'Tambah Fail', 'f-fail-tajuk');
}

async function saveFail() {
  const kategori = document.getElementById('f-fail-kategori').value.trim();
  const tajuk = document.getElementById('f-fail-tajuk').value.trim();
  const url = ui.validHttpUrl(document.getElementById('f-fail-url').value);
  if (!kategori || !tajuk || !url) {
    ui.setMessage('fail-msg', 'Sila isi kategori, tajuk dan URL fail yang sah.', 'error');
    return;
  }
  const payload = {
    kategori: kategori,
    tajuk: tajuk,
    penerangan: document.getElementById('f-fail-penerangan').value.trim() || null,
    url: url,
    susunan: numberValue('f-fail-susunan', 0)
  };
  const button = document.getElementById('fail-simpan');
  ui.setBusy(button, true, 'Menyimpan...');
  const response = await saveRow('resource_file', editIds.fail, payload);
  ui.setBusy(button, false);
  if (response.error) {
    ui.setMessage('fail-msg', errorText('Fail', response.error), 'error');
    return;
  }
  ui.markModalSaved('fail-modal');
  closeRecordModal('fail', true);
  await loadFail();
  showToast('Berjaya', 'Fail disimpan.', 'success');
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------
function auditSummary(row) {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const record = metadata.new || metadata.old || {};
  const label = record.tajuk || record.nama || record.bilik || record.kelas || record.rujukan || '';
  const portal = record.portal ? 'Destinasi: ' + record.portal : '';
  const status = record.status ? 'Status: ' + record.status : '';
  return [label, portal, status].filter(Boolean).join(' | ') || 'Perubahan rekod direkodkan.';
}

function renderAudit() {
  const filter = document.getElementById('audit-filter').value;
  const rows = auditRows.filter(function (row) { return !filter || row.table_name === filter; });
  const tbody = clearTable('audit-tbody');
  rows.forEach(function (row) {
    const tr = document.createElement('tr');
    const action = document.createElement('span');
    action.className = 'audit-action';
    action.dataset.action = row.action;
    action.textContent = row.action;
    const actionCell = document.createElement('td');
    actionCell.appendChild(action);
    tr.append(
      ui.createCell(ui.formatDateTime(row.created_at)),
      actionCell,
      ui.createCell(MODULE_LABEL[row.table_name] || row.table_name),
      ui.createCell(row.record_id),
      ui.createCell(auditSummary(row), 'audit-detail')
    );
    tbody.appendChild(tr);
  });
  ui.showEmpty('audit-empty', !rows.length);
  ui.setMessage('audit-status', rows.length ? rows.length + ' perubahan dipaparkan.' : '', 'success');
}

async function loadAudit() {
  ui.setMessage('audit-status', 'Memuatkan log perubahan...', 'loading');
  const response = await sb.from('admin_audit_log')
    .select('id,action,table_name,record_id,metadata,created_at')
    .order('created_at', { ascending: false }).limit(200);
  if (response.error) {
    auditRows = [];
    clearTable('audit-tbody');
    ui.showLoadError('audit-empty', 'audit-status', 'Log perubahan', response.error);
    return false;
  }
  auditRows = response.data || [];
  renderAudit();
  return true;
}

function bindEvents() {
  ui.bindTabs({ buttonSelector: '.tab-btn', paneSelector: '.admin-tabpane' });
  document.getElementById('f-staf-kategori').addEventListener('change', refreshStafTierVisibility);
  document.getElementById('staf-filter').addEventListener('change', loadStaf);
  document.getElementById('staf-tambah').addEventListener('click', function () { openStafModal(null); });
  document.getElementById('staf-batal').addEventListener('click', function () { closeRecordModal('staf'); });
  document.getElementById('staf-simpan').addEventListener('click', saveStaf);

  document.getElementById('pengumuman-tambah').addEventListener('click', function () { openPengumumanModal(null); });
  document.getElementById('pengumuman-batal').addEventListener('click', function () { closeRecordModal('pengumuman'); });
  document.getElementById('pengumuman-simpan').addEventListener('click', savePengumuman);

  document.getElementById('kandungan-filter').addEventListener('change', loadKandungan);
  document.getElementById('f-kandungan-jenis').addEventListener('change', refreshKandunganHint);
  document.getElementById('f-kandungan-kandungan').addEventListener('input', refreshKandunganPreview);
  document.getElementById('kandungan-contoh').addEventListener('click', insertKandunganTemplate);
  document.getElementById('kandungan-tambah').addEventListener('click', function () { openKandunganModal(null); });
  document.getElementById('kandungan-batal').addEventListener('click', function () { closeRecordModal('kandungan'); });
  document.getElementById('kandungan-simpan').addEventListener('click', saveKandungan);

  document.getElementById('takwim-filter').addEventListener('change', loadTakwim);
  document.getElementById('takwim-tambah').addEventListener('click', function () { openTakwimModal(null); });
  document.getElementById('takwim-batal').addEventListener('click', function () { closeRecordModal('takwim'); });
  document.getElementById('takwim-simpan').addEventListener('click', saveTakwim);

  ['f-galeri-url', 'f-galeri-alt', 'f-galeri-tajuk'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', updateGalleryPreview);
  });
  document.getElementById('galeri-tambah').addEventListener('click', function () { openGaleriModal(null); });
  document.getElementById('galeri-batal').addEventListener('click', function () { closeRecordModal('galeri'); });
  document.getElementById('galeri-simpan').addEventListener('click', saveGaleri);

  document.getElementById('pencapaian-tambah').addEventListener('click', function () { openPencapaianModal(null); });
  document.getElementById('f-pencapaian-tajuk').addEventListener('input', function () {
    const slug = document.getElementById('f-pencapaian-slug');
    if (!slug.value || slug.dataset.generated === 'true') {
      slug.value = articleSlug(this.value);
      slug.dataset.generated = 'true';
    }
  });
  document.getElementById('f-pencapaian-slug').addEventListener('input', function () { this.dataset.generated = 'false'; });
  document.getElementById('pencapaian-batal').addEventListener('click', function () { closeRecordModal('pencapaian'); });
  document.getElementById('pencapaian-simpan').addEventListener('click', savePencapaian);

  document.getElementById('direktori-tambah').addEventListener('click', function () { openDirektoriModal(null); });
  document.getElementById('direktori-batal').addEventListener('click', function () { closeRecordModal('direktori'); });
  document.getElementById('direktori-simpan').addEventListener('click', saveDirektori);

  document.getElementById('fail-tambah').addEventListener('click', function () { openFailModal(null); });
  document.getElementById('fail-batal').addEventListener('click', function () { closeRecordModal('fail'); });
  document.getElementById('fail-simpan').addEventListener('click', saveFail);

  document.getElementById('audit-filter').addEventListener('change', renderAudit);
  document.getElementById('audit-refresh').addEventListener('click', loadAudit);
}

(async function init() {
  const auth = await refreshAuthBox();
  if (!auth.admin) {
    document.getElementById('admin-denied').style.display = 'block';
    return;
  }
  document.getElementById('admin-main').style.display = 'block';
  bindEvents();
  const results = await Promise.all([
    loadStaf(),
    loadPengumuman(),
    loadKandungan(),
    loadTakwim(),
    loadGaleri(),
    loadPencapaian(),
    loadDirektori(),
    loadFail(),
    loadAudit()
  ]);
  if (results.every(Boolean)) setHealth('ready', 'Semua modul kandungan bersambung');
  else setHealth('error', 'Ada modul yang memerlukan perhatian');
}());
