(function () {
  var form = document.getElementById('suggestion-form');
  var status = document.getElementById('suggestion-status');
  if (!form || !status || !window.cms) return;

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var data = Object.fromEntries(new FormData(form));
    data.nama = data.nama.trim();
    data.kelas = data.kelas.trim();
    data.tajuk = data.tajuk.trim();
    data.pengarang = data.pengarang.trim() || null;
    data.sebab = data.sebab.trim() || null;
    data.status = 'Baru';
    data.sumber = 'Pelajar';
    if (data.nama.length < 3 || data.kelas.length < 2 || data.tajuk.length < 2) {
      status.textContent = 'Sila lengkapkan nama, kelas dan judul bahan.';
      status.className = 'loan-status error';
      return;
    }
    var button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.textContent = 'Menghantar cadangan...';
    status.className = 'loan-status';
    var response = await window.cms.from('cadangan_buku').insert(data);
    button.disabled = false;
    if (response.error) {
      status.textContent = 'Cadangan tidak dapat dihantar. Sila cuba lagi.';
      status.className = 'loan-status error';
      return;
    }
    form.reset();
    status.textContent = 'Terima kasih. Cadangan anda telah dihantar untuk semakan PSS.';
    status.className = 'loan-status';
  });
}());
