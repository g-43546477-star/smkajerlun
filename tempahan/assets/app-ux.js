(() => {
  const form = document.getElementById('f-tujuan');
  if (form) {
    const main = document.querySelector('main');
    const cards = main.querySelectorAll(':scope > .card');
    const first = cards[0], second = cards[1];
    const catalogue = document.createElement('details');
    catalogue.className = 'room-catalogue';
    const summary = document.createElement('summary');
    summary.textContent = 'Lihat semua bilik dan kekosongan';
    catalogue.append(summary, document.querySelector('.availability-panel'));
    const steps = document.createElement('nav');
    steps.className = 'booking-steps';
    steps.setAttribute('aria-label', 'Langkah tempahan');
    steps.innerHTML = '<button type="button" aria-current="step">1 · Bilik &amp; aktiviti</button><button type="button">2 · Masa &amp; hantar</button>';
    first.before(steps);
    first.prepend(catalogue);
    // Keep existing fields and event handlers; put date and room first.
    const grids = first.querySelectorAll(':scope > .grid');
    if (grids.length === 2) first.insertBefore(grids[1], grids[0]);
    document.getElementById('f-nama').parentElement.hidden = true;
    const next = document.createElement('button');
    next.type = 'button'; next.className = 'btn-primary booking-next'; next.textContent = 'Teruskan pilih masa →';
    const error = document.createElement('p'); error.className = 'booking-inline-error'; error.setAttribute('role', 'status');
    first.append(error, next);
    const selection = document.createElement('p'); selection.className = 'booking-summary'; second.prepend(selection);
    const previous = document.createElement('button'); previous.type = 'button'; previous.className = 'btn-secondary'; previous.textContent = '← Ubah bilik atau aktiviti';
    second.append(previous);
    const controls = steps.querySelectorAll('button');
    const go = index => {
      error.textContent = '';
      if (index === 1) {
        if (!state.bilik) { error.textContent = 'Pilih bilik dahulu.'; document.getElementById('f-bilik').focus(); return; }
        if (!form.value.trim()) { error.textContent = 'Nyatakan tujuan atau aktiviti.'; form.focus(); return; }
        if (!bookingDateAllowed(state.tarikh, state.admin)) { error.textContent = 'Tempahan tarikh ini belum dibuka.'; return; }
        selection.textContent = `${state.bilik} · ${formatMalayDate(state.tarikh)} · ${form.value.trim()}`;
      }
      first.hidden = index !== 0; second.hidden = index !== 1;
      controls.forEach((button, i) => { if (i === index) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
      const visible = index ? second : first;
      visible.tabIndex = -1; visible.focus({preventScroll:true}); steps.scrollIntoView({block:'start',behavior:'auto'});
    };
    controls[0].onclick = () => go(0); controls[1].onclick = () => go(1); next.onclick = () => go(1); previous.onclick = () => go(0);
    second.hidden = true;
    const applyLink = () => {
      const params = new URLSearchParams(location.search);
      const room = findBookable(params.get('room'));
      if (!room || !bookingDateAllowed(params.get('date'), state.admin)) return;
      const select = document.getElementById('f-bilik'); select.value = room.parent || room.id;
      select.dispatchEvent(new Event('change'));
      if (room.parent) { const sub = document.getElementById('f-sub'); sub.value = room.id; sub.dispatchEvent(new Event('change')); }
      state.pendingSlot = params.get('slot');
      setTarikh(params.get('date'));
    };
    if (state.tarikh) applyLink(); else window.addEventListener('booking-ready', applyLink, {once:true});
    window.addEventListener('booking-saved', () => {
      go(0);
      error.textContent = 'Tempahan berjaya. Lihat rekod dalam Tempahan saya.';
    });
  }
  const password = document.getElementById('in-pass');
  if (password) {
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'password-toggle'; toggle.textContent = 'Tunjuk kata laluan'; toggle.setAttribute('aria-pressed','false');
    toggle.onclick = () => { const show = password.type === 'password'; password.type = show ? 'text' : 'password'; toggle.textContent = show ? 'Sembunyikan kata laluan' : 'Tunjuk kata laluan'; toggle.setAttribute('aria-pressed', String(show)); };
    password.after(toggle);
  }
})();
