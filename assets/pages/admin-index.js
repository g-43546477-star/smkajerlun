let isAdminUser = false;

// ---------- Tabs ----------
document.querySelectorAll('.tab-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('.admin-tabpane').forEach(function (p) { p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('pane-' + btn.dataset.tab).classList.add('active');
  });
});

const HINTS = {
  paragraf: 'Tulis perenggan biasa. Guna baris kosong untuk mulakan perenggan baharu.',
  senarai_ol: 'Satu item setiap baris — akan dipaparkan bernombor (1, 2, 3...).',
  senarai_ul: 'Satu item setiap baris — akan dipaparkan berbulet.',
  definisi: 'Format setiap baris: Label :: Nilai — cth: Telefon :: 04-9250925',
  lagu: 'Pisahkan setiap rangkap dengan baris KOSONG. Baris lirik Arab mulakan dengan "ARAB:". Rangkap korus mulakan dengan "KORUS:" pada baris pertama rangkap itu.',
  panitia: 'Setiap kumpulan dipisahkan dengan baris KOSONG. Format setiap kumpulan:\nBIDANG: <nama bidang/unit/kelab>\nGURU KANAN: <nama> (atau PENYELARAS: <nama> untuk kokurikulum)\nKP: <mata pelajaran/unit/kelab> :: <nama>\n(satu baris KP: untuk setiap ketua/penasihat)'
};

// =======================================================================
// TAB 1: STAF & CARTA
// =======================================================================
let stafEditId = null;

function refreshStafTierVisibility() {
  document.getElementById('f-staf-tier-wrap').style.display =
    document.getElementById('f-staf-kategori').value === 'pentadbir' ? 'block' : 'none';
}
document.getElementById('f-staf-kategori').addEventListener('change', refreshStafTierVisibility);

async function loadStaf() {
  const kategori = document.getElementById('staf-filter').value;
  const { data, error } = await sb.from('staff').select('*').eq('kategori', kategori).order('susunan');
  const tbody = document.getElementById('staf-tbody');
  tbody.innerHTML = '';
  const rows = error ? [] : (data || []);
  document.getElementById('staf-empty').style.display = rows.length ? 'none' : 'block';
  const tierLabel = { pengetua: 'Pengetua', pk: 'Penolong Kanan', ketua: 'Ketua Bidang' };
  rows.forEach(function (s) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + s.susunan + '</td>' +
      '<td>' + (s.tier ? tierLabel[s.tier] || s.tier : '-') + '</td>' +
      '<td>' + (s.jawatan || '-') + '</td>' +
      '<td class="nama">' + s.nama + '</td>' +
      '<td>' + (s.gred || '-') + '</td>' +
      '<td style="text-align:right"></td>';
    const tdAction = tr.lastElementChild;
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit'; editBtn.textContent = 'Ubah';
    editBtn.onclick = function () { openStafModal(s); };
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger'; delBtn.textContent = 'Padam'; delBtn.style.marginLeft = '6px';
    delBtn.onclick = function () { deleteStaf(s.id); };
    tdAction.appendChild(editBtn); tdAction.appendChild(delBtn);
    tbody.appendChild(tr);
  });
}

function openStafModal(s) {
  stafEditId = s ? s.id : null;
  document.getElementById('staf-modal-title').textContent = s ? 'Ubah Staf' : 'Tambah Staf';
  document.getElementById('staf-msg').textContent = '';
  document.getElementById('f-staf-kategori').value = s ? s.kategori : document.getElementById('staf-filter').value;
  refreshStafTierVisibility();
  document.getElementById('f-staf-tier').value = (s && s.tier) ? s.tier : 'pk';
  document.getElementById('f-staf-jawatan').value = (s && s.jawatan) || '';
  document.getElementById('f-staf-nama').value = s ? s.nama : '';
  document.getElementById('f-staf-gred').value = (s && s.gred) || '';
  document.getElementById('f-staf-susunan').value = s ? s.susunan : 10;
  document.getElementById('staf-modal').style.display = 'flex';
}
function closeStafModal() { document.getElementById('staf-modal').style.display = 'none'; }
document.getElementById('staf-tambah').addEventListener('click', function () { openStafModal(null); });
document.getElementById('staf-batal').addEventListener('click', closeStafModal);
document.getElementById('staf-filter').addEventListener('change', loadStaf);

