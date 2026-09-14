const state = { user:null, teacher:null, tarikh:null, bilik:null, selected:[], booked:new Map(), dayBooked:[], ready:false };

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

function renderRoomAvailability() {
  const mount = document.getElementById('room-availability');
  if (!mount) return;
  mount.innerHTML = '';
  ROOMS.forEach(room => {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.className = 'room-choice';
    choice.dataset.room = room.id;
    const type = document.createElement('span');
    type.textContent = room.sub ? 'PUSAT SUMBER' : 'RUANG KHAS';
    const name = document.createElement('b');
    name.textContent = room.id;
    const note = document.createElement('small');
    note.textContent = 'Pilih tarikh dahulu';
    choice.append(type, name, note);
    choice.addEventListener('click', () => {
      const bilikSel = document.getElementById('f-bilik');
      bilikSel.value = room.id;
      bilikSel.dispatchEvent(new Event('change', { bubbles: true }));
      bilikSel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    mount.appendChild(choice);
  });
}

function updateRoomAvailability() {
  const selected = document.getElementById('f-bilik').value;
  const selectedBookable = findBookable(selected);
  const selectedRoot = selectedBookable && selectedBookable.parent ? selectedBookable.parent : selected;
  document.querySelectorAll('.room-choice').forEach(choice => {
    const room = ROOMS.find(r => r.id === choice.dataset.room);
    const roomIds = room.sub ? room.sub.map(s => s.id) : [room.id];
    const bookedCount = state.dayBooked.filter(row => roomIds.includes(row.bilik)).length;
    const capacity = SLOTS.length * roomIds.length;
    const remaining = Math.max(0, capacity - bookedCount);
    const note = choice.querySelector('small');
    choice.classList.toggle('active', choice.dataset.room === selectedRoot);
    choice.classList.toggle('full', !!state.tarikh && remaining === 0);
    if (note) note.textContent = state.tarikh ? `${remaining} slot tersedia` : 'Pilih tarikh dahulu';
  });
}

function setTarikh(t) {
  if (!bookingDateAllowed(t, state.admin)) return;
  state.tarikh = t; state.selected = [];
  const adminDate = document.getElementById('f-tarikh-admin');
  if (adminDate && adminDate.value !== t) adminDate.value = t;
  const info = tarikhInfo();
  document.getElementById('btn-hari-ini').classList.toggle('active', t === info.hariIni);
  document.getElementById('btn-esok').classList.toggle('active', t === info.esok);
  refreshRoomView();
}

function slotKey(s) { return s.masa_mula; }

let availabilityRequest = 0;

function renderSlots() {
  const pagi = document.getElementById('grid-pagi');
  const blok = document.getElementById('grid-blok');
  pagi.innerHTML = ''; blok.innerHTML = '';
  SLOTS.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const booked = state.booked.get(s.masa_mula);
    const chosen = state.selected.includes(s.masa_mula);
    btn.setAttribute('aria-pressed', String(chosen));
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
  document.getElementById('btn-hantar').disabled = !!state.sending || !(state.teacher && state.ready && navigator.onLine && bookingDateAllowed(state.tarikh, state.admin) && n > 0 && state.bilik);
}

async function refreshRoomView() {
  const request = ++availabilityRequest;
  const bilik = state.bilik;
  const tarikh = state.tarikh;
  state.ready = false;
  updateFooter();
  const empty = document.getElementById('no-room');
  const slots = document.getElementById('room-slots');
  slots.style.display = 'none';
  empty.style.display = 'block';
  empty.textContent = 'Sedang menyemak kekosongan...';
  document.querySelectorAll('.room-choice small').forEach(note => { note.textContent = 'Sedang menyemak...'; });
  document.getElementById('lcd-wrap').style.display = 'none';
  try {
    if (!navigator.onLine) throw new Error('offline');
    const day = await sbPublic.from('tempahan_awam').select('bilik,status')
      .eq('tarikh', tarikh).neq('status', 'dibatalkan');
    if (request !== availabilityRequest) return;
    if (day.error || !day.data) throw new Error('unavailable');
    state.dayBooked = day.data;
    updateRoomAvailability();
    if (!bilik) {
      empty.textContent = 'Sila pilih bilik atau ruang dahulu.';
      return;
    }
    const bookings = await sbPublic.from('tempahan_awam').select('bilik,tarikh,masa_mula,status')
      .eq('bilik', bilik).eq('tarikh', tarikh).neq('status', 'dibatalkan');
    if (request !== availabilityRequest) return;
    if (bookings.error || !bookings.data) throw new Error('unavailable');
    state.booked = new Map(bookings.data.map(row => [row.masa_mula, row]));
    state.selected = state.selected.filter(slot => !state.booked.has(slot));
    if (state.pendingSlot) {
      if (SLOTS.some(slot => slot.masa_mula === state.pendingSlot) && !state.booked.has(state.pendingSlot)) state.selected = [state.pendingSlot];
      state.pendingSlot = null;
    }
    const room = findBookable(bilik);
    document.getElementById('room-name').textContent = (room.parent ? room.parent + ' — ' : '') + room.id;
    document.getElementById('room-desc').textContent = room.desc;
    const isPSS = room.parent === 'Perpustakaan Darul Hikmah';
    document.getElementById('lcd-wrap').style.display = isPSS ? 'flex' : 'none';
    if (!isPSS) document.getElementById('f-lcd').checked = false;
    document.getElementById('notice-bilik').textContent = 'Tempahan bagi ' + formatMalayDate(tarikh);
    state.ready = true;
    empty.style.display = 'none';
    slots.style.display = 'block';
    renderSlots();
  } catch {
    if (request !== availabilityRequest) return;
    state.selected = [];
    empty.textContent = 'Kekosongan tidak dapat disemak. Semak sambungan internet, kemudian pilih semula bilik atau tarikh.';
    document.querySelectorAll('.room-choice').forEach(choice => {
      choice.classList.remove('full');
      choice.querySelector('small').textContent = 'Belum dapat disemak';
    });
  }
  updateFooter();
}

window.addEventListener('offline', () => {
  availabilityRequest++;
  state.ready = false;
  state.selected = [];
  document.getElementById('room-slots').style.display = 'none';
  const empty = document.getElementById('no-room');
  empty.style.display = 'block';
  empty.textContent = 'Tiada sambungan internet. Sambung semula untuk menyemak kekosongan.';
  document.querySelectorAll('.room-choice small').forEach(note => { note.textContent = 'Belum dapat disemak'; });
  updateFooter();
});
window.addEventListener('online', () => { if (state.tarikh) refreshRoomView(); });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.tarikh) refreshRoomView();
});

