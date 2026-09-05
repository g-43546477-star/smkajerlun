# Penyederhanaan homepage dan pembaikan menu

Status: tempatan sahaja, 5 September 2026. Tiada deployment atau push.

## Hasil

- Homepage difokuskan kepada hero tagline, satu makluman penting, tiga akses utama, tiga artikel terkini dan pautan hubungan. Pada viewport desktop 1440px, tinggi halaman sekitar 1842px, berbanding kira-kira 7775px pada versi makeover awal.
- Takwim, pengumuman penuh, akses mengikut pengguna, solat, kegemaran, carian dan dokumen dipindahkan ke `/hub/` (Portal Warga). Kandungan terperinci lain masih boleh dicapai melalui halaman sedia ada.
- Layout homepage menggunakan foto kampus bersudut biasa, lapisan ilustrasi SVG dan susunan berita besar/kecil tanpa pengulangan kad bulat pada setiap seksyen.
- Empat SVG tempatan: ilmu, bacaan, warga dan portal. Grafik ilustrasi, bukan logo rasmi atau gambar rekod sebenar.
- Nama menu utama ialah pautan sebenar; butang anak panah berasingan membuka submenu. Hover tidak lagi membuka menu lalu menyebabkan klik menutupnya secara tidak sengaja.
- Submenu mempunyai satu sistem kedudukan dan breakpoint 1100px yang konsisten. Pada telefon panel boleh ditatal dan mengisi lebar menu.
- Halaman menu `/menu/?bahagian=...` bagi Akademik, HEM, Kokurikulum, Asrama, Info Sekolah dan Perkhidmatan. Kandungan halaman dan dropdown berkongsi konfigurasi `schoolMenuGroups` supaya pautan tidak bercanggah.
- Escape menutup submenu terlebih dahulu dan mengembalikan fokus ke anak panah. Escape seterusnya menutup menu telefon.

## Pengesahan

Semua browser tests menggunakan Chrome sebenar dengan headless false.

- `npm run build`: lulus 54 HTML, 127 laluan/aset, lint, kontrak keselamatan/migrasi dan 18 health checks baca sahaja.
- `html-validate menu/index.html`: lulus untuk halaman baharu yang belum tracked.
- ESLint terus untuk fail JavaScript baharu dan yang diubah: lulus.
- `node scripts/navigation-smoke.mjs`: semua 6 kumpulan × 4 lebar (390, 768, 1024, 1440); hover stabil, klik buka/tutup, papan kekunci, pautan submenu terakhir, halaman induk dan laluan overview lulus.
- `node scripts/makeover-smoke.mjs`: widget Portal Warga, kegemaran selepas reload, carian/penapis warga, 30 semakan reflow, menu telefon, reduced-motion dan kegagalan takwim simulasi lulus.
- `E2E_HEADLESS=0 npm run test:e2e`: 64 route/view checks serta keyboard, menu click, print dan PDF lulus.
- `git diff --check`: lulus.

Preview: `http://127.0.0.1:4173/`. Screenshot di `outputs/refinement/`.
