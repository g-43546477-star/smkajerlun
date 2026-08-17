const DATEINFO = tarikhInfo();
let currentUser = null;
let currentAdmin = false;
let allEntries = [];
let showMineOnly = false;

function actionCell(entry) {
  const td = document.createElement('td');
  const group = document.createElement('div');
  group.className = 'action-group';
  td.appendChild(group);
  if (entry.status === 'dibatalkan') {
    const span = document.createElement('span');
    span.className = 'status-cancelled';
    span.textContent = 'Dibatalkan';
    group.appendChild(span);
    return td;
  }
  const isAuthor = currentUser && entry.user_id === currentUser.id;
  if (isAuthor) {
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.textContent = 'Ubah';
    editBtn.onclick = () => openEdit(entry);
    group.appendChild(editBtn);
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-danger';
    cancelBtn.textContent = 'Batalkan';
    cancelBtn.onclick = () => onCancel(entry);
    group.appendChild(cancelBtn);
  } else if (currentAdmin) {
    const btn = document.createElement('button');
    btn.className = 'btn-danger';
    btn.textContent = 'Padam';
    btn.onclick = () => onDelete(entry.id);
    group.appendChild(btn);
  } else {
    td.textContent = '-';
  }
  return td;
}

function renderRows() {
  const q = document.getElementById('f-search').value.trim().toLowerCase();
  let filtered = allEntries;
  if (showMineOnly && currentUser) filtered = filtered.filter(e => e.user_id === currentUser.id);
  if (q) {
    filtered = filtered.filter(e =>
      (e.nama_pemohon||'').toLowerCase().includes(q) ||
      (e.kelas||'').toLowerCase().includes(q) ||
      (e.tujuan||'').toLowerCase().includes(q) ||
      (e.bilik||'').toLowerCase().includes(q));
  }

  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';
  document.getElementById('empty').style.display = filtered.length === 0 ? 'block' : 'none';

  filtered.forEach(entry => {
    const tr = document.createElement('tr');
    const tdT = document.createElement('td'); tdT.className = 'tarikh'; tdT.textContent = formatMalayDate(entry.tarikh); tr.appendChild(tdT);
    const tdN = document.createElement('td'); tdN.className = 'nama'; tdN.textContent = entry.nama_pemohon; tr.appendChild(tdN);
    const tdK = document.createElement('td'); const pill = document.createElement('span'); pill.className = 'kelas-pill'; pill.textContent = entry.kelas; tdK.appendChild(pill); tr.appendChild(tdK);
    const tdB = document.createElement('td'); tdB.className = 'bilik'; tdB.textContent = entry.bilik; tr.appendChild(tdB);
    const tdM = document.createElement('td'); tdM.className = 'masa'; tdM.textContent = entry.masa_mula + ' - ' + entry.masa_tamat; tr.appendChild(tdM);
    const tdL = document.createElement('td'); tdL.className = entry.guna_lcd ? 'lcd-yes' : 'lcd-no'; tdL.textContent = entry.guna_lcd ? 'Ya' : '-'; tr.appendChild(tdL);
    const tdJ = document.createElement('td'); tdJ.style.color = '#64748b'; tdJ.textContent = entry.tujuan || '-'; tr.appendChild(tdJ);
    const tdS = document.createElement('td'); tdS.textContent = entry.status === 'dibatalkan' ? '' : 'Aktif'; tr.appendChild(tdS);
    tr.appendChild(actionCell(entry));
    tbody.appendChild(tr);
  });
}

async function loadAll() {
  const source = currentUser || currentAdmin ? 'tempahan' : 'tempahan_awam';
  const { data, error } = await sb.from(source).select('*')
    .order('tarikh', { ascending: false }).order('masa_mula').limit(200);
  const empty = document.getElementById('empty');
  if (error) {
    allEntries = [];
    empty.textContent = currentUser || currentAdmin
      ? 'Senarai tempahan tidak dapat dimuatkan. Sila cuba semula.'
      : 'Log masuk untuk melihat senarai tempahan anda.';
    renderRows();
    return;
  }
  allEntries = data || [];
  empty.textContent = 'Tiada rekod tempahan ditemui.';
  renderRows();
}

async function onDelete(id) {
  if (!confirm('Adakah anda pasti mahu memadam tempahan ini?')) return;
  const { error } = await sb.from('tempahan').delete().eq('id', id);
  if (error) { showToast('Ralat', 'Gagal memadam tempahan. Sila cuba lagi.', 'error'); return; }
  await loadAll();
}

async function onCancel(entry) {
  if (!confirm('Adakah anda pasti mahu membatalkan tempahan ini?')) return;
  const { error } = await sb.from('tempahan').update({ status: 'dibatalkan' }).eq('id', entry.id);
  if (error) { showToast('Ralat', 'Gagal membatalkan tempahan. Sila cuba lagi.', 'error'); return; }
  await loadAll();
}

document.getElementById('f-search').addEventListener('input', renderRows);
document.getElementById('f-mine').addEventListener('change', (e) => { showMineOnly = e.target.checked; renderRows(); });

// ---------- Edit modal ----------
let editEntry = null;
let editTarikh = null;

function populateEditSelects() {
  const kelasSel = document.getElementById('edit-kelas');
  kelasSel.innerHTML = '';
  CLASS_OPTIONS.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; kelasSel.appendChild(o); });
  const bilikSel = document.getElementById('edit-bilik');
  bilikSel.innerHTML = '';
  ROOMS.forEach(r => {
    if (r.sub) {
      const g = document.createElement('optgroup'); g.label = r.id;
      r.sub.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.id; g.appendChild(o); });
      bilikSel.appendChild(g);
    } else {
      const o = document.createElement('option'); o.value = r.id; o.textContent = r.id; bilikSel.appendChild(o);
    }
  });
}

