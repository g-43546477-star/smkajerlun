# App Tempahan Bilik Khas SMKAJ

## Semakan dan reka bentuk app, versi 2026.3

Diterbitkan ke domain sekolah: deployment `dpl_8KTm1BTQrAHmHyLRt2UE38n5hfbq`, Vercel READY. Build production lulus (56 HTML, 52 JavaScript, 145 laluan/aset, 22 entri migration). Ujian reka bentuk dan aturan jam diulang pada domain live dan lulus. Lima fail live dipadankan dengan source. Tiada git push dibuat. Gunakan skop eksplisit `g-43546477-8060s-projects` untuk CLI; cubaan tanpa skop menerima Not authorized walaupun whoami sah.

Paparan tempahan kini menggunakan gaya aplikasi tersendiri: navigasi bawah dengan ikon, borang dua langkah, jadual dengan pautan yang memilih bilik/tarikh/slot, kad rekod tempahan, paparan kata laluan dan status peranan yang jelas. Aturan 3 petang dan pengecualian pentadbir ditunjukkan pada skrin. Butang hantar dikunci sepanjang permintaan dihantar supaya penyegar jam tidak membolehkannya semula.

Pembetulan bukti semakan terdahulu: output SQL berbilang pernyataan hanya mengembalikan set hasil terakhir. Oleh itu, output yang tidak memaparkan trigger bukan bukti trigger telah hilang. Semakan satu query kini mengesahkan ketiga-tiga trigger sebenar aktif. Ujian INSERT menggunakan peranan authenticated dan identiti guru bukan admin pada jadual public.tempahan ditolak oleh aturan masa; transaksi di-rollback. Tiada rekod tempahan sebenar disimpan. Identiti akaun pada telefon pengguna belum diperiksa; status pentadbir tidak boleh diandaikan.

Ujian Chrome sebenar: 4 halaman pada 4 lebar dalam scripts/tempahan-app-review.mjs; 5 halaman pada 4 lebar dalam scripts/tempahan-pwa-smoke.mjs; borang dengan penghantaran dipintas dalam scripts/tempahan-pwa-flow.mjs; dan jam sebelum/tepat 15:00 serta tengah malam dalam scripts/tempahan-window-smoke.mjs. Semua lulus pada versi lokal. Paparan kad rekod dalam screenshot rekod-fixture.png menggunakan data ujian yang tidak dihantar ke server. Bukti visual dan keputusan di outputs/tempahan-app-review/.

Migration pembaikan lokal dipadankan dengan versi production 20260908043855. Tiada perubahan hak pentadbir atau aturan tarikh dibuat dalam reka bentuk ini.

Diterbitkan ke production pada 8 September 2026. Vercel READY: `dpl_AmUDfo5PciFdqvWggLXvBABLYrf5`. Tiada git push dibuat.

Pautan live: https://www.smkajerlun.my/tempahan/jadual/

Pakej deploy menggunakan asas `ccdfd3d` dengan perubahan direktori `tempahan/`. Suntingan halaman utama lokal yang lain tidak diterbitkan. Deployment sebelumnya untuk rollback: `https://smkajerlun-3f25l5fv8-g-43546477-8060s-projects.vercel.app` (gunakan `vercel rollback <url>` jika diperlukan).

## Guna dan pasang

App menggunakan halaman dan akaun guru sedia ada. Halaman mula app ialah `/tempahan/jadual/`; menu telefon menyediakan Jadual Bilik, Tempah Bilik dan Tempahan Saya. Penapis bilik pada telefon bermula dengan satu bilik dan boleh ditukar kepada semua bilik.

Buka sistem tempahan melalui HTTPS selepas diterbitkan. Android: Chrome → menu → Install app atau Add to Home screen. iPhone: Safari → Share → Add to Home Screen → Open as Web App jika ada → Add. Butang Pasang App memberikan arahan ini dan membuka dialog pemasangan browser apabila tersedia. Pemasangan tidak memerlukan akaun Play Store/App Store.

