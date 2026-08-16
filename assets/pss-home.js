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
    nilamMount.innerHTML = '<p class="pss-widget-empty">Memuatkan statistik NILAM...</p>';
    var response = await window.cms.from('nilam_stat').select('kelas,jumlah_bacaan,murid_aktif,dikemas_kini').order('jumlah_bacaan', { ascending: false }).limit(5);
    var rows = response.data || [];
    if (response.error || !rows.length) {
      nilamMount.innerHTML = '<p class="pss-widget-empty">Statistik NILAM belum dikemas kini oleh PSS.</p>';
      if (nilamFeature) nilamFeature.innerHTML = '<span>NILAM</span><strong>Statistik NILAM akan dikemas kini oleh PSS.</strong><small>Portal NILAM &rarr;</small>';
      return;
    }
    var highest = Math.max.apply(null, rows.map(function (row) { return row.jumlah_bacaan || 0; }).concat([1]));
    nilamMount.innerHTML = rows.map(function (row) {
      var width = Math.max(8, Math.round(((row.jumlah_bacaan || 0) / highest) * 100));
      return '<article class="pss-nilam-row"><div><b>' + esc(row.kelas) + '</b><small>' + esc(row.murid_aktif) + ' murid aktif</small></div><strong>' + esc(row.jumlah_bacaan) + '</strong><i style="--nilai:' + width + '%"></i></article>';
    }).join('');
    if (nilamFeature) {
      var leader = rows[0];
      nilamFeature.innerHTML = '<span>NILAM</span><strong>' + esc(leader.kelas) + ' mendahului dengan ' + esc(leader.jumlah_bacaan) + ' bacaan.</strong><small>' + esc(leader.murid_aktif) + ' murid aktif · Portal NILAM &rarr;</small>';
    }
  }

  async function loadWeeklyActivity() {
    if (!activityFeature) return;
    var today = new Date().toISOString().split('T')[0];
    var response = await window.cms.from('takwim').select('tajuk,tarikh_mula,tarikh_tamat')
      .eq('kategori', 'aktiviti').or('tarikh_mula.gte.' + today + ',tarikh_tamat.gte.' + today).order('tarikh_mula').limit(1);
    var activity = response.data && response.data[0];
    if (response.error || !activity) {
      activityFeature.innerHTML = '<span>AKTIVITI</span><strong>Aktiviti seterusnya akan dikemas kini oleh PSS.</strong><small>Program PSS &rarr;</small>';
      return;
    }
    var date = new Date(activity.tarikh_mula + 'T00:00:00');
    var dateLabel = new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'long' }).format(date);
    activityFeature.innerHTML = '<span>AKTIVITI</span><strong>' + esc(activity.tajuk) + '</strong><small>' + esc(dateLabel) + ' · Program PSS &rarr;</small>';
  }

  async function loadBriefSection() {
    var BULAN = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis'];
    function setTarikh(el, iso) {
      if (!el) return;
      var parts = String(iso || '').split('-');
      if (parts.length === 3) el.innerHTML = parseInt(parts[2], 10) + '<br /><small>' + (BULAN[parseInt(parts[1], 10) - 1] || '-') + '</small>';
    }
    var today = new Date().toISOString().split('T')[0];
    var aktivitiResponse = await window.cms.from('takwim').select('tajuk,tarikh_mula,tarikh_tamat,kategori')
      .eq('kategori', 'aktiviti').or('tarikh_mula.gte.' + today + ',tarikh_tamat.gte.' + today).order('tarikh_mula').limit(1);
    var aktiviti = aktivitiResponse.data && aktivitiResponse.data[0];
    if (aktiviti) {
      setTarikh(document.getElementById('pss-aktiviti-tarikh'), aktiviti.tarikh_mula);
      var tajukEl = document.getElementById('pss-aktiviti-tajuk');
      var infoEl = document.getElementById('pss-aktiviti-maklumat');
      if (tajukEl) tajukEl.textContent = aktiviti.tajuk;
      if (infoEl) infoEl.textContent = 'Aktiviti rasmi sekolah — rujuk kalendar untuk butiran penuh.';
    } else {
      var fallbackTajuk = document.getElementById('pss-aktiviti-tajuk');
      var fallbackInfo = document.getElementById('pss-aktiviti-maklumat');
      if (fallbackTajuk) fallbackTajuk.textContent = 'Cadangan bahan bacaan sentiasa dibuka';
      if (fallbackInfo) fallbackInfo.textContent = 'Hantar judul buku atau bahan digital yang ingin dicadangkan kepada PSS.';
    }
    var notisResponse = await window.cms.from('pengumuman').select('tajuk,tarikh,kandungan').order('tarikh', { ascending: false }).limit(1);
    var notis = notisResponse.data && notisResponse.data[0];
    if (notis) {
      setTarikh(document.getElementById('pss-notis-tarikh'), notis.tarikh || notis.tarikh_mula);
      var nTajuk = document.getElementById('pss-notis-tajuk');
      var nMaklumat = document.getElementById('pss-notis-maklumat');
      if (nTajuk) nTajuk.textContent = notis.tajuk;
      if (nMaklumat) nMaklumat.textContent = notis.kandungan || 'Rujuk laman sekolah untuk butiran penuh.';
    } else {
      setTarikh(document.getElementById('pss-notis-tarikh'), today);
    }
  }

  loadWeeklyBooks();
  loadNilamWidget();
  loadWeeklyActivity();
  loadBriefSection();
}());
