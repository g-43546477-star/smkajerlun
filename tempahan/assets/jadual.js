function visibleRooms() {
  const chosen = document.getElementById('f-room').value;
  return chosen ? BOOKABLE.filter(room => room.id === chosen) : BOOKABLE;
}
function buildHeadRow() {
  const tr = document.getElementById('thead-row');
  tr.replaceChildren();
  const time = document.createElement('th'); time.textContent = 'Masa / Slot'; tr.append(time);
  visibleRooms().forEach(r => { const th = document.createElement('th'); th.textContent = r.id; tr.appendChild(th); });
  document.querySelector('.jadual-table').style.minWidth = visibleRooms().length === 1 ? '0' : '1400px';
}
let tableRequest = 0;
let scheduleAdmin = false;

function cellFor(entries, roomId, masaMula) {
  const td = document.createElement('td');
  const found = entries.find(e => e.bilik === roomId && e.masa_mula === masaMula && e.status !== 'dibatalkan');
  if (found) {
    td.innerHTML = `<div class="slotcell-booked"><div class="n"></div><div class="k"></div></div>`;
    td.querySelector('.n').textContent = 'Ditempah';
    td.querySelector('.k').textContent = 'Tidak tersedia';
  } else {
    const date = document.getElementById('f-tarikh').value;
    const open = bookingDateAllowed(date, scheduleAdmin);
    const span = document.createElement(open ? 'a' : 'span');
    span.className = 'slotcell-empty';
    span.textContent = open ? 'Tempah →' : 'Kosong';
    if (open) span.href = '/tempahan/?' + new URLSearchParams({room:roomId,date,slot:masaMula});
    td.appendChild(span);
  }
  return td;
}

async function renderTable() {
  const request = ++tableRequest;
  buildHeadRow();
  const tbody = document.getElementById('tbody');
  tbody.replaceChildren();
  const status = document.getElementById('jadual-status');
  status.textContent = 'Sedang menyemak jadual...';
  const tarikh = document.getElementById('f-tarikh').value;
  const { data, error } = await sbPublic.from('tempahan_awam')
    .select('bilik,tarikh,masa_mula,status')
    .eq('tarikh', tarikh)
    .limit(300);
  if (request !== tableRequest) return;
  if (error || !data || !navigator.onLine) {
    status.textContent = 'Jadual tidak dapat dimuatkan. Semak sambungan internet dan pilih semula tarikh.';
    return;
  }
  status.textContent = '';
  const entries = data;
  status.textContent = bookingDateAllowed(tarikh, scheduleAdmin) ? 'Pilih slot kosong untuk mula menempah.' : 'Paparan jadual sahaja. Tempahan dibuka 3 petang sehari sebelumnya.';

  let lastGroup = null;
  SLOTS.forEach(slot => {
    const groupLabel = slot.block ? 'Sesi Petang & Malam (Blok Masa)' : 'Sesi Pagi & Tengah Hari (30 Minit)';
    if (groupLabel !== lastGroup) {
      const sep = document.createElement('tr');
      sep.className = 'groupsep';
      const td = document.createElement('td');
      td.colSpan = visibleRooms().length + 1;
      td.textContent = groupLabel;
      sep.appendChild(td);
      tbody.appendChild(sep);
      lastGroup = groupLabel;
    }
    const tr = document.createElement('tr');
    const tdTime = document.createElement('td');
    tdTime.textContent = slot.block ? `${slot.kumpulan} (${slot.label})` : slot.label;
    tr.appendChild(tdTime);
    visibleRooms().forEach(r => tr.appendChild(cellFor(entries, r.id, slot.masa_mula)));
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
  const filter = document.getElementById('f-room');
  BOOKABLE.forEach(room => { const option = document.createElement('option'); option.value = room.id; option.textContent = room.id; filter.append(option); });
  if (window.matchMedia('(max-width:700px)').matches) filter.value = BOOKABLE[0].id;
  filter.addEventListener('change', renderTable);
  document.getElementById('f-tarikh').value = tarikhInfo().hariIni;
  document.getElementById('f-tarikh').addEventListener('change', renderTable);
  const auth = await refreshAuthBox(); scheduleAdmin = auth.admin;
  const shortcuts = document.createElement('div'); shortcuts.className = 'schedule-tools';
  [['Hari ini','hariIni'],['Esok','esok']].forEach(([label,key]) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.onclick = () => { document.getElementById('f-tarikh').value = tarikhInfo()[key]; renderTable(); }; shortcuts.append(button);
  });
  const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Muat semula'; retry.onclick = renderTable; shortcuts.append(retry);
  document.querySelector('.room-filter').before(shortcuts);
  await renderTable();
})();

window.addEventListener('offline', () => {
  tableRequest++;
  document.getElementById('tbody').replaceChildren();
  document.getElementById('jadual-status').textContent = 'Tiada sambungan internet. Sambung semula untuk menyemak jadual.';
});
window.addEventListener('online', renderTable);
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderTable(); });
