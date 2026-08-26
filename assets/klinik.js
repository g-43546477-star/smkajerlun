(function () {
  const state = { ic: '', murid: null, rekod: [] };
  const $ = (selector) => document.querySelector(selector);

  function normalizeIc(value) { return String(value || '').replace(/\D/g, ''); }
  function formatIc(value) { return value.replace(/^(\d{6})(\d{2})(\d{4})$/, '$1-$2-$3'); }
  function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  function malayDate(value) { return new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)); }
  function initials(name) { return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
  function setStatus(message, type) { const el = $('#clinic-status'); if (!el) return; el.textContent = message || ''; el.className = `clinic-status${type ? ` ${type}` : ''}`; }
  function rpcRow(data) { return Array.isArray(data) ? (data[0] || null) : (data && typeof data === 'object' ? data : null); }
  function records(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch (error) { return []; }
    }
    return [];
  }

  function render() {
    const found = Boolean(state.murid);
    $('#clinic-result').hidden = !found;
    if (!found) return;
    $('#clinic-avatar').textContent = initials(state.murid.nama);
    $('#clinic-name').textContent = state.murid.nama;
    $('#clinic-class').textContent = state.murid.kelas;
    $('#clinic-ic-display').textContent = `IC ${formatIc(state.ic)}`;
    fillPrint('.print-nama', state.murid.nama);
    fillPrint('.print-kelas', state.murid.kelas);
    fillPrint('.print-ic', formatIc(state.ic));
    fillPrint('.print-tarikh', malayDate(today()));
    const history = $('#clinic-history');
    history.replaceChildren();
    if (!state.rekod.length) {
      const empty = document.createElement('div'); empty.className = 'clinic-empty'; empty.textContent = 'Belum ada rekod lawatan ke klinik.'; history.appendChild(empty);
    } else {
      state.rekod.forEach((entry) => {
        const item = document.createElement('article'); item.className = 'clinic-history-item';
        const date = document.createElement('div'); date.className = 'clinic-history-date'; date.textContent = new Intl.DateTimeFormat('ms-MY', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${entry.tarikh}T00:00:00Z`));
        const detail = document.createElement('div'); const reason = document.createElement('b'); reason.textContent = entry.sebab; const time = document.createElement('small'); time.textContent = `${malayDate(entry.tarikh)} · ${entry.masa || '-'}`; detail.append(reason, time); item.append(date, detail); history.appendChild(item);
      });
    }
    const printRows = $('#print-rekod'); printRows.replaceChildren();
    state.rekod.forEach((entry, index) => {
      const row = document.createElement('tr');
      [index + 1, malayDate(entry.tarikh), entry.masa || '-', entry.sebab].forEach((value) => { const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell); });
      printRows.appendChild(row);
    });
  }

  function fillPrint(selector, value) {
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value;
    });
  }

  async function cari() {
    const ic = normalizeIc($('#clinic-ic').value);
    $('#clinic-ic').value = ic;
    state.ic = ''; state.murid = null; state.rekod = []; render();
    if (ic.length !== 12) { setStatus('Masukkan nombor IC 12 digit.', 'error'); return; }
    setStatus('Mencari rekod murid...');
    const { data, error } = await sb.rpc('klinik_cari', { p_ic: ic });
    const row = rpcRow(data);
    if (error) { setStatus('Sistem rekod tidak dapat diakses. Sila cuba semula.', 'error'); return; }
    if (!row) { setStatus('Rekod murid tidak ditemui. Sila semak nombor IC.', 'error'); return; }
    state.ic = ic; state.murid = row; state.rekod = records(row.rekod); render(); setStatus(`Rekod ${row.nama} berjaya ditemui.`);
  }

  function printRecord() { if (!state.murid) return; window.print(); }

  async function daftarDanCetak() {
    const sebab = $('#clinic-sebab').value.trim();
    if (sebab.length < 2) { setStatus('Sila masukkan sebab ke klinik.', 'error'); $('#clinic-sebab').focus(); return; }
    const button = $('#clinic-daftar'); button.disabled = true; button.textContent = 'Menyimpan...';
    const { data, error } = await sb.rpc('klinik_daftar', { p_ic: state.ic, p_sebab: sebab });
    const row = rpcRow(data);
    button.disabled = false; button.textContent = 'Simpan & Cetak Borang Klinik';
    if (error || !row) { setStatus('Lawatan tidak dapat disimpan. Sila cuba semula.', 'error'); return; }
    state.murid = row; state.rekod = records(row.rekod); $('#clinic-sebab').value = ''; render(); setStatus('Lawatan hari ini direkodkan. Borang sedia untuk dicetak.'); window.requestAnimationFrame(() => window.print());
  }

  async function initKiosk() {
    if (typeof refreshAuthBox !== 'function') { setStatus('Sistem kiosk tidak dapat dimulakan. Sila muat semula halaman.', 'error'); return; }
    const { user, admin } = await refreshAuthBox();
    const access = $('#clinic-access');
    const stateLabel = $('#clinic-kiosk-state');
    const accessEyebrow = $('#clinic-access-eyebrow');
    const accessTitle = $('#clinic-access-title');
    const accessDescription = $('#clinic-access-description');
    const accessAction = $('#clinic-access-action');
    if (!admin) {
      if (access) access.hidden = false;
      if (access) access.classList.remove('is-active');
      if ($('#clinic-ic')) $('#clinic-ic').disabled = true;
      if ($('#clinic-search button')) $('#clinic-search button').disabled = true;
      if (stateLabel) stateLabel.textContent = 'Kiosk dikunci';
      setStatus('Kiosk klinik perlu dilog masuk oleh pentadbir.', 'error');
      return;
    }
    if (access) {
      access.hidden = false;
      access.classList.add('is-active');
    }
    if (accessEyebrow) accessEyebrow.textContent = 'AKSES DISAHKAN';
    if (accessTitle) accessTitle.textContent = 'Kiosk aktif dan sedia digunakan';
    if (accessDescription) accessDescription.textContent = 'Akaun pentadbir aktif. Murid boleh mencari rekod, mendaftarkan lawatan dan mencetak borang klinik.';
    if (accessAction) accessAction.hidden = true;
    if (stateLabel) stateLabel.textContent = `Kiosk aktif: ${displayName(user)}`;
    $('#clinic-search').addEventListener('submit', (event) => { event.preventDefault(); cari(); });
    $('#clinic-ic').addEventListener('input', (event) => { event.target.value = normalizeIc(event.target.value); });
    $('#clinic-daftar').addEventListener('click', daftarDanCetak);
    $('#clinic-print').addEventListener('click', printRecord);
  }

  initKiosk();
}());
