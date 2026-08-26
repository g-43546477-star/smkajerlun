# Audit Panel Admin - 24 Ogos 2026

## Skop

- `/admin/`: kandungan laman sekolah.
- `/pss/admin/`: kandungan dan operasi Portal PSS.
- `/tempahan/admin/`: rekod, statistik dan laporan tempahan.
- Paparan awam yang membaca kandungan daripada panel di atas.
- RLS, status data, audit log dan view awam berkaitan.

## Keputusan

- Kandungan sekolah dan PSS kini mempunyai destinasi `portal` yang berasingan.
- Panel sekolah mengurus staf, pengumuman, kandungan halaman, takwim, galeri,
  pencapaian, direktori, fail dan log perubahan.
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
- GitHub `main` berada pada commit `2a2adf9`.
- Deployment Vercel production `dpl_2a2dEjcdPTm3UeeycchAB7cHhrwU` berstatus
  `READY` dan menggunakan alias `smkajerlun.my`.

## Urutan Pelepasan Untuk Kemas Kini Seumpama Ini

Jangan jalankan fasa kedua sebelum aset laman yang sepadan berada di production.

1. Jalankan `20260826050012_admin_content_safety.sql`.
2. Jalankan `npm run verify` dan hentikan pelepasan jika ada ujian gagal.
3. Gabungkan perubahan melalui GitHub supaya Vercel melakukan deployment biasa.
4. Selepas deployment berjaya, jalankan
   `20260826050516_pss_seed_and_public_booking_view.sql`.
5. Jalankan `npm run health:check` dan smoke test terhadap domain live.
6. Semak semula Supabase Security dan Performance Advisors.

Fasa pertama hanya menyediakan skop kandungan, status, polisi admin dan audit.
Fasa kedua memindahkan kalendar PSS dan menukar view tempahan awam kepada
`security_invoker`; skrip live ketika itu sudah menggunakan klien anon khas untuk
paparan slot, termasuk apabila guru telah log masuk.

## Pengesahan Setakat Audit

- JavaScript lint: lulus.
- HTML validator: lulus; tiada advisory pada tiga panel admin.
- Pemeriksaan laluan dan aset tempatan: lulus.
- Smoke panel berakaun dengan data tiruan: lulus pada desktop dan mobile,
  termasuk satu pusingan menggunakan Google Chrome bertetingkap.
- Navigasi keyboard, fokus modal, teks suntikan, skop sekolah/PSS, pagination,
  cetakan dan PDF: lulus.
- Semakan production tanpa log masuk: ketiga-tiga panel menolak akses dengan betul.
- Health check semasa: 14 modul dan sekatan keselamatan lulus. Empat semakan
  pengumuman/takwim berasaskan `portal` berhenti dengan HTTP 400 kerana migrasi
  fasa pertama belum dijalankan, seperti yang dijangka.
- Smoke halaman awam turut berhenti pada empat pertanyaan skop yang sama. Ia
  mesti dijalankan semula selepas fasa pertama, sebelum deployment.

## Perkara Susulan

- Simpan/ubah/padam menggunakan akaun admin sebenar di production.
- Terdapat 52 advisory HTML lama pada halaman awam di luar tiga panel admin;
  validator tetap lulus dan panel admin tidak mempunyai advisory.
- Perlindungan kata laluan bocor perlu diaktifkan melalui tetapan Supabase Auth.
- Advisory prestasi lama di luar skop panel ini masih perlu ditangani berperingkat.