Rujukan: [Apple](https://support.apple.com/en-euro/guide/iphone/iphea86e5236/ios), [pemasangan PWA](https://web.dev/learn/pwa/installation/).

## Data dan sambungan

- Manifest, ikon dan service worker khusus kepada `/tempahan/`.
- Cache service worker hanya menyimpan halaman offline generik. Jadual, API dan butiran pengguna tidak disimpan dalam cache service worker.
- Tempahan memerlukan internet; tiada barisan penghantaran offline atau penghantaran automatik.
- Apabila API gagal atau telefon offline, borang tidak memaparkan slot sebagai kosong. Jadual dibersihkan apabila offline dan dimuatkan semula apabila sambungan pulih atau app kembali aktif.
- Permintaan kekosongan yang lebih lama tidak boleh menggantikan pilihan bilik/tarikh yang lebih baharu.
- Penapis Tempahan Saya digunakan pada pertanyaan sebelum had 200 rekod; kawalan akses pangkalan data sedia ada kekal.

## Pratonton dan bukti

Dari root projek:

```sh
python3 -m http.server 4183 --bind 127.0.0.1
```

Buka `http://127.0.0.1:4183/tempahan/jadual/` pada Mac. Alamat localhost ini bukan pautan pemasangan telefon. Pemasangan telefon memerlukan pelayan HTTPS yang boleh dicapai telefon.

```sh
npm run build
node scripts/tempahan-pwa-smoke.mjs
node scripts/tempahan-pwa-flow.mjs
```

Ujian menggunakan Chrome sebenar (headed). Bukti di `outputs/tempahan-pwa/`:

- 5 halaman × 4 lebar (320, 390, 430, 1280): tiada limpahan viewport.
- Manifest dibaca Chrome; Chrome dalam profil ujian biasa melaporkan tiada ralat kelayakan pemasangan.
- Dialog panduan, fokus keyboard, offline launch, pulih online dan kegagalan API lulus.
- Penghantaran tempahan dan penapis guru diuji melalui data simulasi; semua permintaan tulis ujian dipintas. Tiada tempahan sebenar dibuat.
- `npm run build` lulus, termasuk semakan keselamatan dan 18 modul kesihatan Supabase.

Ujian Chrome yang sama turut lulus pada domain production selepas deploy; 10 fail live dipadankan dengan pakej keluaran. Tiada uncaught JavaScript error dalam ujian live.

Belum disahkan: pemasangan pada telefon Android/iPhone fizikal, sesi log masuk guru sebenar dalam app yang dipasang, atau penghantaran tempahan produksi. Ujian viewport Chrome bukan ujian Safari iOS.

## Aturan tempahan harian (8 September 2026)

Setiap tarikh dibuka pada pukul 3:00 petang sehari sebelumnya, waktu Asia/Kuala_Lumpur. Contoh: Rabu dibuka Selasa 15:00; Khamis dibuka Rabu 15:00. Hari lusa tidak dibuka serentak selepas 15:00 hari ini. Tarikh lampau tidak boleh digunakan untuk tempahan baharu.

Migration production `20260908015618_enforce_booking_daily_window` menambah trigger untuk INSERT dan penukaran slot/tarikh/bilik atau pengaktifan semula. Pembatalan dan suntingan metadata tanpa pertukaran slot kekal dibenarkan. Pengecualian pentadbir sedia ada dikekalkan. Trigger menggunakan masa server; ubah jam telefon tidak boleh mengatasi sekatan server.

Butang Esok disegar setiap saat dan apabila app aktif semula, termasuk pertukaran hari pada tengah malam. Ujian Chrome jam simulasi (`scripts/tempahan-window-smoke.mjs`), tujuh sempadan masa SQL (`supabase/tests/booking_window.sql`), dan trigger pada jadual sementara dengan peranan authenticated lulus. Ujian jadual sementara di-rollback; tiada rekod tempahan sebenar diwujudkan.

Supabase security advisor tidak melaporkan isu fungsi/trigger baharu; amaran Auth sedia ada mengenai leaked-password protection disabled kekal (di luar perubahan aturan tempahan).

Keluaran pembetulan aturan: `dpl_GjeeFSSgvHV7Txe6b1RgEAHAMWA3` (production READY). Fail common, borang, senarai dan HTML tempahan telah dipadankan dengan domain live. Ujian Chrome jam simulasi pada domain live turut lulus sebelum/tepat 15:00 dan pada pertukaran hari.
