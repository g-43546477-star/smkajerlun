# Supabase Migration Baseline

Tarikh semakan: 1 September 2026
Project ref: `jykptknzasrrkvtxtvuk`

## Tujuan

Fail ini merekodkan sempadan sejarah migrasi yang telah disahkan pada project
Supabase production. Nama fail migrasi mesti mengekalkan version timestamp yang
dipaparkan oleh Supabase supaya semakan deploy dan rollback tidak bergantung
pada ingatan ejen. Manifest mesin yang digunakan oleh build berada di
`supabase/migration-baseline.txt`; ia sengaja tidak diletakkan di `docs/` kerana
Vercel mengecualikan dokumentasi daripada build.

## Sejarah Production Yang Disahkan

Production mempunyai migrasi berikut, dalam urutan ini:

```text
20260811022406_school_portal_features
20260811025226_remove_student_forms
20260811050503_add_pss_loan_requests
20260811051139_make_pss_loans_direct_records
20260812181736_add_clinic_kiosk_records
20260813083332_add_pss_book_suggestions
20260813084028_tighten_public_book_suggestion_policy
20260814101336_secure_clinic_kiosk_access
20260817171602_platform_hardening_reporting
20260817172408_gallery_admin_policy
20260817175951_lock_clinic_rpc_admin_only
20260821015542_drop_redundant_pautan_kad
20260826050012_admin_content_safety
20260826050516_pss_seed_and_public_booking_view
20260826062350_add_dynamic_achievement_articles
20260826162435_reconcile_admin_content_vocabulary
20260827222000_harden_identity_privacy_and_public_forms
20260827222132_minimize_function_privileges
20260901004735_reduce_policy_overlap_and_index_hardening
```

Migrasi bermula `20260814101336` hingga `20260901004735` mempunyai SQL yang
disimpan dalam `supabase/migrations/` repo ini. Empat fail lama yang pernah
menggunakan timestamp tempatan yang tidak sepadan telah dinamakan semula kepada
timestamp production yang disahkan; kandungannya tidak diubah.

Tujuh migrasi terawal (`20260811022406` hingga `20260813084028`) telah
dijalankan sebelum repo GitHub canonical diwujudkan. Sumber SQL asalnya tidak
berada dalam checkout ini dan tidak boleh direka semula dengan selamat daripada
API anon. Ia dianggap sebahagian daripada baseline production, bukan migrasi
yang boleh dipalsukan dengan fail SQL kosong.

## Pembaikan Keselamatan 1 September 2026

- Akaun guru baharu tidak lagi boleh mendaftar sendiri. Hanya rekod dalam
  `guru_pengguna` yang telah diluluskan boleh membuat atau mengubah tempahan;
  nama pemohon dipaksa daripada rekod yang disahkan.
- View tempahan awam hanya memaparkan slot yang telah ditempah. Nama, kelas,
  tujuan dan data pemohon tidak dihantar kepada pelayar awam.
- Cadangan buku dan rekod pinjaman PSS dihadkan mengikut alamat rangkaian;
  rekod kadar berada dalam schema `private` tanpa capaian terus daripada web.
- Audit pentadbir tidak lagi menyimpan nama, kelas, tujuan atau catatan peribadi
  bagi modul tempahan dan PSS, dan rekod lama melebihi setahun dibersihkan.
- `supabase/tests/security_contract.sql` ialah semakan transaksi yang perlu
  lulus selepas setiap migrasi keselamatan.

## Peraturan Perubahan

- Tambah setiap perubahan baharu sebagai fail SQL ber-version timestamp dalam
  `supabase/migrations/`.
- Gunakan nama version yang sama seperti yang dilaporkan Supabase.
- Jalankan migrasi melalui workflow Supabase yang digunakan oleh project,
  kemudian sahkan dengan `list_migrations`, `npm run health:check` dan
  `supabase/tests/security_contract.sql`.
- Jangan menggunakan `CASCADE` untuk membuang jadual atau polisi tanpa audit
  dependency yang jelas.
- Jika perlu bootstrap project baharu, ambil schema snapshot daripada
  production terlebih dahulu dan jadikan baseline itu input eksplisit. Jangan
  menganggap folder repo ini sahaja ialah dump penuh sejarah sebelum
  `20260814101336`.
