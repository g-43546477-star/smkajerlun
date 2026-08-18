(function () {
  var mount = document.getElementById('pss-calendar-grid');
  var list = document.getElementById('pss-calendar-list');
  var monthLabel = document.getElementById('pss-calendar-month');
  var previous = document.getElementById('pss-calendar-previous');
  var next = document.getElementById('pss-calendar-next');
  var todayButton = document.getElementById('pss-calendar-today');
  if (!mount || !list || !monthLabel) return;

  var monthNames = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
  var dayNames = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad'];
  var activities = [
    ['2026-01-14', 'Orientasi PSS dan Lawatan Rak', 'Ruang Bacaan PSS, 8:30 pagi.'],
    ['2026-01-28', 'Bengkel Pengawas PSS', 'Ruang Depan PSS, 2:30 petang.'],
    ['2026-02-11', 'Jom Baca 10 Minit', 'Ruang Bacaan PSS, 7:25 pagi.'],
    ['2026-02-25', 'Asas Carian Maklumat', 'Ruang Depan PSS, 2:30 petang.'],
    ['2026-03-11', 'Kuiz Buku dan Bahasa', 'Bilik Tayangan, 2:30 petang.'],
    ['2026-03-25', 'Sudut Bacaan Kelas', 'Ruang Depan PSS, 2:30 petang.'],
    ['2026-04-08', 'Bedah Buku Ramadan', 'Ruang Bacaan PSS, 10:00 pagi.'],
    ['2026-04-22', 'Rakaman Ulasan Buku', 'Bilik Casting, 2:30 petang.'],
    ['2026-05-13', 'Minggu Literasi Maklumat', 'Ruang Depan PSS, 8:00 pagi.'],
    ['2026-05-27', 'Tayangan Dokumentari Ilmu', 'Bilik Tayangan, 2:30 petang.'],
    ['2026-06-10', 'Bengkel Poster Digital NILAM', 'Bilik Casting, 2:30 petang.'],
    ['2026-06-24', 'Jom Kongsi Buku', 'Ruang Bacaan PSS, 10:00 pagi.'],
    ['2026-07-08', 'Cabaran Bacaan Pertengahan Tahun', 'Ruang Bacaan PSS, 7:25 pagi.'],
    ['2026-07-22', 'Klinik Rekod NILAM', 'Ruang Depan PSS, 2:30 petang.'],
    ['2026-08-12', 'Jom Baca Bersama', 'Ruang Bacaan PSS, 9:00 pagi.'],
    ['2026-08-26', 'Pameran Sejarah dan Kemerdekaan', 'Ruang Depan PSS, 8:00 pagi.'],
    ['2026-09-09', 'Kelas Media dan Podcast', 'Bilik Casting, 2:30 petang.'],
    ['2026-09-23', 'Tayangan Pendidikan', 'Bilik Tayangan, 2:30 petang.'],
    ['2026-10-14', 'Minggu Buku dan Penulis', 'Ruang Depan PSS, 8:00 pagi.'],
    ['2026-10-28', 'Jejak Maklumat PSS', 'Ruang Bacaan PSS, 2:30 petang.'],
    ['2026-11-11', 'Perkongsian Buku Pilihan Murid', 'Ruang Bacaan PSS, 10:00 pagi.'],
    ['2026-11-25', 'Apresiasi Pengawas PSS', 'Bilik Tayangan, 2:30 petang.'],
    ['2026-12-09', 'Semakan Koleksi dan Rak', 'Ruang Bacaan PSS, 9:00 pagi.'],
    ['2026-12-16', 'Perancangan Program PSS', 'Ruang Depan PSS, 10:00 pagi.']
  ].map(function (item) {
    return { date: item[0], title: item[1], detail: item[2] };
  });

  var today = new Date();
  var current = new Date(2026, today.getFullYear() === 2026 ? today.getMonth() : 0, 1);
  var esc = window.cmsEsc || function (value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  };

  function pad(value) { return String(value).padStart(2, '0'); }
  function isoDate(year, month, day) { return year + '-' + pad(month + 1) + '-' + pad(day); }
  function formatDate(iso) {
    var parts = iso.split('-');
    return parseInt(parts[2], 10) + ' ' + monthNames[parseInt(parts[1], 10) - 1];
  }
  function eventsFor(date) { return activities.filter(function (activity) { return activity.date === date; }); }
  function activityMonth(year, month) {
    return activities.filter(function (activity) {
      return activity.date.indexOf(year + '-' + pad(month + 1)) === 0;
    });
  }

  function renderCalendar() {
    var year = current.getFullYear();
    var month = current.getMonth();
    var firstDay = new Date(year, month, 1);
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var mondayIndex = (firstDay.getDay() + 6) % 7;
    var monthActivities = activityMonth(year, month);
    monthLabel.textContent = monthNames[month] + ' ' + year;
    mount.innerHTML = dayNames.map(function (day) { return '<div class="pss-calendar-weekday" role="columnheader">' + day + '</div>'; }).join('');
    for (var blank = 0; blank < mondayIndex; blank += 1) mount.innerHTML += '<div class="pss-calendar-day is-empty" aria-hidden="true"></div>';
    for (var day = 1; day <= daysInMonth; day += 1) {
      var date = isoDate(year, month, day);
      var dayEvents = eventsFor(date);
      var todayClass = date === isoDate(today.getFullYear(), today.getMonth(), today.getDate()) ? ' is-today' : '';
      var eventClass = dayEvents.length ? ' has-event' : '';
      mount.innerHTML += '<div class="pss-calendar-day' + todayClass + eventClass + '"><span class="pss-calendar-number">' + day + '</span>' + (dayEvents.length ? '<div class="pss-calendar-markers">' + dayEvents.map(function (event) { return '<span title="' + esc(event.title) + '"></span>'; }).join('') + '</div><small>' + dayEvents.length + ' aktiviti</small>' : '') + '</div>';
    }
    list.innerHTML = monthActivities.length ? monthActivities.map(function (activity) {
      return '<article class="pss-calendar-event"><time>' + esc(formatDate(activity.date)) + '</time><div><h3>' + esc(activity.title) + '</h3><p>' + esc(activity.detail) + '</p></div></article>';
    }).join('') : '<p class="pss-calendar-empty">Tiada aktiviti PSS direkodkan untuk bulan ini.</p>';
    var count = document.getElementById('pss-calendar-count');
    if (count) count.textContent = monthActivities.length + ' aktiviti bulan ini';
  }

  if (previous) previous.addEventListener('click', function () { current.setMonth(current.getMonth() - 1); renderCalendar(); });
  if (next) next.addEventListener('click', function () { current.setMonth(current.getMonth() + 1); renderCalendar(); });
  if (todayButton) todayButton.addEventListener('click', function () { current = new Date(2026, today.getFullYear() === 2026 ? today.getMonth() : 0, 1); renderCalendar(); });
  renderCalendar();
}());
