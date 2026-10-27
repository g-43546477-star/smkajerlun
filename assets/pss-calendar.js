(function () {
  const mount = document.getElementById('pss-calendar-grid');
  const list = document.getElementById('pss-calendar-list');
  const monthLabel = document.getElementById('pss-calendar-month');
  const previous = document.getElementById('pss-calendar-previous');
  const next = document.getElementById('pss-calendar-next');
  const todayButton = document.getElementById('pss-calendar-today');
  const count = document.getElementById('pss-calendar-count');
  if (!mount || !list || !monthLabel || !window.cms) return;

  const monthNames = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
  const dayNames = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad'];
  const today = parseDate(window.cmsTodayIso());
  let current = new Date(today.getFullYear(), today.getMonth(), 1);
  let activities = [];

  function pad(value) { return String(value).padStart(2, '0'); }
  function isoDate(year, month, day) { return year + '-' + pad(month + 1) + '-' + pad(day); }
  function parseDate(value) {
    const parts = String(value || '').split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  function formatDate(value) {
    const parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || !parts[0]) return '';
    return parts[2] + ' ' + monthNames[parts[1] - 1] + ' ' + parts[0];
  }
  function formatRange(activity) {
    if (!activity.tarikh_tamat || activity.tarikh_tamat === activity.tarikh_mula) return formatDate(activity.tarikh_mula);
    return formatDate(activity.tarikh_mula) + ' - ' + formatDate(activity.tarikh_tamat);
  }
  function occursOn(activity, value) {
    const date = parseDate(value);
    const start = parseDate(activity.tarikh_mula);
    const end = parseDate(activity.tarikh_tamat || activity.tarikh_mula);
    return date >= start && date <= end;
  }
  function occursInMonth(activity, year, month) {
    const start = parseDate(activity.tarikh_mula);
    const end = parseDate(activity.tarikh_tamat || activity.tarikh_mula);
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    return start <= monthEnd && end >= monthStart;
  }

  function renderAgenda(rows) {
    list.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'pss-calendar-empty';
      empty.textContent = 'Tiada aktiviti PSS direkodkan untuk bulan ini.';
      list.appendChild(empty);
      return;
    }
    rows.forEach(function (activity) {
      const article = document.createElement('article');
      article.className = 'pss-calendar-event';
      const time = document.createElement('time');
      time.dateTime = activity.tarikh_mula;
      time.textContent = formatRange(activity);
      const body = document.createElement('div');
      const heading = document.createElement('h3');
      heading.textContent = activity.tajuk;
      body.appendChild(heading);
      if (activity.keterangan) {
        const detail = document.createElement('p');
        detail.textContent = activity.keterangan;
        body.appendChild(detail);
      }
      article.append(time, body);
      list.appendChild(article);
    });
  }

  function renderCalendar() {
    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mondayIndex = (firstDay.getDay() + 6) % 7;
    const monthActivities = activities.filter(function (activity) {
      return occursInMonth(activity, year, month);
    });

    monthLabel.textContent = monthNames[month] + ' ' + year;
    mount.replaceChildren();
    const headingGroup = document.createElement('thead');
    const bodyGroup = document.createElement('tbody');
    const header = document.createElement('tr');
    header.className = 'pss-calendar-row';
    header.setAttribute('role', 'row');
    headingGroup.appendChild(header);
    mount.append(headingGroup, bodyGroup);
    dayNames.forEach(function (day) {
      const label = document.createElement('th');
      label.scope = 'col';
      label.className = 'pss-calendar-weekday';
      label.setAttribute('role', 'columnheader');
      label.textContent = day;
      header.appendChild(label);
    });
    let week;
    const cellCount = Math.ceil((mondayIndex + daysInMonth) / 7) * 7;
    for (let index = 0; index < cellCount; index += 1) {
      if (index % 7 === 0) {
        week = document.createElement('tr');
        week.className = 'pss-calendar-row';
        week.setAttribute('role', 'row');
        bodyGroup.appendChild(week);
      }
      const day = index - mondayIndex + 1;
      if (day < 1 || day > daysInMonth) {
        const blank = document.createElement('td');
        blank.className = 'pss-calendar-day is-empty';
        blank.setAttribute('role', 'cell');
        blank.setAttribute('aria-label', 'Tiada tarikh');
        week.appendChild(blank);
        continue;
      }
      const date = isoDate(year, month, day);
      const dayEvents = activities.filter(function (activity) { return occursOn(activity, date); });
      const cell = document.createElement('td');
      cell.className = 'pss-calendar-day';
      cell.setAttribute('role', 'cell');
      cell.setAttribute('aria-label', day + ' ' + monthNames[month] + (dayEvents.length ? ', ' + dayEvents.length + ' aktiviti' : ''));
      if (date === isoDate(today.getFullYear(), today.getMonth(), today.getDate())) {
        cell.classList.add('is-today');
        cell.setAttribute('aria-current', 'date');
      }
      if (dayEvents.length) cell.classList.add('has-event');
      const number = document.createElement('span');
      number.className = 'pss-calendar-number';
      number.textContent = day;
      cell.appendChild(number);
      if (dayEvents.length) {
        const markers = document.createElement('div');
        markers.className = 'pss-calendar-markers';
        dayEvents.forEach(function (activity) {
          const marker = document.createElement('span');
          marker.title = activity.tajuk;
          markers.appendChild(marker);
        });
        const summary = document.createElement('small');
        summary.textContent = dayEvents.length + ' aktiviti';
        cell.append(markers, summary);
      }
      week.appendChild(cell);
    }
    renderAgenda(monthActivities);
    if (count) count.textContent = monthActivities.length + ' aktiviti bulan ini';
  }

  async function loadActivities() {
    mount.setAttribute('aria-busy', 'true');
    const response = await window.cms.from('takwim')
      .select('id,tajuk,tarikh_mula,tarikh_tamat,keterangan,susunan')
      .eq('portal', 'pss')
      .eq('kategori', 'aktiviti')
      .order('tarikh_mula')
      .order('susunan');
    mount.removeAttribute('aria-busy');
    if (response.error) {
      activities = [];
      renderCalendar();
      const error = document.createElement('p');
      error.className = 'pss-calendar-empty';
      error.textContent = 'Kalendar PSS tidak dapat dimuatkan buat masa ini.';
      list.replaceChildren(error);
      if (count) count.textContent = 'Sambungan kalendar gagal';
      return;
    }
    activities = response.data || [];
    renderCalendar();
  }

  if (previous) previous.addEventListener('click', function () {
    current.setMonth(current.getMonth() - 1);
    renderCalendar();
  });
  if (next) next.addEventListener('click', function () {
    current.setMonth(current.getMonth() + 1);
    renderCalendar();
  });
  if (todayButton) todayButton.addEventListener('click', function () {
    current = new Date(today.getFullYear(), today.getMonth(), 1);
    renderCalendar();
  });
  loadActivities();
}());
