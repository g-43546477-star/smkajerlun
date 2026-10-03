# PWA seluruh laman SMKAJ

Status 3 Oktober 2026: sudah diterbitkan dan disahkan live di https://www.smkajerlun.my/. Deployment `dpl_BnC1RtnxjB2BYLvkPgh4uptsEQ1W` berstatus READY. Fail lokal kekal dalam `source-canonical`; tiada commit atau push dibuat dalam keluaran ini. Pratonton Mac: http://127.0.0.1:4183/. Pemasangan telefon sebenar memerlukan HTTPS yang boleh dicapai telefon; alamat localhost Mac bukan pautan pemasangan telefon.

## Pengalaman pengguna

- Satu aplikasi SMKAJ bermula pada laman utama dan meliputi semua laluan pada domain sekolah: sekolah, PSS, Tempahan, Portal Warga, Klinik, pentadbir dan log masuk bersama.
- Butang **Pasang App** menyediakan dialog pemasangan Android/Chrome dan iPhone/Safari; Chrome menggunakan prompt pemasangan apabila tersedia. Pemasangan daripada pelayar tidak melalui App Store atau Play Store.
- App yang dibuka dalam mod standalone menyembunyikan tawaran pemasangan dan menyediakan **Kembali** serta **Laman Utama**. Navigasi Tempahan yang sedia ada dikekalkan.
- Internet masih diperlukan untuk data terkini, pengesahan akaun dan penghantaran borang. Offline memaparkan panduan generik; **Cuba Semula** memuatkan semula laluan asal, termasuk query dan hash.
- Jika worker baharu menunggu, butang **Kemas kini app** meminta pengguna menyelesaikan borang sebelum memuat semula. Tiada reload automatik pada borang ketika worker baharu siap.
- Pautan luar seperti AINS dan perkhidmatan pihak ketiga kekal sebagai laman luar.

## Fail dan aturan penyelenggaraan

- `manifest.json`: identiti `/`, skop `/`, ikon 192/512 dan pintasan PSS, Tempahan, Portal Warga serta log masuk. `assets/pwa-icons/` menyalin ikon logo sekolah sedia ada tanpa mengubah grafik.
- Semua 56 dokumen HTML aplikasi sedia ada menggunakan metadata, ikon iOS, `assets/pwa.css` dan `assets/pwa.js` bersama. Halaman offline lama Tempahan sengaja kekal kendiri untuk pengguna worker lama.
- `sw.js`: worker skop seluruh domain; cache `smkaj-school-pwa-v1` hanya mengandungi `/offline/` dan `/assets/pwa-offline.js`. Tiada cache halaman akaun, rekod murid, Klinik, tempahan, API atau sesi. API, permintaan bukan GET dan origin luar tidak dipintas. Respons HTTP 401/403/404/500 kekal respons asal; fallback hanya untuk kegagalan rangkaian navigasi.
- `offline/index.html`: halaman generik kendiri dengan CSS inline; skrip percubaan semula disediakan melalui cache khusus.
- Worker lama `/tempahan/sw.js` hanya dinyahdaftar selepas worker root aktif. Identiti, ikon dan start URL manifest Tempahan lama dikekalkan, dengan skop diperluas ke `/`. Cache offline generik lama tidak dipadam secara agresif kerana tab lama mungkin masih menggunakannya. Pemasangan baharu dari semua halaman menggunakan identiti SMKAJ.
- Perubahan metadata untuk ikon aplikasi yang sudah dipasang bergantung pada pelayar/peranti. Pengguna boleh memasang SMKAJ dari laman utama jika ikon lama masih berlabel Tempahan.
- `tempahan/assets/app.js`: pemasangan dan pendaftaran worker dipindahkan ke komponen bersama; menu, aturan tempahan dan kawalan offline sedia ada dikekalkan. Versi rujukan skrip dinaikkan ke `20261003-1`.
- `vercel.json`: worker dan manifest menggunakan `Cache-Control: no-cache`; manifest menggunakan MIME `application/manifest+json`.
- `scripts/project-files.mjs`: pemeriksaan turut memasukkan fail baharu yang belum tracked, sambil menghormati `.gitignore`. Ini memastikan worker, skrip PWA dan halaman offline baharu diperiksa sebelum commit.
- Naikkan versi cache worker apabila mengubah kandungan offline yang perlu dipasang semula. Naikkan query versi aset HTML apabila mengubah JS/CSS aplikasi.

## Pengesahan lokal

Lulus:

