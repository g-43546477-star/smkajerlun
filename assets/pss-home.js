(function () {
  if (!window.cms) return;
  var bookMount = document.getElementById('weekly-book-list');
  var nilamMount = document.getElementById('home-nilam-list');
  var bookFeature = document.getElementById('weekly-book-feature');
  var activityFeature = document.getElementById('weekly-activity-feature');
  var nilamFeature = document.getElementById('weekly-nilam-feature');
  var esc = window.cmsEsc || function (value) { return String(value || ''); };

  function isoWeekNumber() {
    var date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    var firstThursday = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  }

  async function loadWeeklyBooks() {
    if (!bookMount) return;
    bookMount.innerHTML = '<p class="pss-widget-empty">Memuatkan cadangan buku...</p>';
    var response = await window.cms.from('cadangan_buku').select('tajuk,pengarang,kategori,susunan').eq('sumber', 'PSS').eq('status', 'Pilihan Mingguan').order('susunan');
    var books = response.data || [];
    if (response.error || !books.length) {
      bookMount.innerHTML = '<p class="pss-widget-empty">Cadangan buku belum tersedia.</p>';
      if (bookFeature) bookFeature.innerHTML = '<span>BUKU PILIHAN</span><strong>Cadangan buku akan dikemas kini oleh PSS.</strong><small>Rak Buku Maya &rarr;</small>';
      return;
    }
    var start = ((isoWeekNumber() - 1) * 6) % books.length;
    var picks = books.slice(start, start + 6);
    if (picks.length < 6) picks = picks.concat(books.slice(0, 6 - picks.length));
    bookMount.innerHTML = picks.map(function (book, index) {
      return '<article class="pss-book-pick"><span>' + String(index + 1).padStart(2, '0') + '</span><div><b>' + esc(book.tajuk) + '</b><small>' + esc(book.pengarang || 'Pengarang belum dinyatakan') + '</small></div></article>';
    }).join('');
    if (bookFeature) {
      var feature = picks[0];
      bookFeature.innerHTML = '<span>BUKU PILIHAN</span><strong>' + esc(feature.tajuk) + '</strong><small>' + esc(feature.pengarang || 'Pilihan PSS') + ' · Rak Buku Maya &rarr;</small>';
    }
  }

  async function loadNilamWidget() {
    if (!nilamMount) return;
    nilamMount.innerHTML = '<p class="pss-widget-empty">Memuatkan carta NILAM...</p>';
    var response = await window.cms.from('nilam_stat')
      .select('kedudukan,nama,tingkatan,kelas,jumlah_bacaan,dikemas_kini')
      .order('kedudukan', { ascending: true }).order('jumlah_bacaan', { ascending: false }).limit(5);
    var rows = response.data || [];
    if (response.error || !rows.length) {
      nilamMount.innerHTML = '<p class="pss-widget-empty">Carta NILAM belum dikemas kini oleh PSS.</p>';
      if (nilamFeature) nilamFeature.innerHTML = '<span>NILAM</span><strong>Carta Pendahulu NILAM akan dikemas kini oleh PSS.</strong><small>Portal NILAM &rarr;</small>';
      return;
    }
    var monthNames = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
    function formatDate(value) {
      var parts = String(value || '').split('-');
      return parts.length === 3 ? parseInt(parts[2], 10) + ' ' + (monthNames[parseInt(parts[1], 10) - 1] || '') + ' ' + parts[0] : '';
    }
    nilamMount.innerHTML = rows.map(function (row, index) {
      var rank = Number(row.kedudukan) || index + 1;
      var count = Number(row.jumlah_bacaan) || 0;
      var detail = [row.tingkatan, row.kelas].filter(Boolean).join(' · ') || 'Maklumat kelas belum dinyatakan';
      return '<article class="pss-nilam-rank" data-rank="' + rank + '"><span class="pss-nilam-rank-badge" aria-label="Kedudukan ' + rank + '">' + rank + '</span><div class="pss-nilam-rank-info"><b>' + esc(row.nama || 'Nama murid belum dinyatakan') + '</b><small>' + esc(detail) + '</small></div><strong>' + esc(count) + '<small>bahan</small></strong></article>';
    }).join('');
    var latest = formatDate(rows[0].dikemas_kini);
    var updated = document.createElement('p');
    updated.className = 'pss-nilam-updated';
    updated.textContent = latest ? 'Dikemas kini: ' + latest : 'Tarikh kemas kini belum dinyatakan.';
    nilamMount.appendChild(updated);
    if (nilamFeature) {
      var leader = rows[0];
      nilamFeature.innerHTML = '<span>NILAM</span><strong>' + esc(leader.nama || 'Murid teratas') + ' mendahului dengan ' + esc(Number(leader.jumlah_bacaan) || 0) + ' bahan.</strong><small>' + esc([leader.tingkatan, leader.kelas].filter(Boolean).join(' · ') || 'Carta sekolah') + ' · Portal NILAM &rarr;</small>';
    }
  }

  async function loadWeeklyActivity() {
    if (!activityFeature) return;
    var today = new Date().toISOString().split('T')[0];
    var response = await window.cms.from('takwim').select('tajuk,tarikh_mula,tarikh_tamat')
      .eq('portal', 'pss').eq('kategori', 'aktiviti').or('tarikh_mula.gte.' + today + ',tarikh_tamat.gte.' + today).order('tarikh_mula').limit(1);
    var activity = response.data && response.data[0];
    if (response.error || !activity) {
      activityFeature.innerHTML = '<span>AKTIVITI</span><strong>Aktiviti seterusnya akan dikemas kini oleh PSS.</strong><small>Kalendar PSS &rarr;</small>';
      return;
    }
    var date = new Date(activity.tarikh_mula + 'T00:00:00');
    var dateLabel = new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'long' }).format(date);
    activityFeature.innerHTML = '<span>AKTIVITI</span><strong>' + esc(activity.tajuk) + '</strong><small>' + esc(dateLabel) + ' · Kalendar PSS &rarr;</small>';
  }

  async function loadBriefSection() {
    var BULAN = ['Januari','Februari','Mac','April','Mei','Jun','Julai','Ogos','September','Oktober','November','Disember'];
    function setTarikh(el, iso) {
      if (!el) return;
      var parts = String(iso || '').split('-');
      if (parts.length === 3) el.innerHTML = parseInt(parts[2], 10) + '<br /><small>' + (BULAN[parseInt(parts[1], 10) - 1] || '-') + '</small>';
    }
    function setNotisFallback(hasError) {
      var fallbackTajuk = document.getElementById('pss-notis-tajuk');
      var fallbackInfo = document.getElementById('pss-notis-maklumat');
      if (fallbackTajuk) fallbackTajuk.textContent = hasError ? 'Pengumuman PSS tidak dapat dimuatkan' : 'Belum ada pengumuman PSS';
      if (fallbackInfo) fallbackInfo.textContent = hasError ? 'Cuba lagi kemudian atau rujuk halaman pengumuman PSS.' : 'Pengumuman rasmi PSS akan dipaparkan di sini apabila tersedia.';
    }
    var today = new Date().toISOString().split('T')[0];
    var aktivitiResponse;
    try {
      aktivitiResponse = await window.cms.from('takwim').select('tajuk,tarikh_mula,tarikh_tamat,kategori')
        .eq('portal', 'pss').eq('kategori', 'aktiviti').or('tarikh_mula.gte.' + today + ',tarikh_tamat.gte.' + today).order('tarikh_mula').limit(1);
    } catch (error) {
      aktivitiResponse = { data: [], error: error };
    }
    var aktiviti = aktivitiResponse.data && aktivitiResponse.data[0];
    if (aktiviti) {
      setTarikh(document.getElementById('pss-aktiviti-tarikh'), aktiviti.tarikh_mula);
      var tajukEl = document.getElementById('pss-aktiviti-tajuk');
      var infoEl = document.getElementById('pss-aktiviti-maklumat');
      if (tajukEl) tajukEl.textContent = aktiviti.tajuk;
      if (infoEl) infoEl.textContent = 'Aktiviti rasmi PSS - rujuk kalendar untuk butiran penuh.';
    } else {
      var fallbackTajuk = document.getElementById('pss-aktiviti-tajuk');
      var fallbackInfo = document.getElementById('pss-aktiviti-maklumat');
      if (fallbackTajuk) fallbackTajuk.textContent = 'Cadangan bahan bacaan sentiasa dibuka';
      if (fallbackInfo) fallbackInfo.textContent = 'Hantar judul buku atau bahan digital yang ingin dicadangkan kepada PSS.';
    }
    var notisResponse;
    try {
      notisResponse = await window.cms.from('pengumuman').select('tajuk,tarikh,kandungan').eq('portal', 'pss').order('tarikh', { ascending: false }).limit(1);
    } catch (error) {
      notisResponse = { data: [], error: error };
    }
    var notis = notisResponse.data && notisResponse.data[0];
    if (notis) {
      setTarikh(document.getElementById('pss-notis-tarikh'), notis.tarikh || notis.tarikh_mula);
      var nTajuk = document.getElementById('pss-notis-tajuk');
      var nMaklumat = document.getElementById('pss-notis-maklumat');
      if (nTajuk) nTajuk.textContent = notis.tajuk;
      if (nMaklumat) nMaklumat.textContent = notis.kandungan || 'Rujuk laman sekolah untuk butiran penuh.';
    } else {
      setTarikh(document.getElementById('pss-notis-tarikh'), today);
      setNotisFallback(Boolean(notisResponse.error));
    }
  }

  loadWeeklyBooks();
  loadNilamWidget();
  loadWeeklyActivity();
  loadBriefSection();
}());
