# Audit Panel Admin - 24 Ogos 2026 (kemas kini 27 Ogos 2026)

## Skop

- `/admin/`: kandungan laman sekolah.
- `/pss/admin/`: kandungan dan operasi Portal PSS.
- `/tempahan/admin/`: rekod, statistik dan laporan tempahan.
- Paparan awam yang membaca kandungan daripada panel di atas.
- RLS, status data, audit log dan view awam berkaitan.

## Keputusan

- Kandungan sekolah dan PSS kini mempunyai destinasi `portal` yang berasingan.
- Panel sekolah mengurus staf, pengumuman, kandungan halaman, takwim,
  pencapaian program sekolah, direktori, fail dan log perubahan. Modul galeri
  aktiviti yang tidak lagi digunakan telah dibuang.
- Panel PSS mengurus pengumuman PSS, kalendar PSS, pinjaman, katalog, cadangan,
  NILAM dan log perubahan.
- Panel tempahan memuatkan semua halaman rekod, bukan keputusan separa yang
  kelihatan lengkap. Eksport CSV dilindungi daripada formula spreadsheet.
- Semua data pangkalan dipaparkan sebagai teks, bukan HTML yang boleh dijalankan.
- Dialog mempunyai fokus awal, perangkap fokus, Escape, pulangan fokus dan
  pengesahan apabila perubahan belum disimpan.
- Editor kandungan menyediakan contoh format dan pratonton struktur.
- Status buku mengekalkan `Rujukan` serta menyokong `Tersedia`, `Dipinjam`,
  `Hilang`, `Rosak` dan `Dipulangkan`.
- Pustaka Supabase dikunci pada versi `2.57.4`; aset CMS dan tempahan mempunyai
  versi cache yang seragam.

## Pelepasan 26 Ogos 2026

- Migrasi `20260826050012_admin_content_safety.sql` telah berjaya digunakan.
- Migrasi `20260826050516_pss_seed_and_public_booking_view.sql` telah berjaya
  digunakan selepas aset laman berada di production.
- Deployment sebelum audit ini telah menggunakan alias `smkajerlun.my`.

## Pembaikan Audit 27 Ogos 2026

- `/pss/` dan `/tempahan/` menjadi laluan rasmi. Laluan lama yang bertindan
  kini hanya mengalihkan pengguna kepada laluan kanonik.
- Artikel program sekolah kini menggunakan `achievement.kategori = 'sekolah'`
  dan dipaparkan di laman utama serta `/program/`. Pencapaian kokurikulum
  tidak lagi menjadi submenu kosong.
- `gallery_item` dan aset PNG PSS yang tidak digunakan telah dinyahaktifkan;
  imej artikel yang berkaitan dipelihara melalui `achievement.image_url`.
- Constraint kandungan admin diselaraskan dengan pilihan dalam panel untuk
  pencapaian, kandungan halaman, direktori dan fail sumber.
- HTML validator kini memblokir semua mesej severity error; semua 53 halaman
  semasa lulus tanpa advisory.
- Smoke test menyemak redirect legacy, menu, katalog, artikel program, cetak
  dan PDF. GitHub Actions menjalankan set pengesahan yang sama pada push dan
  pull request.

## Urutan Pelepasan Untuk Kemas Kini Seumpama Ini

Pastikan migrasi dan aset laman melalui workflow GitHub/Vercel yang sama.

1. Jalankan migrasi baharu melalui Supabase migration workflow.
2. Jalankan `npm run verify` dan hentikan pelepasan jika ada ujian gagal.
3. Gabungkan perubahan melalui GitHub supaya Vercel melakukan deployment biasa.
4. Jalankan `npm run health:check` dan smoke test terhadap domain live.
5. Semak semula data artikel dan constraint panel selepas deployment.

Fasa pertama hanya menyediakan skop kandungan, status, polisi admin dan audit.
Fasa kedua memindahkan kalendar PSS dan menukar view tempahan awam kepada
`security_invoker`; skrip live ketika itu sudah menggunakan klien anon khas untuk
paparan slot, termasuk apabila guru telah log masuk.

## Pengesahan Setakat Audit

- JavaScript lint: lulus.
- HTML validator: lulus; 53 halaman dan 0 advisory.
- Pemeriksaan laluan dan aset tempatan: lulus.
- Smoke panel berakaun dengan data tiruan: lulus pada desktop dan mobile,
  termasuk satu pusingan menggunakan Google Chrome bertetingkap.
- Navigasi keyboard, fokus modal, teks suntikan, skop sekolah/PSS, pagination,
  cetakan dan PDF: lulus.
- Semakan production tanpa log masuk: ketiga-tiga panel menolak akses dengan betul.
- Health check semasa: semua modul utama dan sekatan keselamatan lulus selepas
  migrasi vocabulary kandungan digunakan.
- Smoke halaman awam: route kanonik, redirect legacy, responsif, menu hover,
  keyboard, cetak dan PDF lulus.

## Skop Yang Dikekalkan

- Pendaftaran guru terbuka dikekalkan seperti keadaan sedia ada; tiada
  perubahan dibuat pada tetapan Auth.
- Supabase Security dan Performance Advisors tidak diubah dalam audit ini.
- Simpan/ubah/padam menggunakan akaun admin sebenar di production masih perlu
  disahkan oleh pemilik sistem selepas deployment.