function renderEditDateButtons() {
  const btnHariIni = document.getElementById('edit-hari-ini');
  const btnEsok = document.getElementById('edit-esok');
  btnHariIni.classList.toggle('active', editTarikh === DATEINFO.hariIni);
  btnEsok.classList.toggle('active', editTarikh === DATEINFO.esok);
  btnEsok.disabled = !DATEINFO.bukaEsok && editTarikh !== DATEINFO.esok;
}

function refreshEditLcd() {
  const b = findBookable(document.getElementById('edit-bilik').value);
  const isPSS = b && b.parent === 'Perpustakaan Darul Hikmah';
  document.getElementById('edit-lcd-wrap').style.display = isPSS ? 'flex' : 'none';
  if (!isPSS) document.getElementById('edit-lcd').checked = false;
}
async function refreshEditSlots() {
  refreshEditLcd();
  const bilik = document.getElementById('edit-bilik').value;
  const slotSel = document.getElementById('edit-slot');
  slotSel.innerHTML = '';
  const { data } = await sb.from('tempahan').select('*').eq('bilik', bilik).eq('tarikh', editTarikh).limit(100);
  const busy = (data || []).filter(e => e.id !== editEntry.id && e.status !== 'dibatalkan').map(e => e.masa_mula);
  SLOTS.forEach(s => {
    const o = document.createElement('option');
    o.value = s.masa_mula;
    const label = s.block ? `${s.kumpulan} (${s.label})` : s.label;
    o.textContent = label + (busy.includes(s.masa_mula) ? ' (Ditempah)' : '');
    o.disabled = busy.includes(s.masa_mula);
    slotSel.appendChild(o);
  });
  const currentStillValid = editEntry.bilik === bilik && editEntry.tarikh === editTarikh;
  if (currentStillValid) slotSel.value = editEntry.masa_mula;
}

function openEdit(entry) {
  editEntry = entry;
  editTarikh = entry.tarikh;
  populateEditSelects();
  document.getElementById('edit-kelas').value = entry.kelas;
  document.getElementById('edit-bilik').value = entry.bilik;
  document.getElementById('edit-tujuan').value = entry.tujuan || '';
  document.getElementById('edit-lcd').checked = !!entry.guna_lcd;
  document.getElementById('edit-msg').textContent = '';
  renderEditDateButtons();
  refreshEditSlots();
  refreshEditLcd();
  document.getElementById('edit-overlay').style.display = 'flex';
}
function closeEdit() {
  document.getElementById('edit-overlay').style.display = 'none';
  editEntry = null;
}
document.getElementById('edit-cancel').addEventListener('click', closeEdit);
document.getElementById('edit-overlay').addEventListener('click', (e) => { if (e.target.id === 'edit-overlay') closeEdit(); });
document.getElementById('edit-bilik').addEventListener('change', () => { refreshEditSlots(); refreshEditLcd(); });
document.getElementById('edit-hari-ini').addEventListener('click', () => { editTarikh = DATEINFO.hariIni; renderEditDateButtons(); refreshEditSlots(); });
document.getElementById('edit-esok').addEventListener('click', () => {
  if (document.getElementById('edit-esok').disabled) return;
  editTarikh = DATEINFO.esok; renderEditDateButtons(); refreshEditSlots();
});

document.getElementById('edit-save').addEventListener('click', async () => {
  const msg = document.getElementById('edit-msg');
  msg.textContent = '';
  const kelas = document.getElementById('edit-kelas').value;
  const bilik = document.getElementById('edit-bilik').value;
  const masaMula = document.getElementById('edit-slot').value;
  const tujuan = document.getElementById('edit-tujuan').value.trim();
  const bkObj = findBookable(bilik);
  const gunaLcd = !!(bkObj && bkObj.parent === 'Perpustakaan Darul Hikmah' && document.getElementById('edit-lcd').checked);
  const slotDef = SLOTS.find(s => s.masa_mula === masaMula);
  if (!slotDef) { msg.textContent = 'Sila pilih slot masa yang sah.'; return; }

  const saveBtn = document.getElementById('edit-save');
  saveBtn.disabled = true; saveBtn.textContent = 'Menyimpan...';

  const { error } = await sb.from('tempahan').update({
    bilik, tarikh: editTarikh, masa_mula: masaMula, masa_tamat: slotDef.masa_tamat,
    label: slotDef.label, kumpulan: slotDef.kumpulan, kelas, tujuan, guna_lcd: gunaLcd, status: 'aktif'
  }).eq('id', editEntry.id);

  saveBtn.disabled = false; saveBtn.textContent = 'Simpan Perubahan';
  if (error) {
    if (error.code === '23505') {
      msg.textContent = 'Slot ini baru sahaja ditempah oleh orang lain. Sila pilih slot lain.';
      await refreshEditSlots();
    } else {
      msg.textContent = 'Gagal menyimpan perubahan. Sila cuba lagi.';
    }
    return;
  }
  closeEdit();
  await loadAll();
});

(async function init() {
  const { user, admin } = await refreshAuthBox();
  currentUser = user; currentAdmin = admin;
  document.getElementById('filter-mine-wrap').style.display = user ? 'flex' : 'none';
  await loadAll();
})();
