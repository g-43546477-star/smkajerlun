// Only allow a same-origin page; reject external targets and login loops.
function loginDestination(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return '/';
  try {
    const target = new URL(value, location.origin);
    const path = decodeURIComponent(target.pathname).replace(/\/+$/, '').replace(/\/index\.html$/, '');
    if (target.origin !== location.origin || path === '/log-masuk' || path === '/tempahan/log-masuk' || path.startsWith('/api/')) return '/';
    return target.pathname + target.search + target.hash;
  } catch { return '/'; }
}
const destination = loginDestination(new URLSearchParams(location.search).get('next'));
const destinationName = destination.startsWith('/perkhidmatan/klinik/') ? 'Rekod Klinik'
  : destination.startsWith('/pss/') ? 'Portal PSS'
    : destination.startsWith('/tempahan/') ? 'Sistem Tempahan'
      : destination.startsWith('/admin/') ? 'Panel Pentadbir' : 'Laman Sekolah';
document.getElementById('login-destination').textContent = 'Selepas log masuk: ' + destinationName + '.';

document.getElementById('pane-masuk').addEventListener('submit', async event => {
  event.preventDefault();
  const msg = document.getElementById('masuk-msg');
  const btn = document.getElementById('btn-masuk');
  if (btn.disabled) return;
  msg.textContent = '';
  const nama = document.getElementById('in-nama').value.trim();
  const password = document.getElementById('in-pass').value;
  if (!nama || !password) { msg.textContent = 'Sila isi nama guru dan kata laluan.'; return; }
  btn.disabled = true;
  btn.textContent = 'Sedang log masuk...';
  try {
    const { error } = await sb.auth.signInWithPassword({ email: usernameToEmail(nama), password });
    if (error) { msg.textContent = 'Log masuk gagal. Semak nama dan kata laluan anda.'; return; }
    location.replace(destination);
  } catch {
    msg.textContent = 'Sambungan gagal. Sila cuba semula.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Log Masuk';
  }
});

(async function init() {
  try {
    const { data: { user }, error } = await sb.auth.getUser();
    if (!error && user) location.replace(destination);
  } catch { /* Keep the login form available when the network is unavailable. */ }
})();
