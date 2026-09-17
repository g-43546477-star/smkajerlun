# Keluaran produksi — 16 September 2026

- Status: **READY**, domain produksi telah dialihkan kepada keluaran baharu.
- Domain: https://www.smkajerlun.my/
- Deployment: `dpl_GBcemZzXnELmg6Ljeattq7HABhWL`
- URL keluaran: https://smkajerlun-ojx4pbc9r-g-43546477-8060s-projects.vercel.app
- Keluaran terdahulu / sasaran rollback: `dpl_3wiB3B8K4b2MZdtb3So7gYBAHPXk`.
- Sumber: pakej terasing daripada canonical `1c6568c` bersama perubahan sesi ini; tiada commit atau push Git baharu dibuat.

## Skop

Hero pandangan atas dan 12 pautan SVG pada laman utama; tracker menggantikan kad NILAM dalam “Minggu ini di PSS”; responsif sekolah, PSS, tempahan dan tiga panel admin. Aset produksi sedia ada dikekalkan, termasuk dua imej artikel yang sudah live tetapi belum dijejak Git. Fail rahsia, draf, output ujian dan keadaan Supabase CLI tidak dimuat naik.

## Pengesahan

- Build canonical, pakej terasing dan Vercel lulus. Build Vercel: 20 saat.
- 66 semakan halaman/aliran Chrome sebelum deploy, termasuk papan kekunci dan PDF, lulus.
- 56 laluan awam live memulangkan HTTP 200 selepas pengalihan yang dijangka.
- 27 paparan Chrome sebenar pada 390, 820 dan 1440px lulus tanpa limpahan mendatar atau ralat JavaScript.
- Homepage: 12 pautan pantas; PSS: tracker di lokasi baharu dan statistik sebenar tersedia; admin tidak mendedahkan kandungan kepada pelawat tanpa log masuk.
- API tracker: HTTP 200, tujuh hari statistik tersedia.
- Manifest Vercel: semua 324 fail sumber sepadan dengan SHA-1 pakej keluaran; tiada ketidakpadanan.
- Carian log ralat untuk deployment baharu sepanjang 10 minit terakhir tidak memulangkan rekod. Ini bukan jaminan pemantauan berterusan.

Bukti mesin dan tangkapan skrin: `outputs/release-20260916/`.

## Nota liputan

Laporan awal lokal menyebut 57 laluan kerana sebuah draf HTML turut termasuk dalam penemuan fail. Liputan awam sebenar ialah 56 laluan; draf tersebut sengaja tidak diterbitkan dan 404 pada domain live adalah hasil yang betul. Penemuan laluan ujian lokal kini mengecualikan `docs/`. Pembetulan skrip ujian ini dibuat selepas deploy dan tidak mengubah laman runtime.

Safari/peranti iPad dan iPhone fizikal belum diuji. Ujian admin penuh menggunakan fixture lokal sebelum deploy; semakan live admin hanya mengesahkan perlindungan akses tanpa log masuk. Tiada rekod produksi diubah.
