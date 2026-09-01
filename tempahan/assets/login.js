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

document.getElementById('in-pass').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-masuk').click(); });

(async function init() {
  const { user } = await refreshAuthBox();
  if (user) location.href = '/tempahan/';
})();