document.getElementById('staf-simpan').addEventListener('click', async function () {
  const kategori = document.getElementById('f-staf-kategori').value;
  const nama = document.getElementById('f-staf-nama').value.trim();
  if (!nama) { document.getElementById('staf-msg').textContent = 'Sila isi nama.'; return; }
  const payload = {
    kategori: kategori,
    tier: kategori === 'pentadbir' ? document.getElementById('f-staf-tier').value : null,
    jawatan: document.getElementById('f-staf-jawatan').value.trim() || null,
    nama: nama,
    gred: document.getElementById('f-staf-gred').value.trim() || null,
    susunan: parseInt(document.getElementById('f-staf-susunan').value, 10) || 0
  };
  const btn = document.getElementById('staf-simpan');
  btn.disabled = true; btn.textContent = 'Menyimpan...';
  let err;
  if (stafEditId) { ({ error: err } = await sb.from('staff').update(payload).eq('id', stafEditId)); }
  else { ({ error: err } = await sb.from('staff').insert(payload)); }
  btn.disabled = false; btn.textContent = 'Simpan';
  if (err) { document.getElementById('staf-msg').textContent = 'Gagal menyimpan: ' + err.message; return; }
  closeStafModal();
  document.getElementById('staf-filter').value = kategori;
  await loadStaf();
  showToast('Berjaya', 'Rekod staf disimpan.', 'success');
});

async function deleteStaf(id) {
  if (!confirm('Padam rekod staf ini?')) return;
  const { error } = await sb.from('staff').delete().eq('id', id);
  if (error) { alert('Gagal memadam: ' + error.message); return; }
  await loadStaf();
}

// =======================================================================
// TAB 2: PENGUMUMAN
// =======================================================================
let pengumumanEditId = null;

async function loadPengumuman() {
  const { data, error } = await sb.from('pengumuman').select('*').order('tarikh', { ascending: false }).order('id', { ascending: false });
  const tbody = document.getElementById('pengumuman-tbody');
  tbody.innerHTML = '';
  const rows = error ? [] : (data || []);
  document.getElementById('pengumuman-empty').style.display = rows.length ? 'none' : 'block';
  rows.forEach(function (n) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td class="tarikh">' + n.tarikh + '</td><td>' + n.tajuk + '</td><td style="text-align:right"></td>';
    const tdAction = tr.lastElementChild;
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit'; editBtn.textContent = 'Ubah';
    editBtn.onclick = function () { openPengumumanModal(n); };
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger'; delBtn.textContent = 'Padam'; delBtn.style.marginLeft = '6px';
    delBtn.onclick = function () { deletePengumuman(n.id); };
    tdAction.appendChild(editBtn); tdAction.appendChild(delBtn);
    tbody.appendChild(tr);
  });
}

function openPengumumanModal(n) {
  pengumumanEditId = n ? n.id : null;
  document.getElementById('pengumuman-modal-title').textContent = n ? 'Ubah Pengumuman' : 'Tambah Pengumuman';
  document.getElementById('pengumuman-msg').textContent = '';
  document.getElementById('f-pengumuman-tarikh').value = n ? n.tarikh : new Date().toISOString().split('T')[0];
  document.getElementById('f-pengumuman-tajuk').value = n ? n.tajuk : '';
  document.getElementById('f-pengumuman-kandungan').value = (n && n.kandungan) || '';
  document.getElementById('pengumuman-modal').style.display = 'flex';
}
function closePengumumanModal() { document.getElementById('pengumuman-modal').style.display = 'none'; }
document.getElementById('pengumuman-tambah').addEventListener('click', function () { openPengumumanModal(null); });
document.getElementById('pengumuman-batal').addEventListener('click', closePengumumanModal);

document.getElementById('pengumuman-simpan').addEventListener('click', async function () {
  const tajuk = document.getElementById('f-pengumuman-tajuk').value.trim();
  if (!tajuk) { document.getElementById('pengumuman-msg').textContent = 'Sila isi tajuk.'; return; }
  const payload = {
    tarikh: document.getElementById('f-pengumuman-tarikh').value,
    tajuk: tajuk,
    kandungan: document.getElementById('f-pengumuman-kandungan').value.trim()
  };
  const btn = document.getElementById('pengumuman-simpan');
  btn.disabled = true; btn.textContent = 'Menyimpan...';
  let err;
  if (pengumumanEditId) { ({ error: err } = await sb.from('pengumuman').update(payload).eq('id', pengumumanEditId)); }
  else { ({ error: err } = await sb.from('pengumuman').insert(payload)); }
  btn.disabled = false; btn.textContent = 'Simpan';
  if (err) { document.getElementById('pengumuman-msg').textContent = 'Gagal menyimpan: ' + err.message; return; }
  closePengumumanModal();
  await loadPengumuman();
  showToast('Berjaya', 'Pengumuman disimpan.', 'success');
});

