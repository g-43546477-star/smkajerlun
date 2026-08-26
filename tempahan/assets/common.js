// ===== Sistem Tempahan Bilik Khas SMKAJ — shared =====
const SB_URL = 'https://jykptknzasrrkvtxtvuk.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5a3B0a256YXNycmt2dHh0dnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyNzU4MzUsImV4cCI6MjEwMTg1MTgzNX0.xFFOrAUcFDChpfXT7Wc5BWa7gWfHydQwOnSZtKgVoqY';
const sb = window.supabase.createClient(SB_URL, SB_KEY);
// Jadual awam mesti kekal menggunakan peranan anon walaupun guru telah log masuk.
// Ini membolehkan semua slot aktif dilihat tanpa membuka medan peribadi jadual asal.
const sbPublic = window.supabase.createClient(SB_URL, SB_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'smkaj-tempahan-public'
  }
});
const BASE = '/tempahan';

// ---------- Data tetap ----------
const ROOMS = [
  { id: 'Bilik PAK 21', desc: 'Bilik pembelajaran abad ke-21 - susun atur fleksibel untuk PdPc interaktif' },
  { id: 'Makmal Bahasa', desc: 'Kemudahan audio & pembelajaran bahasa' },
  { id: 'Bilik Seminar', desc: 'Kerusi susun teater, skrin - sesuai untuk taklimat & kursus' },
  { id: 'Makmal Komputer', desc: 'Komputer murid, projektor' },
  { id: 'Digital Learning Centre (DLC)', desc: 'Pusat pembelajaran digital - peranti & akses internet' },
  { id: 'Bilik Matematik', desc: 'Bahan bantu mengajar Matematik' },
  { id: 'Bilik KKQ', desc: 'Kelas Kemahiran al-Quran' },
  { id: 'Perpustakaan Darul Hikmah', desc: 'Pusat Sumber Sekolah - pilih ruang khusus di bawah', sub: [
    { id: 'Ruang Depan PSS', desc: 'Ruang terbuka - perbincangan & aktiviti murid' },
    { id: 'Ruang Bacaan PSS', desc: 'Meja bacaan, rak buku - sesuai untuk bacaan & aktiviti berunsur ilmiah' },
    { id: 'Bilik Casting', desc: 'Kemudahan rakaman video & audio - sesuai untuk sesi casting' },
    { id: 'Bilik Tayangan', desc: 'Skrin tayangan, projektor' }
  ] }
];

// Senarai unit yang boleh ditempah (bilik biasa + sub-bilik perpustakaan)
const BOOKABLE = [];
ROOMS.forEach(r => {
  if (r.sub) r.sub.forEach(s => BOOKABLE.push({ id: s.id, desc: s.desc, parent: r.id }));
  else BOOKABLE.push({ id: r.id, desc: r.desc, parent: null });
});
function findBookable(id) { return BOOKABLE.find(b => b.id === id); }

function genClassOptions() {
  const streams = ['Imtiyaz', 'Itqan', 'Irfan', 'Ihsan'];
  const out = [];
  for (let f = 1; f <= 5; f++) streams.forEach(s => out.push(`${f} ${s}`));
  out.push('Program Sekolah / Guru');
  return out;
}
const CLASS_OPTIONS = genClassOptions();

function pad(n) { return String(n).padStart(2, '0'); }
function toHHMM(mins) { return `${pad(Math.floor(mins/60))}:${pad(mins%60)}`; }
function genSlots() {
  const slots = [];
  let m = 7*60+40; const end = 14*60+40;
  while (m + 30 <= end) {
    const mula = toHHMM(m), tamat = toHHMM(m+30);
    const h = Math.floor(m/60);
    slots.push({ masa_mula: mula, masa_tamat: tamat, label: `${mula}-${tamat}`, kumpulan: h < 12 ? 'Pagi' : 'Tengah Hari', block:false });
    m += 30;
  }
  slots.push({ masa_mula: '15:00', masa_tamat: '17:00', label: '15:00 - 17:00', kumpulan: 'Petang', block:true });
  slots.push({ masa_mula: '20:00', masa_tamat: '23:00', label: '20:00 - 23:00', kumpulan: 'Malam', block:true });
  return slots;
}
const SLOTS = genSlots();
const MORNING = SLOTS.filter(s => !s.block);
const BLOCKS = SLOTS.filter(s => s.block);

function tarikhInfo() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false });
  const parts = fmt.formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  const hariIni = `${get('year')}-${get('month')}-${get('day')}`;
  const jam = Number(get('hour')) % 24;
  const [y,mo,d] = hariIni.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo-1, d)); dt.setUTCDate(dt.getUTCDate()+1);
  const esok = dt.toISOString().split('T')[0];
  return { hariIni, esok, bukaEsok: jam >= 15 };
}
function formatMalayDate(str) {
  if (!str) return '-';
  const [y,m,d] = str.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m-1, d));
  return new Intl.DateTimeFormat('ms-MY', { day:'numeric', month:'long', year:'numeric', weekday:'long', timeZone:'UTC' }).format(dt);
}
function formatMalayDateShort(str) {
  const [y,m,d] = str.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m-1, d));
  return new Intl.DateTimeFormat('ms-MY', { day:'numeric', month:'long', timeZone:'UTC' }).format(dt);
}

// ---------- Toast ----------
function showToast(title, msg, type='success') {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id='toasts'; box.className='toasts'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<h4></h4><p></p>`;
  el.querySelector('h4').textContent = title;
  el.querySelector('p').textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

// ---------- Auth (guru guna nama sahaja, bukan e-mel) ----------
const EMAIL_DOMAIN = 'guru.smkajerlun.my';
function usernameToEmail(nama) {
  const slug = nama.trim().toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return slug + '@' + EMAIL_DOMAIN;
}
function displayName(user) {
  return (user && (user.user_metadata && user.user_metadata.username)) || (user && user.email) || '';
}
async function isAdmin(user) {
  if (!user) return false;
  const { data, error } = await sb.from('admin_pengguna').select('user_id').eq('user_id', user.id).maybeSingle();
  return !error && !!data;
}
// Returns { user, admin } (user=null if not logged in). Updates #authbox & #nav-admin.
async function refreshAuthBox() {
  const box = document.getElementById('authbox');
  const navAdmin = document.getElementById('nav-admin');
  const { data: { user } } = await sb.auth.getUser();
  let admin = false;
  if (user) {
    admin = await isAdmin(user);
    if (box) {
      box.innerHTML = '';
      const span = document.createElement('span');
      span.textContent = 'Log masuk sebagai ' + displayName(user);
      const btn = document.createElement('button');
      btn.textContent = 'Log Keluar';
      btn.onclick = async () => { await sb.auth.signOut(); location.reload(); };
      box.appendChild(span); box.appendChild(btn);
    }
    if (navAdmin) navAdmin.style.display = admin ? 'inline-block' : 'none';
  } else {
    if (box) box.innerHTML = `<a href="${BASE}/log-masuk/">Log Masuk / Daftar</a>`;
    if (navAdmin) navAdmin.style.display = 'none';
  }
  return { user, admin };
}
