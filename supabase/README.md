# Supabase SMKAJ

Semua perubahan pangkalan data mesti berada dalam `supabase/migrations/` dan
menggunakan version yang sama seperti rekod migrasi production. Jangan jalankan
fail SQL longgar secara terus; fail bootstrap klinik dan cadangan buku lama telah
dibuang kerana ia boleh memintas kawalan keselamatan yang lebih baharu.

`migration-baseline.txt` menyenaraikan sejarah production. Tujuh version awal
yang tiada sumber asal ditandakan sebagai baseline warisan dalam dokumentasi,
manakala keselamatan keadaan semasa diuji oleh `supabase/tests/` dan migrasi
pengerasan selepas baseline.

Sebelum pelepasan:

1. Jalankan `npm run check:migrations` dan `npm run check:security`.
2. Uji fail dalam `supabase/tests/` pada database ujian atau branch Supabase.
3. Jalankan penasihat keselamatan selepas migrasi.
4. Sahkan bacaan awam, penolakan akses dan aliran admin sebelum deployment web.