async function deletePengumuman(id) {
  if (!confirm('Padam pengumuman ini?')) return;
  const { error } = await sb.from('pengumuman').delete().eq('id', id);
  if (error) { alert('Gagal memadam: ' + error.message); return; }
  await loadPengumuman();
}

// =======================================================================
// TAB: GALERI AKTIVITI
// =======================================================================
let galeriEditId = null;
async function loadGaleri() {
  const { data, error } = await sb.from('gallery_item').select('*').order('tarikh', { ascending: false }).order('id', { ascending: false });
  const rows = error ? [] : (data || []);
  const tbody = document.getElementById('galeri-tbody'); tbody.replaceChildren();
  rows.forEach(function (item) {
    const tr = document.createElement('tr');
    [item.tarikh || '-', item.tajuk || '-', item.image_url || '-'].forEach(function (value) { const td = document.createElement('td'); td.textContent = value; tr.appendChild(td); });
    const actions = document.createElement('td'); actions.style.textAlign = 'right';
    const edit = document.createElement('button'); edit.className = 'btn-edit'; edit.textContent = 'Ubah'; edit.onclick = function () { openGaleriModal(item); };
    const del = document.createElement('button'); del.className = 'btn-danger'; del.textContent = 'Padam'; del.style.marginLeft = '6px'; del.onclick = function () { deleteGaleri(item.id); };
    actions.append(edit, del); tr.appendChild(actions); tbody.appendChild(tr);
  });
  document.getElementById('galeri-empty').style.display = rows.length ? 'none' : 'block';
}
function openGaleriModal(item) {
  galeriEditId = item ? item.id : null;
  document.getElementById('galeri-modal-title').textContent = item ? 'Ubah Gambar Aktiviti' : 'Tambah Gambar Aktiviti';
  document.getElementById('galeri-msg').textContent = '';
  document.getElementById('f-galeri-tarikh').value = item ? item.tarikh || '' : new Date().toISOString().slice(0, 10);
  document.getElementById('f-galeri-tajuk').value = item ? item.tajuk || '' : '';
  document.getElementById('f-galeri-url').value = item ? item.image_url || '' : '';
  document.getElementById('f-galeri-alt').value = item ? item.alt_text || '' : '';
  document.getElementById('galeri-modal').style.display = 'flex';
}
function closeGaleriModal() { document.getElementById('galeri-modal').style.display = 'none'; }
document.getElementById('galeri-tambah').addEventListener('click', function () { openGaleriModal(null); });
document.getElementById('galeri-batal').addEventListener('click', closeGaleriModal);
document.getElementById('galeri-simpan').addEventListener('click', async function () {
  const tajuk = document.getElementById('f-galeri-tajuk').value.trim();
  const image_url = document.getElementById('f-galeri-url').value.trim();
  if (!tajuk || !image_url) { document.getElementById('galeri-msg').textContent = 'Sila isi tajuk dan URL gambar.'; return; }
  const payload = { tajuk, image_url, alt_text: document.getElementById('f-galeri-alt').value.trim() || tajuk, tarikh: document.getElementById('f-galeri-tarikh').value || null };
  let error;
  if (galeriEditId) ({ error } = await sb.from('gallery_item').update(payload).eq('id', galeriEditId));
  else ({ error } = await sb.from('gallery_item').insert(payload));
  if (error) { document.getElementById('galeri-msg').textContent = 'Gagal menyimpan: ' + error.message; return; }
  closeGaleriModal(); await loadGaleri(); showToast('Berjaya', 'Gambar galeri disimpan.', 'success');
});
async function deleteGaleri(id) {
  if (!confirm('Padam gambar ini?')) return;
  const { error } = await sb.from('gallery_item').delete().eq('id', id);
  if (error) { alert('Gagal memadam: ' + error.message); return; }
  await loadGaleri();
}

// =======================================================================
// TAB 3: KANDUNGAN LAMAN
// =======================================================================
let kandunganEditId = null;
const JENIS_LABEL = { paragraf: 'Perenggan', senarai_ol: 'Senarai Bernombor', senarai_ul: 'Senarai Bulet', definisi: 'Definisi', lagu: 'Lagu Sekolah', panitia: 'Panitia (ikut Bidang)' };

