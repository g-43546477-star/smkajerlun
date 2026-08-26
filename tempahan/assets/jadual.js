function buildHeadRow() {
  const tr = document.getElementById('thead-row');
  BOOKABLE.forEach(r => { const th = document.createElement('th'); th.textContent = r.id; tr.appendChild(th); });
}

function cellFor(entries, roomId, masaMula) {
  const td = document.createElement('td');
  const found = entries.find(e => e.bilik === roomId && e.masa_mula === masaMula && e.status !== 'dibatalkan');
  if (found) {
    td.innerHTML = `<div class="slotcell-booked"><div class="n"></div><div class="k"></div></div>`;
    td.querySelector('.n').textContent = found.nama_pemohon;
    td.querySelector('.k').textContent = found.kelas + (found.guna_lcd ? ' · LCD' : '');
  } else {
    const span = document.createElement('span');
    span.className = 'slotcell-empty';
    span.textContent = 'Kosong';
    td.appendChild(span);
  }
  return td;
}

async function renderTable() {
  const tarikh = document.getElementById('f-tarikh').value;
  const { data, error } = await sbPublic.from('tempahan_awam').select('*').eq('tarikh', tarikh).limit(300);
  const entries = error ? [] : (data || []);

  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';

  let lastGroup = null;
  SLOTS.forEach(slot => {
    const groupLabel = slot.block ? 'Sesi Petang & Malam (Blok Masa)' : 'Sesi Pagi & Tengah Hari (30 Minit)';
    if (groupLabel !== lastGroup) {
      const sep = document.createElement('tr');
      sep.className = 'groupsep';
      const td = document.createElement('td');
      td.colSpan = BOOKABLE.length + 1;
      td.textContent = groupLabel;
      sep.appendChild(td);
      tbody.appendChild(sep);
      lastGroup = groupLabel;
    }
    const tr = document.createElement('tr');
    const tdTime = document.createElement('td');
    tdTime.textContent = slot.block ? `${slot.kumpulan} (${slot.label})` : slot.label;
    tr.appendChild(tdTime);
    BOOKABLE.forEach(r => tr.appendChild(cellFor(entries, r.id, slot.masa_mula)));
    tbody.appendChild(tr);
  });
}

sbPublic.channel('jadual-live')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tempahan' }, payload => {
    const row = (payload.new && payload.new.tarikh) ? payload.new : payload.old;
    if (row && row.tarikh === document.getElementById('f-tarikh').value) renderTable();
  })
  .subscribe();

(async function init() {
  buildHeadRow();
  document.getElementById('f-tarikh').value = tarikhInfo().hariIni;
  document.getElementById('f-tarikh').addEventListener('change', renderTable);
  await refreshAuthBox();
  await renderTable();
})();
