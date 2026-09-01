const state = { user:null, teacher:null, tarikh:null, bilik:null, selected:[], booked:new Map() };

function populateStatic() {
  const kelasSel = document.getElementById('f-kelas');
  CLASS_OPTIONS.forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = k; kelasSel.appendChild(o); });
  kelasSel.value = 'Program Sekolah / Guru';

  const bilikSel = document.getElementById('f-bilik');
  const ph = document.createElement('option'); ph.value=''; ph.textContent='— Pilih bilik —'; bilikSel.appendChild(ph);
  ROOMS.forEach(r => { const o = document.createElement('option'); o.value = r.id; o.textContent = r.id; bilikSel.appendChild(o); });

  const subSel = document.getElementById('f-sub');
  const perpus = ROOMS.find(r => r.sub);
  perpus.sub.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.id; subSel.appendChild(o); });
}

function setTarikh(t) {
  state.tarikh = t; state.selected = [];
  const adminDate = document.getElementById('f-tarikh-admin');
  if (adminDate && adminDate.value !== t) adminDate.value = t;
  const info = tarikhInfo();
  document.getElementById('btn-hari-ini').classList.toggle('active', t === info.hariIni);
  document.getElementById('btn-esok').classList.toggle('active', t === info.esok);
  refreshRoomView();
}

function slotKey(s) { return s.masa_mula; }

async function loadBookings() {
  state.booked = new Map();
  if (!state.bilik || !state.tarikh) return;
  const { data, error } = await sbPublic.from('tempahan_awam').select('bilik,tarikh,masa_mula,status')
    .eq('bilik', state.bilik).eq('tarikh', state.tarikh).neq('status','dibatalkan');
  if (!error && data) data.forEach(r => state.booked.set(r.masa_mula, r));
}

function renderSlots() {
  const pagi = document.getElementById('grid-pagi');
  const blok = document.getElementById('grid-blok');
  pagi.innerHTML = ''; blok.innerHTML = '';
  SLOTS.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const booked = state.booked.get(s.masa_mula);
    const chosen = state.selected.includes(s.masa_mula);
    btn.className = 'slotbtn ' + (booked ? 'ditempah' : chosen ? 'dipilih' : 'kosong');
    const t = document.createElement('div'); t.className='t';
    const lbl = document.createElement('span'); lbl.textContent = s.block ? s.kumpulan : s.label;
    t.appendChild(lbl);
    if (s.block) { const sub = document.createElement('span'); sub.style.fontWeight='600'; sub.style.fontSize='10px'; sub.textContent = s.label; t.appendChild(sub); }
    btn.appendChild(t);
    if (booked) {
      const occ = document.createElement('div'); occ.className='occ';
      occ.textContent = 'Ditempah';
      btn.appendChild(occ);
      btn.disabled = true;
    }
    if (!booked) btn.addEventListener('click', () => {
      const i = state.selected.indexOf(s.masa_mula);
      if (i >= 0) state.selected.splice(i, 1); else state.selected.push(s.masa_mula);
      renderSlots(); updateFooter();
    });
    (s.block ? blok : pagi).appendChild(btn);
  });
}

function updateFooter() {
  const n = state.selected.length;
  document.getElementById('count-slot').textContent = n;
  const summ = document.getElementById('summary-slot');
  if (!n) summ.textContent = 'Tiada slot dipilih';
  else {
    const labels = SLOTS.filter(s => state.selected.includes(s.masa_mula)).map(s => s.block ? s.kumpulan : s.label);
    summ.textContent = labels.join(', ');
  }
  document.getElementById('btn-hantar').disabled = !(state.teacher && n > 0 && state.bilik);
}

async function refreshRoomView() {
  if (!state.bilik) {
    document.getElementById('no-room').style.display = 'block';
    document.getElementById('room-slots').style.display = 'none';
    document.getElementById('notice-bilik').textContent = '';
    document.getElementById('lcd-wrap').style.display = 'none';
    document.getElementById('f-lcd').checked = false;
    updateFooter();
    return;
  }
  document.getElementById('no-room').style.display = 'none';
  document.getElementById('room-slots').style.display = 'block';
  const room = findBookable(state.bilik);
  document.getElementById('room-name').textContent = (room.parent ? room.parent + ' — ' : '') + room.id;
  document.getElementById('room-desc').textContent = room.desc;
  const isPSS = room.parent === 'Perpustakaan Darul Hikmah';
  document.getElementById('lcd-wrap').style.display = isPSS ? 'flex' : 'none';
  if (!isPSS) document.getElementById('f-lcd').checked = false;
  document.getElementById('notice-bilik').textContent = 'Tempahan bagi ' + formatMalayDate(state.tarikh);
  await loadBookings();
  renderSlots();
  updateFooter();
}

