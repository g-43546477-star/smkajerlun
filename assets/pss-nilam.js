(function () {
  var table = document.getElementById('nilam-leaderboard');
  var tbody = document.getElementById('nilam-leaderboard-body');
  var status = document.getElementById('nilam-leaderboard-status');
  var updated = document.getElementById('nilam-leaderboard-updated');
  var podium = document.getElementById('nilam-podium');
  if (!table || !tbody || !window.cms) return;

  var months = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

  function formatDate(value) {
    var parts = String(value || '').split('-');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return '';
    return parseInt(parts[2], 10) + ' ' + (months[parseInt(parts[1], 10) - 1] || '') + ' ' + parts[0];
  }

  function cell(tag, value, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value == null ? '' : String(value);
    return node;
  }

  function podiumCard(row, index) {
    var rank = Number(row.kedudukan) || index + 1;
    var card = document.createElement('article');
    card.className = 'nilam-podium-card';
    card.dataset.rank = String(rank);
    var label = document.createElement('span');
    label.className = 'nilam-podium-rank';
    label.textContent = 'Kedudukan ' + rank;
    var name = document.createElement('b');
    name.textContent = row.nama || 'Nama murid belum dinyatakan';
    var detail = document.createElement('small');
    detail.textContent = [row.tingkatan, row.kelas].filter(Boolean).join(' · ') || 'Maklumat kelas belum dinyatakan';
    var count = document.createElement('strong');
    count.textContent = (Number(row.jumlah_bacaan) || 0) + ' bahan';
    card.append(label, name, detail, count);
    return card;
  }

  async function load() {
    status.textContent = 'Memuatkan carta pendahulu...';
    tbody.replaceChildren();
    if (podium) podium.replaceChildren();
    var response = await window.cms.from('nilam_stat')
      .select('kedudukan,nama,tingkatan,kelas,jumlah_bacaan,dikemas_kini')
      .order('kedudukan', { ascending: true }).order('jumlah_bacaan', { ascending: false }).limit(50);
    var rows = response.data || [];
    if (response.error || !rows.length) {
      status.textContent = 'Carta NILAM belum dikemas kini oleh PSS.';
      if (updated) updated.textContent = '';
      return;
    }
    if (podium) podium.replaceChildren.apply(podium, rows.slice(0, 3).map(podiumCard));
    rows.forEach(function (row, index) {
      var rank = Number(row.kedudukan) || index + 1;
      var tr = document.createElement('tr');
      tr.dataset.rank = String(rank);
      tr.appendChild(cell('td', rank, 'nilam-rank-number'));
      tr.appendChild(cell('th', row.nama || 'Nama murid belum dinyatakan', 'nilam-student-name'));
      tr.appendChild(cell('td', row.tingkatan || '-', 'nilam-form'));
      tr.appendChild(cell('td', row.kelas || '-', 'nilam-class'));
      tr.appendChild(cell('td', (Number(row.jumlah_bacaan) || 0) + ' bahan', 'nilam-count'));
      tbody.appendChild(tr);
    });
    status.textContent = rows.length + ' murid dalam carta pendahulu.';
    var latest = formatDate(rows[0].dikemas_kini);
    if (updated) updated.textContent = latest ? 'Dikemas kini: ' + latest : 'Tarikh kemas kini belum dinyatakan.';
  }

  load().catch(function () {
    tbody.replaceChildren();
    status.textContent = 'Carta NILAM tidak dapat dimuatkan buat masa ini.';
  });
}());