async function hantar() {
  if (state.sending || !state.ready || !navigator.onLine) return;
  if (!bookingDateAllowed(state.tarikh, state.admin)) {
    showToast('Tempahan belum dibuka', 'Setiap tarikh dibuka pukul 3:00 petang sehari sebelumnya (waktu Malaysia).', 'warning');
    syncBookingDates();
    return;
  }
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
    user_id: state.user ? state.user.id : null,
    masa_mula: s.masa_mula, masa_tamat: s.masa_tamat, label: s.block ? `${s.kumpulan} (${s.label})` : s.label,
    kumpulan: s.kumpulan, nama_pemohon: nama, kelas, tujuan,
    guna_lcd: document.getElementById('f-lcd').checked, status: 'aktif'
  }));
  state.sending = true;
  let error;
  try { ({ error } = await sb.from('tempahan').insert(rows)); }
  catch { error = { message: 'Sambungan terputus. Semak Tempahan saya sebelum mencuba semula.' }; }
  finally { state.sending = false; }
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
  window.dispatchEvent(new Event('booking-saved'));
  await refreshRoomView();
  updateFooter();
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
  renderRoomAvailability();
  const info = tarikhInfo();
  document.getElementById('lbl-hari-ini').textContent = formatMalayDateShort(info.hariIni);
  document.getElementById('lbl-esok').textContent = formatMalayDateShort(info.esok);
  const btnEsok = document.getElementById('btn-esok');
  if (!info.bukaEsok) { btnEsok.disabled = true; document.getElementById('hint-esok').style.display = 'block'; }
  document.getElementById('btn-hari-ini').addEventListener('click', () => setTarikh(tarikhInfo().hariIni));
  btnEsok.addEventListener('click', () => setTarikh(tarikhInfo().esok));

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
    updateRoomAvailability();
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
  window.dispatchEvent(new Event('booking-ready'));
  wireRealtime();
})();

function syncBookingDates() {
  const info = tarikhInfo();
  document.getElementById('lbl-hari-ini').textContent = formatMalayDateShort(info.hariIni);
  document.getElementById('lbl-esok').textContent = formatMalayDateShort(info.esok);
  document.getElementById('btn-esok').disabled = !state.admin && !info.bukaEsok;
  document.getElementById('btn-hari-ini').classList.toggle('active', state.tarikh === info.hariIni);
  document.getElementById('btn-esok').classList.toggle('active', state.tarikh === info.esok);
  document.getElementById('hint-esok').style.display = state.admin ? 'none' : 'block';
  if (state.tarikh && !bookingDateAllowed(state.tarikh, state.admin)) setTarikh(info.hariIni);
  updateFooter();
}
setInterval(syncBookingDates, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncBookingDates(); });
