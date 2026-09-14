# Tracker pelawat PSS
Diterbitkan ke production pada 10 September 2026.
URL: https://www.smkajerlun.my/pss/
Deployment: dpl_3wiB3B8K4b2MZdtb3So7gYBAHPXk (READY).
Migrasi production: 20260910101700_pss_visitor_tracker.
Rahsia server dikonfigurasi dalam Vercel production.
Pakej terpencil: /tmp/pss-visitor-release-20260910, berasaskan pakej live
/tmp/pss-mobile-release-20260910; 249 fail asas sepadan, 16 laluan redirect.
Tiada git push dibuat. Suntingan lokal yang lain tidak dimasukkan.
Rollback laman: vercel rollback smkajerlun-cig61siuw-g-43546477-8060s-projects.vercel.app
Jadual tambahan boleh dibiarkan semasa rollback tanpa menjejaskan modul sedia ada.

Ujian live Chrome sebenar: desktop 1440 dan mudah alih 390, POST 204, GET 200,
Malaysia dipaparkan, refresh tidak menggandakan kiraan, tujuh bar SVG,
tiada overflow atau ralat JavaScript. Halaman utama, tempahan dan katalog HTTP 200.
Semakan log error deployment selama 15 minit: tiada log ditemui.
Kiraan awal termasuk lawatan pengesahan dari rangkaian Malaysia.
Bukti: outputs/pss-visitors/live-report.json dan live-390.png / live-1440.png.

Paparan di /pss/; halaman PSS awam menghantar satu permintaan lawatan apabila dibuka.
Halaman admin dikecualikan. Graf SVG dan negara menunjukkan tujuh hari waktu Malaysia.
Kiraan ialah anggaran alamat rangkaian unik sehari, bukan individu unik. Jumlah terkumpul
ialah jumlah kiraan harian sejak pengaktifan. VPN dan rangkaian sekolah berkongsi IP
mempengaruhi ketepatan. Bot biasa ditapis; ini bukan sistem anti-penipuan.
Do Not Track dan Global Privacy Control dihormati.

## Konfigurasi deployment
- Gunakan migrasi 20260910101700_pss_visitor_tracker.sql selepas semakan migrasi tertunggak.
- Tetapkan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY dan PSS_VISITOR_SALT (rahsia rawak
  sekurang-kurangnya 32 bait) dalam persekitaran server Vercel production sahaja.
  Jangan letakkan service-role key atau salt dalam assets atau HTML.
- Deploy endpoint /api/pss-visitors bersama halaman dan aset.
- Sahkan POST 204, GET 200, refresh tidak menambah kiraan hari sama, negara rangkaian
  sebenar, dan akses anon/authenticated ke jadual serta RPC ditolak.
- Vercel mesti menerima trafik secara langsung supaya x-real-ip dan x-vercel-ip-country
  ialah metadata platform yang dipercayai. Reverse proxy memerlukan semakan semula.
- WAF/rate limiting pada endpoint boleh ditetapkan sebelum trafik awam tinggi.

Hanya HMAC berasaskan tarikh dan IP disimpan untuk nyahpendua. Token hari sebelumnya
dipadam pada lawatan berikutnya; agregat harian/negara dikekalkan. Tiada cookie atau
localStorage. Payload awam hanya agregat, tiada token atau IP. Tiada data contoh dalam
kod produksi. Localhost dan Vercel preview tidak merekod lawatan.

## Semakan
npm run build
node scripts/pss-visitors-review.mjs

Ujian Chrome sebenar menggunakan respons ujian terkawal (bukan statistik sebenar).
Imej fixture-390.png dan fixture-1440.png di outputs/pss-visitors ialah contoh ujian.
