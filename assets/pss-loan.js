(function () {
  var form = document.getElementById('loan-form');
  var status = document.getElementById('loan-status');
  var receipt = document.getElementById('loan-receipt');
  if (!form || !window.cms) return;

  var pinjam = form.elements.tarikh_pinjam;
  var pulang = form.elements.tarikh_pulang;
  var today = new Date().toISOString().slice(0, 10);
  pinjam.value = today;
  pinjam.min = today;
  pulang.min = today;
  pinjam.addEventListener('change', function () { pulang.min = pinjam.value; if (pulang.value < pinjam.value) pulang.value = pinjam.value; });

  function reference() { return 'PSS-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + Math.random().toString(36).slice(2, 7).toUpperCase(); }
  function formatDate(value) { return new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value + 'T00:00:00')); }
  function renderReceipt(data) {
    document.getElementById('receipt-ref').textContent = 'No. rujukan: ' + data.rujukan;
    document.getElementById('receipt-created').textContent = 'Direkodkan pada ' + formatDate(data.tarikh_pinjam);
    document.getElementById('receipt-borrower').textContent = data.nama;
    document.getElementById('receipt-date').textContent = formatDate(data.tarikh_pinjam);
    var rows = [['Nama', data.nama], ['Kelas', data.kelas], ['Peranan', data.peranan], ['Bahan', data.bahan], ['Kod bahan', data.kod_bahan || '-'], ['Tarikh pinjam', formatDate(data.tarikh_pinjam)], ['Tarikh pulang', formatDate(data.tarikh_pulang)]];
    document.getElementById('receipt-details').replaceChildren.apply(document.getElementById('receipt-details'), rows.flatMap(function (row) { var dt = document.createElement('dt'); dt.textContent = row[0]; var dd = document.createElement('dd'); dd.textContent = row[1]; return [dt, dd]; }));
    receipt.hidden = false;
    receipt.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var data = Object.fromEntries(new FormData(form));
    data.nama = data.nama.trim(); data.kelas = data.kelas.trim(); data.bahan = data.bahan.trim(); data.kod_bahan = data.kod_bahan.trim() || null; data.catatan = data.catatan.trim() || null; data.rujukan = reference();
    if (data.tarikh_pulang < data.tarikh_pinjam) { status.textContent = 'Tarikh pulang perlu pada atau selepas tarikh pinjam.'; status.className = 'loan-status error'; return; }
    var button = form.querySelector('button[type="submit"]'); button.disabled = true; status.textContent = 'Merekodkan permohonan...'; status.className = 'loan-status';
    var response = await window.cms.from('pss_pinjaman').insert(data);
    button.disabled = false;
    if (response.error) { status.textContent = 'Rekod tidak dapat disimpan. Sila cuba lagi.'; status.className = 'loan-status error'; return; }
    status.textContent = 'Rekod pinjaman berjaya disimpan. Borang rekod sedia untuk dicetak atau disimpan sebagai PDF.';
    renderReceipt(data); form.reset(); pinjam.value = today; pulang.min = today;
  });
  document.getElementById('print-receipt').addEventListener('click', function () { window.print(); });
  document.getElementById('new-loan').addEventListener('click', function () { receipt.hidden = true; form.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
}());
