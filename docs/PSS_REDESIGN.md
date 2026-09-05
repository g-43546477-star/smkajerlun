# Portal PSS: reka bentuk tempatan

Pakej pelepasan PSS, 5 September 2026. Ujian di bawah ialah bukti lokal; status deployment disahkan berasingan melalui Vercel dan smoke laman live.

## Liputan

Kesemua 23 laluan HTML dalam `pss/` telah disemak: 17 halaman kandungan dan enam laluan lama yang mengalih pengguna.

- Utama: hero SVG, kad akses, widget buku/NILAM/aktiviti, tarikh responsif.
- Maklumat PSS: fungsi, hubungan, ruang dan akses perkhidmatan. Kedua-dua laluan maklumat memaparkan kandungan yang sama; salinan aktiviti lama dalam halaman maklumat dibuang.
- Jawatankuasa guru dan pengawas: carta hierarki, ilustrasi unit, tab papan kekunci dan motion yang menghormati reduced motion.
- Katalog: hero, ringkasan, penapis, kad dan pagination responsif sehingga 320px.
- NILAM/AINS: hero, carta, nota dan panduan akses.
- Rak Maya: buku dengan tipografi baharu, penapis, 12 judul awal, tambah 12 judul setiap klik, mesej carian kosong dan fokus pada judul baharu.
- Kalendar/pengumuman: hero, agenda, kad notis dan keadaan kosong.
- Pinjaman/cadangan/tempahan: panduan tiga langkah, borang dan nota berilustrasi. Tempahan kekal menggunakan sistem `/tempahan/`.
- Jaringan `/pss/jaringan-perpustakaan/`: lima platform dengan SVG berasingan dan pautan menu overview.
- Direktori `/pss/submenu/`: pintu masuk perkhidmatan sebenar, dipautkan dari menu.
- Admin PSS: banner, statistik, tab, jadual, borang dan paparan akses terhad. Logik akses dan data dikekalkan.

## Semakan

- `npm run build`: lulus.
- `node scripts/pss-design-smoke.mjs`: Chrome sebenar; 23 laluan pada 1440px, 390px dan 320px; muatan grafik, limpahan, tab papan kekunci, reduced motion, Rak Maya, carian katalog, borang wajib dan tarikh panjang lulus. Tidak menghantar borang sebenar.
- `ADMIN_HEADLESS=0 npm run test:admin`: lulus menggunakan data tiruan dan stub akses; meliputi panel sekolah, PSS dan tempahan, desktop/mobile, papan kekunci, scope, XSS dan PDF. Ini bukan bukti sesi admin produksi.
- `git diff --check`: lulus.

## Fail reka bentuk

`assets/pss-reading-room.css`, `assets/pss-interior.css`, `assets/pss-details.css`, `assets/pss-organization.css` dan `assets/pss-admin-design.css` melengkapkan CSS asas. Grafik SVG aktif berada dalam `assets/pss-art/`. Set semasa mempunyai 50 komposisi baharu yang dilukis khusus serta dua ilustrasi asal yang dihasilkan dalam sesi ini. Semua SVG set `pss-cards/` telah dikeluarkan; sandaran boleh dipulihkan di `/tmp/pss-superseded-svg/`. Grafik YouTube, TikTok, TV PSS dan unit lain dipetakan mengikut fungsi, bukan kad generik.

Tiada migrasi pangkalan data atau perubahan polisi akses dalam pakej ini. Perubahan tempatan yang sudah wujud sebelum kerja ini dikekalkan.