- `E2E_HEADLESS=0 npm run verify`: lint 58 JavaScript, validasi 58 HTML, 163 laluan/aset, kontrak keselamatan, pemeriksaan kesihatan baca sahaja, 66 semakan route/view, navigasi sekolah, homepage, pentadbir, log masuk bersama dan interface 20 laluan × 3 lebar.
- `node scripts/tempahan-pwa-smoke.mjs`: 5 laluan × 4 lebar, dialog/fokus, cache generik, offline menyembunyikan kekosongan dan mengunci penghantaran, pulih online serta API gagal tidak dianggap slot kosong. Semakan dikemas kini bagi redirect log masuk bersama dan worker root.
- `node scripts/tempahan-pwa-flow.mjs`: aliran tempahan dengan data simulasi, penghantaran dipintas, penapis Tempahan Saya, kegagalan API, prompt pemasangan simulasi dan kelayakan pemasangan Chrome. Tiada tempahan sebenar dihantar.
- Chrome dengan profil ujian biasa: `Page.getAppManifest.errors = []`, `Page.getInstallabilityErrors.installabilityErrors = []`. Profil incognito ditolak oleh Chrome seperti dijangka; profil biasa digunakan untuk semakan akhir.
- Playwright CLI dalam Chrome: 6 permukaan utama pada lebar 320/390/820/1440 tanpa limpahan, satu butang pemasangan, manifest bersama, dialog dengan fokus terkawal dan Escape, fallback offline pada 5 laluan, query/hash terpelihara dan pulih ke laluan Klinik asal. Tiada exception JavaScript halaman.
- Worker Tempahan lama dipasang dahulu dalam konteks ujian, kemudian berjaya berpindah kepada worker root. Mod standalone iOS disimulasikan untuk menguji butang pemasangan tersembunyi, toolbar dan butang Kembali.
- Pelayan ujian terpencil port 4184 membekalkan dua versi worker: input borang kekal semasa kemas kini menunggu; klik kemas kini mengaktifkan worker baharu; hanya cache sekolah lama dibuang, cache lain dikekalkan.
- Screenshot homepage, panduan pemasangan, offline dan mod standalone disemak secara visual. Bukti dan skrip semakan CLI ada di `output/playwright/`; bukti Tempahan di `outputs/tempahan-pwa/`.

Belum disahkan: pemasangan pada telefon Android/iPhone fizikal, Safari iOS sebenar, log masuk akaun guru sebenar dalam aplikasi terpasang. Simulasi standalone dan viewport Chrome bukan ujian telefon fizikal.

## Membuka pratonton semula

```sh
node --input-type=module -e 'import {startStaticServer} from "./scripts/static-server.mjs"; const {url}=await startStaticServer(4183); console.log(url)'
```

Jalankan dari direktori `source-canonical`, kemudian buka http://127.0.0.1:4183/.

## Keluaran production 3 Oktober 2026

- Asas rollback: `dpl_Da3ivUGoSVv2oxfWqBSe7TEd6azD` / `https://smkajerlun-qmxl8wjsi-g-43546477-8060s-projects.vercel.app`.
- 337 fail asas production disahkan menggunakan hash manifest Vercel sebelum menerapkan perubahan. Sembilan fail metadata `supabase/.temp/` dikecualikan; `.vercelignore` kini menghalang metadata ini daripada deployment seterusnya.
- Pakej terpencil mengandungi 345 fail, dengan 71 fail baharu/berubah yang diluluskan. Manifest source deployment sepadan 345/345 hash dengan pakej yang disemak.
- Build lokal pakej dan build Vercel lulus. Audit dependency runtime (`npm audit --omit=dev`) melaporkan 0 kerentanan.
- Deployment dibina dengan `--prod --skip-domain`, worker dan halaman offline diperiksa, kemudian dipromosikan ke kedua-dua domain sekolah. `vercel alias ls` mengesahkan `www.smkajerlun.my` dan `smkajerlun.my` menunjuk ke `smkajerlun-77iaxrll5-g-43546477-8060s-projects.vercel.app`. Medan aliases pada `vercel inspect` selepas promotion hanya memaparkan alias projek, jadi pemetaan domain disahkan melalui senarai alias dan kandungan HTTP live.
- 67 fail public berubah diperiksa: 51 padanan byte live dan 16 redirect yang tiba pada HTTP 200. Header worker/manifest, API pelawat, domain tanpa www dan sekatan `/scripts/` serta `/supabase/` lulus.
- Chrome profil biasa pada domain live: manifest tiada ralat, kelayakan pemasangan tiada ralat, worker root aktif.
- Ujian live Tempahan: 5 laluan × 4 lebar; borang dikunci ketika offline, tiada kekosongan palsu apabila API gagal, pemulihan online lulus.
- Semakan live PWA: 6 permukaan × 4 lebar, panduan pemasangan/fokus papan kekunci, offline untuk 5 laluan dan pemulihan URL asal lulus. Cache hanya mengandungi panduan offline generik.
- `BASE_URL=https://www.smkajerlun.my E2E_HEADLESS=0 npm run test:interface` lulus untuk 20 laluan × 3 lebar. Tiada tempahan atau rekod Klinik sebenar diwujudkan oleh ujian.
- Semakan log error Vercel bagi deployment ini dalam tetingkap 15 minit selepas keluaran tidak memulangkan entri.
- Bukti penuh: `outputs/pwa-release-20261003/`. Pemasangan telefon fizikal dan log masuk akaun guru sebenar masih belum disahkan.

Rollback jika diperlukan:

```sh
vercel rollback smkajerlun-qmxl8wjsi-g-43546477-8060s-projects.vercel.app --scope g-43546477-8060s-projects
```

Rollback kod laman tidak menyahpasang PWA pada telefon yang sudah memasangnya. Worker root hanya menyimpan panduan offline dan memuatkan halaman secara rangkaian; halaman online akan menggunakan keluaran yang diaktifkan pada domain.