async function loadKandungan() {
  const laman = document.getElementById('kandungan-filter').value;
  const { data, error } = await sb.from('content_block').select('*').eq('laman', laman).order('susunan');
  const tbody = document.getElementById('kandungan-tbody');
  tbody.innerHTML = '';
  const rows = error ? [] : (data || []);
  document.getElementById('kandungan-empty').style.display = rows.length ? 'none' : 'block';
  rows.forEach(function (b) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + b.susunan + '</td><td>' + (b.tajuk || '-') + '</td><td>' + (JENIS_LABEL[b.jenis] || b.jenis) + '</td><td style="text-align:right"></td>';
    const tdAction = tr.lastElementChild;
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit'; editBtn.textContent = 'Ubah';
    editBtn.onclick = function () { openKandunganModal(b); };
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger'; delBtn.textContent = 'Padam'; delBtn.style.marginLeft = '6px';
    delBtn.onclick = function () { deleteKandungan(b.id); };
    tdAction.appendChild(editBtn); tdAction.appendChild(delBtn);
    tbody.appendChild(tr);
  });
}

function refreshKandunganHint() {
  document.getElementById('kandungan-hint').textContent = HINTS[document.getElementById('f-kandungan-jenis').value] || '';
}
document.getElementById('f-kandungan-jenis').addEventListener('change', refreshKandunganHint);

function openKandunganModal(b) {
  kandunganEditId = b ? b.id : null;
  document.getElementById('kandungan-modal-title').textContent = b ? 'Ubah Blok Kandungan' : 'Tambah Blok Kandungan';
  document.getElementById('kandungan-msg').textContent = '';
  document.getElementById('f-kandungan-laman').value = b ? b.laman : document.getElementById('kandungan-filter').value;
  document.getElementById('f-kandungan-jenis').value = b ? b.jenis : 'paragraf';
  document.getElementById('f-kandungan-tajuk').value = (b && b.tajuk) || '';
  document.getElementById('f-kandungan-susunan').value = b ? b.susunan : 10;
  document.getElementById('f-kandungan-kandungan').value = (b && b.kandungan) || '';
  refreshKandunganHint();
  document.getElementById('kandungan-modal').style.display = 'flex';
}
function closeKandunganModal() { document.getElementById('kandungan-modal').style.display = 'none'; }
document.getElementById('kandungan-tambah').addEventListener('click', function () { openKandunganModal(null); });
document.getElementById('kandungan-batal').addEventListener('click', closeKandunganModal);
document.getElementById('kandungan-filter').addEventListener('change', loadKandungan);

document.getElementById('kandungan-simpan').addEventListener('click', async function () {
  const payload = {
    laman: document.getElementById('f-kandungan-laman').value,
    jenis: document.getElementById('f-kandungan-jenis').value,
    tajuk: document.getElementById('f-kandungan-tajuk').value.trim() || null,
    susunan: parseInt(document.getElementById('f-kandungan-susunan').value, 10) || 0,
    kandungan: document.getElementById('f-kandungan-kandungan').value
  };
  const btn = document.getElementById('kandungan-simpan');
  btn.disabled = true; btn.textContent = 'Menyimpan...';
  let err;
  if (kandunganEditId) { ({ error: err } = await sb.from('content_block').update(payload).eq('id', kandunganEditId)); }
  else { ({ error: err } = await sb.from('content_block').insert(payload)); }
  btn.disabled = false; btn.textContent = 'Simpan';
  if (err) { document.getElementById('kandungan-msg').textContent = 'Gagal menyimpan: ' + err.message; return; }
  closeKandunganModal();
  document.getElementById('kandungan-filter').value = payload.laman;
  await loadKandungan();
  showToast('Berjaya', 'Blok kandungan disimpan.', 'success');
});

async function deleteKandungan(id) {
  if (!confirm('Padam blok kandungan ini?')) return;
  const { error } = await sb.from('content_block').delete().eq('id', id);
  if (error) { alert('Gagal memadam: ' + error.message); return; }
  await loadKandungan();
}

// =======================================================================
// TAB 4: TAKWIM
// =======================================================================
let takwimEditId = null;
const KATEGORI_TAKWIM_LABEL = { aktiviti: 'Aktiviti & Program', akademik: 'Kalendar Akademik', cuti: 'Hari Kelepasan Am' };