async function hantar() {
  const kelas = document.getElementById('f-kelas').value;
  const tujuan = document.getElementById('f-tujuan').value.trim();
  if (!tujuan) { showToast('Tidak lengkap', 'Sila isi tujuan/aktiviti.', 'warning'); return; }
  if (!state.selected.length) return;
  const btn = document.getElementById('btn-hantar');
  btn.disabled = true; btn.textContent = 'Menghantar...';
  if (!state.teacher) {
    showToast('Akaun belum diluluskan', 'Sila hubungi pentadbir sekolah untuk mengaktifkan akaun guru.', 'error');
    btn.disabled = false; btn.textContent = 'Hantar Tempahan';
    return;
  }
  const nama = state.teacher.nama;
  const rows = SLOTS.filter(s => state.selected.includes(s.masa_mula)).map(s => ({
    bilik: state.bilik, tarikh: state.tarikh,
    masa_mula: s.masa_mula, masa_tamat: s.masa_tamat, label: s.block ? `${s.kumpulan} (${s.label})` : s.label,
    kumpulan: s.kumpulan, nama_pemohon: nama, kelas, tujuan,
    guna_lcd: document.getElementById('f-lcd').checked, status: 'aktif'
  }));
  const { error } = await sb.from('tempahan').insert(rows);
  btn.textContent = 'Hantar Tempahan';
  if (error) {
    if (error.code === '23505') {
      showToast('Slot telah diambil', 'Guru lain baru sahaja menempah slot yang sama. Sila pilih slot lain.', 'error');
    } else {
      showToast('Ralat', 'Tempahan gagal: ' + error.message, 'error');
    }
    await refreshRoomView();
    return;
  }
  showToast('Berjaya', `Tempahan ${rows.length} slot bagi ${state.bilik} telah disahkan.`, 'success');
  state.selected = [];
  document.getElementById('f-tujuan').value = '';
  await refreshRoomView();
  btn.disabled = false;
}

function wireRealtime() {
  sbPublic.channel('tempahan-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tempahan' }, payload => {
      const row = payload.new && payload.new.bilik ? payload.new : payload.old;
      if (row && row.bilik === state.bilik && row.tarikh === state.tarikh) refreshRoomView();
    })
    .subscribe();
}

(async function init() {
  populateStatic();
  const info = tarikhInfo();
  document.getElementById('lbl-hari-ini').textContent = formatMalayDateShort(info.hariIni);
  document.getElementById('lbl-esok').textContent = formatMalayDateShort(info.esok);
  const btnEsok = document.getElementById('btn-esok');
  if (!info.bukaEsok) { btnEsok.disabled = true; document.getElementById('hint-esok').style.display = 'block'; }
  document.getElementById('btn-hari-ini').addEventListener('click', () => setTarikh(info.hariIni));
  btnEsok.addEventListener('click', () => setTarikh(info.esok));

  const bilikSel = document.getElementById('f-bilik');
  const subWrap = document.getElementById('sub-wrap');
  const subSel = document.getElementById('f-sub');
  bilikSel.addEventListener('change', () => {
    const chosen = ROOMS.find(r => r.id === bilikSel.value);
    if (chosen && chosen.sub) {
      subWrap.style.display = 'block';
      state.bilik = subSel.value || chosen.sub[0].id;
      subSel.value = state.bilik;
    } else {
      subWrap.style.display = 'none';
      state.bilik = bilikSel.value || null;
    }
    state.selected = [];
    refreshRoomView();
  });
  subSel.addEventListener('change', () => { state.bilik = subSel.value; state.selected = []; refreshRoomView(); });

  document.getElementById('btn-hantar').addEventListener('click', hantar);

  const { user, admin, teacher } = await refreshAuthBox();
  state.user = user;
  state.admin = admin;
  state.teacher = teacher;
  if (admin) {
    const adminDateWrap = document.getElementById('admin-date-wrap');
    const adminDate = document.getElementById('f-tarikh-admin');
    adminDateWrap.style.display = 'block';
    adminDate.value = info.hariIni;
    adminDate.addEventListener('change', () => { if (adminDate.value) setTarikh(adminDate.value); });
    btnEsok.disabled = false;
    document.getElementById('hint-esok').style.display = 'none';
  }
  if (teacher) {
    document.getElementById('f-nama').value = teacher.nama;
  } else if (user) {
    document.getElementById('authgate').style.display = 'flex';
    document.getElementById('authgate').querySelector('span').textContent = 'Akaun anda belum diluluskan. Sila hubungi pentadbir sekolah.';
  } else {
    document.getElementById('authgate').style.display = 'flex';
  }

  setTarikh(info.hariIni);
  wireRealtime();
})();
