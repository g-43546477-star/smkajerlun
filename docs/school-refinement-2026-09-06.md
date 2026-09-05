# Semakan reka bentuk sekolah — 6 September 2026

Status: perubahan tempatan sahaja. Tiada push, deploy atau suntingan rekod produksi.

- Hero utama menggunakan gambar sekolah tanpa SVG bertindih. Tagline “Adab Dulu Baru Ilmu” dikekalkan.
- Istilah kampus dibuang daripada HTML dan JavaScript awam.
- Navigasi visual menggunakan ikon dengan label pendek. Menu utama terus menuju halaman kandungan; submenu dan navigasi halaman berkongsi destinasi. Laluan /menu/ lama dialihkan kepada kandungan sebenar.
- Widget program memuatkan semua rekod program sekolah dengan pagination, bergerak setiap enam saat, mempunyai kawalan sebelumnya/seterusnya/jeda, serta berhenti apabila pengguna berinteraksi, tab tersembunyi atau reduced motion dipilih. Empat program tersedia semasa semakan.
- Lapisan warna awam baharu dalam assets/ajer-school.css: teal #116974, dakwat #123f48, mint #dff3e9, biru lembut, kuning cerah dan coral. Token asas sistem/admin dikekalkan supaya warna operasi tidak berubah tanpa keperluan.
- 19 unit beruniform, kelab/persatuan dan sukan mempunyai grafik SVG tersendiri. Grafik ini ialah ilustrasi, bukan logo rasmi pertubuhan.
- Carta sekolah menggunakan hierarki HTML responsif dan pilihan senarai, mengekalkan sembilan nama/jawatan daripada sumber sedia ada. Carta jawatankuasa guru dan pengawas PSS turut menggunakan gaya baharu dan pilihan senarai.
- Asrama mempunyai tab Pengurusan, Jadual dan Panduan. Ketiga-tiga jadual harian dan peraturan asal dikekalkan; jadual telefon disusun sebagai baris masa/aktiviti yang mudah dibaca.
- Info Sekolah dipusatkan dalam enam tab dengan pautan terus, navigasi papan kekunci dan profil panjang dalam panel boleh kembang.

## Pengesahan

- npm run build: lulus lint, HTML, routes/assets, migration/security contracts dan 18 pemeriksaan kesihatan baca sahaja.
- E2E_HEADLESS=0 node scripts/smoke.mjs: 64 route/view checks serta keyboard/hover/print/PDF lulus dalam Google Chrome sebenar.
- node scripts/navigation-smoke.mjs: enam kumpulan menu pada empat lebar skrin, termasuk parent link, submenu, keyboard dan redirect lama lulus.
- node scripts/makeover-smoke.mjs: widget hub, carian, penapis warga, 30 paparan responsif, reduced motion dan simulasi kegagalan data lulus.
- Pemeriksaan visual tujuh halaman pada desktop dan telefon: tiada overflow halaman atau JavaScript pageerror; semua 19 ikon kokurikulum dan sembilan entri carta sekolah dipaparkan.

- Ujian interaksi khusus lulus: gerakan automatik, jeda, putaran semua empat program, reduced motion, 19 grafik, tiga tab asrama dan jadual, peraturan, sembilan nama carta dan profil boleh kembang.

Skrip khusus interaksi baharu: scripts/school-refinement-smoke.mjs. Pelayan pratonton: http://127.0.0.1:4173/.