async function loadTakwim() {
  const kategori = document.getElementById('takwim-filter').value;
  const { data, error } = await sb.from('takwim').select('*').eq('kategori', kategori).order('tarikh_mula');
  const tbody = document.getElementById('takwim-tbody');
  tbody.innerHTML = '';
  const rows = error ? [] : (data || []);
  document.getElementById('takwim-empty').style.display = rows.length ? 'none' : 'block';
  rows.forEach(function (r) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td class="tarikh">' + r.tarikh_mula + '</td><td>' + (r.tarikh_tamat || '-') + '</td><td>' + r.tajuk + '</td><td style="text-align:right"></td>';
    const tdAction = tr.lastElementChild;
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit'; editBtn.textContent = 'Ubah';
    editBtn.onclick = function () { openTakwimModal(r); };
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger'; delBtn.textContent = 'Padam'; delBtn.style.marginLeft = '6px';
    delBtn.onclick = function () { deleteTakwim(r.id); };
    tdAction.appendChild(editBtn); tdAction.appendChild(delBtn);
    tbody.appendChild(tr);
  });
}

function openTakwimModal(r) {
  takwimEditId = r ? r.id : null;
  document.getElementById('takwim-modal-title').textContent = r ? 'Ubah Entri Takwim' : 'Tambah Entri Takwim';
  document.getElementById('takwim-msg').textContent = '';
  document.getElementById('f-takwim-kategori').value = r ? r.kategori : document.getElementById('takwim-filter').value;
  document.getElementById('f-takwim-mula').value = r ? r.tarikh_mula : '';
  document.getElementById('f-takwim-tamat').value = (r && r.tarikh_tamat) || '';
  document.getElementById('f-takwim-tajuk').value = r ? r.tajuk : '';
  document.getElementById('f-takwim-keterangan').value = (r && r.keterangan) || '';
  document.getElementById('f-takwim-susunan').value = r ? r.susunan : 10;
  document.getElementById('takwim-modal').style.display = 'flex';
}
function closeTakwimModal() { document.getElementById('takwim-modal').style.display = 'none'; }
document.getElementById('takwim-tambah').addEventListener('click', function () { openTakwimModal(null); });
document.getElementById('takwim-batal').addEventListener('click', closeTakwimModal);
document.getElementById('takwim-filter').addEventListener('change', loadTakwim);

document.getElementById('takwim-simpan').addEventListener('click', async function () {
  const tajuk = document.getElementById('f-takwim-tajuk').value.trim();
  const mula = document.getElementById('f-takwim-mula').value;
  if (!tajuk || !mula) { document.getElementById('takwim-msg').textContent = 'Sila isi tajuk dan tarikh mula.'; return; }
  const payload = {
    kategori: document.getElementById('f-takwim-kategori').value,
    tarikh_mula: mula,
    tarikh_tamat: document.getElementById('f-takwim-tamat').value || null,
    tajuk: tajuk,
    keterangan: document.getElementById('f-takwim-keterangan').value.trim() || null,
    susunan: parseInt(document.getElementById('f-takwim-susunan').value, 10) || 0
  };
  const btn = document.getElementById('takwim-simpan');
  btn.disabled = true; btn.textContent = 'Menyimpan...';
  let err;
  if (takwimEditId) { ({ error: err } = await sb.from('takwim').update(payload).eq('id', takwimEditId)); }
  else { ({ error: err } = await sb.from('takwim').insert(payload)); }
  btn.disabled = false; btn.textContent = 'Simpan';
  if (err) { document.getElementById('takwim-msg').textContent = 'Gagal menyimpan: ' + err.message; return; }
  closeTakwimModal();
  document.getElementById('takwim-filter').value = payload.kategori;
  await loadTakwim();
  showToast('Berjaya', 'Entri takwim disimpan.', 'success');
});

async function deleteTakwim(id) {
  if (!confirm('Padam entri takwim ini?')) return;
  const { error } = await sb.from('takwim').delete().eq('id', id);
  if (error) { alert('Gagal memadam: ' + error.message); return; }
  await loadTakwim();
}


// =======================================================================
// INIT
// =======================================================================
(async function init() {
  const { admin } = await refreshAuthBox();
  if (!admin) {
    document.getElementById('admin-denied').style.display = 'block';
    return;
  }
  isAdminUser = true;
  document.getElementById('admin-main').style.display = 'block';
  await Promise.all([loadStaf(), loadPengumuman(), loadGaleri(), loadKandungan(), loadTakwim()]);
})();
