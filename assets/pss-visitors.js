(function () {
  if (!location.pathname.startsWith('/pss/') || location.pathname.startsWith('/pss/admin/')) return;
  var panel = document.getElementById('pss-visitors');
  var endpoint = '/api/pss-visitors';
  var local = ['localhost', '127.0.0.1'].includes(location.hostname);
  var number = new Intl.NumberFormat('ms-MY');
  function node(tag, value) {
    var el = document.createElement(tag);
    if (value !== undefined) el.textContent = value;
    return el;
  }
  function render(data) {
    if (!Array.isArray(data.daily) || !Array.isArray(data.countries)) throw new Error('Invalid statistics');
    document.getElementById('visitor-today').textContent = number.format(data.today);
    document.getElementById('visitor-total').textContent = number.format(data.total);
    var chart = document.getElementById('visitor-chart');
    chart.replaceChildren();
    var ns = 'http://www.w3.org/2000/svg';
    function svg(tag, attrs, label) {
      var el = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(function (entry) { el.setAttribute(entry[0], entry[1]); });
      if (label !== undefined) el.textContent = label;
      return el;
    }
    chart.append(svg('title', {}, 'Anggaran pelawat harian bagi tujuh hari terakhir'));
    var max = Math.max(1, ...data.daily.map(function (d) { return Number(d.visitors); }));
    data.daily.forEach(function (d, i) {
      var x = 35 + i * 75;
      var h = Number(d.visitors) / max * 120;
      chart.append(svg('rect', { x: x, y: 155 - h, width: 36, height: h, rx: 5, fill: '#176c60' }));
      chart.append(svg('text', { x: x + 18, y: 145 - h, 'text-anchor': 'middle' }, number.format(d.visitors)));
      chart.append(svg('text', { x: x + 18, y: 180, 'text-anchor': 'middle' }, d.day.slice(8) + '/' + d.day.slice(5, 7)));
    });
    var list = document.getElementById('visitor-countries');
    list.replaceChildren();
    var regions = new Intl.DisplayNames(['ms'], { type: 'region' });
    data.countries.forEach(function (c) {
      var item = node('li');
      var label = c.country === 'ZZ' ? 'Tidak diketahui' : regions.of(c.country);
      item.append(node('span', label), node('b', number.format(c.visitors)));
      list.append(item);
    });
    if (!data.countries.length) list.append(node('li', 'Belum ada lawatan direkodkan.'));
    document.getElementById('visitor-status').textContent = 'Dikemas kini mengikut waktu Malaysia.';
  }
  async function run() {
    if (local) {
      if (panel) document.getElementById('visitor-status').textContent = 'Pratonton lokal — statistik sebenar tersedia selepas tracker diaktifkan.';
      return;
    }
    try {
      if (navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl) {
        await fetch(endpoint, { method: 'POST', credentials: 'same-origin' });
      }
      if (!panel) return;
      var response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unavailable');
      render(await response.json());
    } catch {
      if (panel) document.getElementById('visitor-status').textContent = 'Statistik pelawat belum tersedia. Sila cuba lagi kemudian.';
    }
  }
  run();
})();
