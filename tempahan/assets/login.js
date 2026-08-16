function switchTab(daftar) {
  document.getElementById('tab-masuk').classList.toggle('active', !daftar);
  document.getElementById('tab-daftar').classList.toggle('active', daftar);
  document.getElementById('pane-masuk').style.display = daftar ? 'none' : 'block';
  document.getElementById('pane-daftar').style.display = daftar ? 'block' : 'none';
}
document.getElementById('tab-masuk').addEventListener('click', () => switchTab(false));
document.getElementById('tab-daftar').addEventListener('click', () => switchTab(true));

document.getElementById('btn-masuk').addEventListener('click', async () => {
  const msg = document.getElementById('masuk-msg');
  msg.textContent = '';
  const nama = document.getElementById('in-nama').value.trim();
  const pass = document.getElementById('in-pass').value;
  if (!nama || !pass) { msg.textContent = 'Sila isi nama guru dan kata laluan.'; return; }
  const email = usernameToEmail(nama);
  const btn = document.getElementById('btn-masuk');
  btn.disabled = true; btn.textContent = 'Sedang log masuk...';
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  btn.disabled = false; btn.textContent = 'Log Masuk';
  if (error) { msg.textContent = 'Log masuk gagal. Semak nama dan kata laluan anda.'; return; }
  location.href = '/tempahan/';
});

document.getElementById('btn-daftar').addEventListener('click', async () => {
  const msg = document.getElementById('daftar-msg');
  msg.textContent = '';
  const nama = document.getElementById('up-nama').value.trim();
  const pass = document.getElementById('up-pass').value;
  if (nama.length < 3) { msg.textContent = 'Sila isi nama guru.'; return; }
  if (pass.length < 6) { msg.textContent = 'Kata laluan mestilah sekurang-kurangnya 6 aksara.'; return; }
  const email = usernameToEmail(nama);
  const btn = document.getElementById('btn-daftar');
  btn.disabled = true; btn.textContent = 'Sedang mendaftar...';
  const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: { username: nama } } });
  btn.disabled = false; btn.textContent = 'Daftar Akaun';
  if (error) { msg.textContent = (error.message && error.message.toLowerCase().includes('already')) ? 'Nama ini telah didaftarkan. Sila log masuk.' : 'Pendaftaran gagal: ' + error.message; return; }
  if (data.session) {
    location.href = '/tempahan/';
  } else {
    msg.style.color = '#059669';
    msg.textContent = 'Akaun didaftarkan. Sila log masuk.';
  }
});

document.getElementById('in-pass').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-masuk').click(); });

(async function init() {
  const { user } = await refreshAuthBox();
  if (user) location.href = '/tempahan/';
})();
