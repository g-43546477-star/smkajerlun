# Website sekolah — UI/UX Pro Max

Tarikh: 7 September 2026. Status: lokal, belum deploy.

## Arah visual

Asas daripada carian skill `government public institution university corporate editorial accessible`: Accessible & Ethical, palet navy, Lexend + Source Sans 3, navigasi jelas, fokus papan kekunci, sasaran sentuh 44px. Cadangan awal bertema pendidikan kanak-kanak tidak digunakan kerana laman ini mewakili institusi sekolah menengah secara rasmi.

Sistem warna menggunakan token semantik dalam `assets/school-public.css`. Hero menggabungkan misi sekolah dengan ilustrasi kampus yang sedia ada; grafik SVG navigasi dikekalkan. Halaman dalaman menggunakan hierarki tajuk dan bentuk kad yang konsisten. Perkhidmatan kekal sebagai satu direktori ringkas.

## Motion

`assets/school-motion.js` menggunakan Web Animations API: kemunculan kandungan dan pembukaan submenu, 280ms, transform/opacity sahaja. Kandungan tidak disembunyikan sebelum JavaScript berjalan. Animasi boleh dibatalkan apabila reduced motion diaktifkan. Tiada dependency animasi tambahan.

## Skop

CSS dan JS hanya dimuatkan oleh halaman awam website sekolah. Portal PSS, tempahan dan admin tidak menerima gaya baharu. Fail PSS dibandingkan dengan hash sebelum kerja dan kekal sama. Pembetulan sembilan paparan submenu daripada pusingan sebelumnya dikekalkan.

## Semakan

- `npm run build` lulus; lint khusus untuk `assets/school-motion.js` juga lulus.
- Sembilan paparan submenu diuji pada 1440/390/320px: panel khusus, refresh, Back, pautan aktif dan pilihan tidak sah.
- Enam kumpulan menu diuji pada empat saiz, termasuk papan kekunci dan redirect menu lama.
- Tujuh halaman diuji pada 1440×950, 375×812, 812×375, 768×1024 dan 1024×768. Tiada overflow atau ralat JavaScript.
- Reduced motion: tiada animasi berjalan. Ujian saiz akar teks 200% tidak menghasilkan overflow pada homepage; ini bukan audit kebolehcapaian menyeluruh.
- Bukti dan tangkapan skrin: `outputs/uipro/`.

Semua ujian pelayar menggunakan Google Chrome dengan tetingkap sebenar. Tiada deploy atau perubahan data.
