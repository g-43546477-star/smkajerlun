# Semakan responsif seluruh laman — 16 September 2026

Status: keluaran produksi diterbitkan pada 16 September 2026. Tiada perubahan rekod pangkalan data. Lihat `deployment-2026-09-16.md` untuk bukti keluaran.

## Perubahan

- `assets/responsive.css` dikongsi oleh 39 halaman aktif. Laluan pengalihan menggunakan halaman destinasinya; halaman offline kekal kendiri supaya boleh dibuka tanpa rangkaian.
- Borang menggunakan teks sekurang-kurangnya 16px; butang dan kawalan menu mempunyai sasaran sentuhan sekurang-kurangnya 44px.
- Ruang tempahan melebar sehingga 1120px dan panel admin sehingga 1440px. Pada tablet/telefon, penapis, grid dan borang disusun semula mengikut ruang.
- Paparan PSS pada tablet menggunakan dua lajur untuk kad, dengan widget pelawat di bawah dua kad “Minggu ini di PSS”. Pada desktop, tracker berada di lajur ketiga menggantikan NILAM, seperti diminta.
- Jadual panjang menatal dalam kawasan sendiri. Kawasan jadual boleh difokuskan dengan papan kekunci dan mempunyai nama untuk pembaca skrin.
- Dialog menggunakan had tinggi viewport dinamik; paparan melintang tidak dikunci oleh header melekat. CSS baharu hanya terpakai pada skrin supaya cetakan sedia ada terpelihara.
- Hero serta pautan pantas laman utama daripada perubahan terdahulu dikekalkan.

## Bukti ujian

Semua ujian browser menggunakan Google Chrome sebenar dengan `headless: false`.

| Semakan | Liputan | Hasil |
| --- | --- | --- |
| Semua laluan awam / keadaan belum log masuk | 56 laluan awam × 7 lebar: 320, 390, 768, 820, 1024, 1366, 1920px | 392 paparan, tiada limpahan halaman, medan kecil atau ralat JavaScript |
| Admin sekolah, PSS dan tempahan | 133 keadaan tab/editor pada 7 lebar | Lulus menggunakan fixture lokal |
| Admin melintang | 19 keadaan pada 844 × 390px | Lulus |
| Menu sekolah | 6 kumpulan × 4 lebar | Buka/tutup, papan kekunci dan destinasi pautan lulus |
| Menu PSS | 23 laluan pada 360, 430, 768px | Menu boleh ditatal dan pautan terakhir tidak terlindung |
| Menegak / melintang | 20 paparan sekolah, PSS dan tempahan | Lulus |
| Tempahan | Pautan jadual, pilihan bilik/tarikh/slot, validasi, langkah borang, dialog pemasangan, paparan kata laluan, rekod dan dialog ubah | Lulus; tiada penghantaran tempahan sebenar |
| Regresi admin | Skop sekolah/PSS, borang, papan kekunci, paparan teks tidak dipercayai, laporan PDF | Lulus dengan data ujian dalam memori |
| Build | Lint JS, HTML, laluan/aset, manifest migrasi, kontrak keselamatan dan health check baca sahaja | Lulus |

Matriks akhir: `outputs/responsive/final.json` menggabungkan semakan penuh dengan ujian semula kes yang diperbetulkan. Bukti admin: `admin-final.json` dan `admin-landscape.json`. Tangkapan skrin berada dalam direktori yang sama.

## Had pengesahan

- Saiz iPad, tablet dan telefon disimulasikan melalui viewport Chrome. Safari pada iPad/iPhone fizikal dan pemasangan PWA pada peranti sebenar belum diuji.
- Admin diuji menggunakan fixture lokal; ujian ini tidak membuktikan sesi akaun produksi tertentu.
- Tracker lokal sengaja tidak menulis lawatan sebenar. Grafik dan negara diuji menggunakan data ujian.

## Pratonton

- Sekolah: http://127.0.0.1:4173/
- Portal PSS: http://127.0.0.1:4173/pss/
- Tempahan: http://127.0.0.1:4173/tempahan/
- Admin sekolah: http://127.0.0.1:4173/admin/

Jalankan semula `node scripts/responsive-review.mjs`, `node scripts/responsive-admin-review.mjs` dan `node scripts/responsive-interactions.mjs` untuk mengulangi semakan susun atur dalam Chrome.
