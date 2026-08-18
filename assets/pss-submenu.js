(function () {
  var pages = {
    '/pss/digital/portal-ains/': {
      eyebrow: 'DIGITAL PSS', number: '01', title: 'Portal AINS', cardTitle: 'Perekodan NILAM melalui AINS',
      intro: 'Gunakan halaman PSS ini sebagai pintu masuk ke sistem perekodan bacaan AINS.',
      copy: 'AINS ialah portal rasmi KPM bagi urusan rekod bacaan NILAM, pengesahan buku dan sijil.',
      action: 'Buka Portal AINS', href: 'https://ains.moe.gov.my/login?returnUrl=/'
    },
    '/pss/perkhidmatan/tempahan-ruang/': {
      eyebrow: 'PERKHIDMATAN PSS', number: '01', title: 'Tempahan Ruang', cardTitle: 'Tempahan Ruang Khas Sekolah',
      intro: 'Semak kekosongan dan buat tempahan ruang melalui sistem rasmi sekolah.',
      copy: 'Pilih tarikh, ruang dan slot masa dalam sistem tempahan. Status penggunaan ruang boleh dirujuk dengan lebih teratur.',
      action: 'Buka Sistem Tempahan', href: '/tempahan/'
    },
    '/pss/perkhidmatan/cadangan-buku/': {
      eyebrow: 'PERKHIDMATAN PSS', number: '02', title: 'Cadangan Buku', cardTitle: 'Cadangkan Bahan Bacaan',
      intro: 'Bantu PSS membina koleksi yang dekat dengan keperluan pembaca sekolah.',
      copy: 'Kongsikan judul buku, penulis atau jenis bahan digital yang ingin ditambah ke koleksi Maktabah Darul Hikmah.',
      action: 'Hantar Cadangan Buku', href: 'mailto:kra4002@moe.edu.my?subject=Cadangan%20Buku%20PSS'
    }
  };
  var route = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/';
  var page = pages[route];
  if (!page) { location.replace('/pss/'); return; }

  document.title = page.title + ' | PSS SMK Agama Jerlun';
  document.getElementById('submenu-eyebrow').textContent = page.eyebrow;
  document.getElementById('submenu-number').textContent = page.number;
  document.getElementById('submenu-title').textContent = page.title;
  document.getElementById('submenu-card-title').textContent = page.cardTitle;
  document.getElementById('submenu-intro').textContent = page.intro;
  document.getElementById('submenu-card-copy').textContent = page.copy;
  var action = document.getElementById('submenu-action');
  action.textContent = page.action;
  action.href = page.href;
  if (page.href.indexOf('https://') === 0) { action.target = '_blank'; action.rel = 'noopener'; }
}());
