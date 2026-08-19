(function () {
  var msLoc = 'ms-MY';
  function tick() {
    var now = new Date();
    var date = document.getElementById('tarikh-masihi');
    if (date) date.textContent = new Intl.DateTimeFormat(msLoc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    var hijri = document.getElementById('tarikh-hijri');
    if (hijri) {
      try { hijri.textContent = new Intl.DateTimeFormat('ms-MY-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(now).replace(/\s*H$/, '') + ' H'; }
      catch (error) { hijri.style.display = 'none'; }
    }
    var clock = document.getElementById('jam');
    if (clock) clock.textContent = new Intl.DateTimeFormat(msLoc, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
  }
  tick();
  setInterval(tick, 1000);
  var year = document.getElementById('thn');
  if (year) year.textContent = new Date().getFullYear();
  if (window.cmsLoadAuthNav) window.cmsLoadAuthNav();
}());
