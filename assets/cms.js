// ===== CMS SMKAJ — renderer kandungan awam (dibaca dari Supabase) =====
(function () {
  const CMS_URL = 'https://jykptknzasrrkvtxtvuk.supabase.co';
  const CMS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5a3B0a256YXNycmt2dHh0dnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyNzU4MzUsImV4cCI6MjEwMTg1MTgzNX0.xFFOrAUcFDChpfXT7Wc5BWa7gWfHydQwOnSZtKgVoqY';
  const cmsClient = window.supabase.createClient(CMS_URL, CMS_KEY);
  window.cms = cmsClient;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  window.cmsEsc = esc;

  function parsePanitiaGroups(text) {
    const groups = [];
    (text || '').split(/\n\s*\n/).forEach(function (blok) {
      const lines = blok.trim().split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      let bidang = '', penyelaras = '', penyelarasLabel = 'Penyelaras', kpList = [];
      lines.forEach(function (line) {
        if (line.indexOf('BIDANG:') === 0) bidang = line.slice(7).trim();
        else if (line.indexOf('GURU KANAN:') === 0) { penyelaras = line.slice(11).trim(); penyelarasLabel = 'Guru Kanan'; }
        else if (line.indexOf('PENYELARAS:') === 0) { penyelaras = line.slice(11).trim(); }
        else if (line.indexOf('KP:') === 0) {
          const rest = line.slice(3).trim(), idx = rest.indexOf('::');
          if (idx >= 0) kpList.push([rest.slice(0, idx).trim(), rest.slice(idx + 2).trim()]);
        }
      });
      if (bidang || penyelaras || kpList.length) groups.push({ bidang: bidang, penyelaras: penyelaras, penyelarasLabel: penyelarasLabel, kpList: kpList });
    });
    return groups;
  }

  function panitiaGroupHtml(group, compact) {
    let html = compact && group.bidang ? '<h4>' + esc(group.bidang) + '</h4>' : '';
    if (group.penyelaras) html += '<p class="gk">' + esc(group.penyelarasLabel) + ': <strong>' + esc(group.penyelaras) + '</strong></p>';
    if (group.kpList.length) html += '<ul class="kp-list">' + group.kpList.map(function (kp) {
      return '<li><b>' + esc(kp[0]) + '</b><span>' + esc(kp[1]) + '</span></li>';
    }).join('') + '</ul>';
    return html;
  }

  function blockBody(b) {
    const wrap = document.createElement('div');
    const text = b.kandungan || '';
    if (b.jenis === 'paragraf') {
      text.split(/\n\s*\n/).forEach(function (para) {
        if (!para.trim()) return;
        const p = document.createElement('p');
        p.innerHTML = esc(para.trim()).replace(/\n/g, '<br>');
        wrap.appendChild(p);
      });
    } else if (b.jenis === 'senarai_ol' || b.jenis === 'senarai_ul') {
      const list = document.createElement(b.jenis === 'senarai_ol' ? 'ol' : 'ul');
      text.split('\n').forEach(function (line) {
        line = line.trim();
        if (!line) return;
        const li = document.createElement('li');
        li.innerHTML = esc(line);
        list.appendChild(li);
      });
      wrap.appendChild(list);
    } else if (b.jenis === 'definisi') {
      const dl = document.createElement('dl');
      dl.className = 'profil-dl';
      text.split('\n').forEach(function (line) {
        const idx = line.indexOf('::');
        if (idx < 0) return;
        const dt = document.createElement('dt'); dt.textContent = line.slice(0, idx).trim();
        const dd = document.createElement('dd'); dd.textContent = line.slice(idx + 2).trim();
        dl.appendChild(dt); dl.appendChild(dd);
      });
      wrap.appendChild(dl);
    } else if (b.jenis === 'panitia') {
      const grid = document.createElement('div');
      grid.className = 'panitia-grid';
      parsePanitiaGroups(text).forEach(function (group) {
        const card = document.createElement('div');
        card.className = 'panitia-bidang';
        card.innerHTML = panitiaGroupHtml(group, true);
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
    }
    return wrap;
  }

  function renderBlocks(rows, mount) {
    mount.innerHTML = '';
    if (!rows.length) return;
    let card = null, lastTajuk = null, first = true;
    rows.forEach(function (b) {
      if (b.tajuk !== lastTajuk || first) {
        card = document.createElement('div');
        card.className = 'content-card';
        if (b.tajuk) { const h = document.createElement('h3'); h.textContent = b.tajuk; card.appendChild(h); }
        mount.appendChild(card);
        lastTajuk = b.tajuk;
        first = false;
      }
      card.appendChild(blockBody(b));
    });
  }

  // Muatkan blok kandungan (paragraf/senarai/definisi) bagi satu laman ke dalam mount
  window.cmsLoadPage = async function (laman, mountId, options) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    const { data, error } = await cmsClient.from('content_block').select('*')
      .eq('laman', laman).neq('jenis', 'lagu').order('susunan');
    if (error || !data) return;
    const excluded = (options && options.excludeTitles) || [];
    renderBlocks(data.filter(function (row) { return excluded.indexOf(row.tajuk) === -1; }), mount);
  };

  window.cmsLoadKokurikulum = async function () {
    const { data, error } = await cmsClient.from('content_block').select('*').eq('laman', 'kokurikulum').order('susunan');
    if (error || !data) return;
    const targets = {
      'Unit Beruniform': document.getElementById('koku-uniform'),
      'Kelab & Persatuan': document.getElementById('koku-persatuan'),
      'Sukan & Permainan': document.getElementById('koku-permainan')
    };
    const seen = {};
    Object.keys(targets).forEach(function (key) { if (targets[key]) targets[key].innerHTML = ''; });
    data.filter(function (row) { return row.jenis === 'panitia'; }).forEach(function (row) {
      parsePanitiaGroups(row.kandungan).forEach(function (group) {
        if (!group.bidang && /sukan\s*&\s*permainan/i.test(row.tajuk || '')) group.bidang = 'Sukan & Permainan';
        if (!group.bidang && /kelab\s*&\s*persatuan/i.test(row.tajuk || '')) group.bidang = 'Kelab & Persatuan';
        if (!group.bidang && /unit\s+beruniform/i.test(row.tajuk || '')) group.bidang = 'Unit Beruniform';
        const mount = targets[group.bidang];
        if (!mount) return;
        const signature = group.bidang + '|' + group.penyelaras + '|' + group.kpList.map(function (item) { return item.join(':'); }).join('|');
        if (seen[signature]) return;
        seen[signature] = true;
        const card = document.createElement('article');
        card.className = 'koku-unit-card';
        card.innerHTML = panitiaGroupHtml(group, false);
        mount.appendChild(card);
      });
    });
  };

  // Muatkan blok jenis 'lagu' bagi satu laman ke dalam mount (kad plum berasingan)
  window.cmsLoadLagu = async function (laman, mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    const { data, error } = await cmsClient.from('content_block').select('*')
      .eq('laman', laman).eq('jenis', 'lagu').order('susunan');
    mount.innerHTML = '';
    if (error || !data) return;
    data.forEach(function (block) {
      const card = document.createElement('div');
      card.className = 'lagu-card';
      if (block.tajuk) { const h = document.createElement('h3'); h.textContent = block.tajuk; card.appendChild(h); }
      (block.kandungan || '').split(/\n\s*\n/).forEach(function (verse) {
        verse = verse.trim();
        if (!verse) return;
        if (verse.indexOf('ARAB:') === 0) {
          const p = document.createElement('p'); p.className = 'arab';
          p.textContent = verse.slice(5).trim();
          card.appendChild(p);
        } else {
          let lines = verse.split('\n');
          let korus = false;
          if (lines[0] && lines[0].trim().toUpperCase() === 'KORUS:') { korus = true; lines = lines.slice(1); }
          const p = document.createElement('p');
          p.className = 'bait' + (korus ? ' korus' : '');
          p.innerHTML = lines.map(esc).join('<br>');
          card.appendChild(p);
        }
      });
      mount.appendChild(card);
    });
  };

  // Muatkan senarai pengumuman ke dalam mount (#notis-list)
  window.cmsLoadPengumuman = async function (mountId, options) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    const portal = options && options.portal ? options.portal : 'sekolah';
    const { data, error } = await cmsClient.from('pengumuman').select('*')
      .eq('portal', portal)
      .order('tarikh', { ascending: false }).order('id', { ascending: false }).limit(20);
    mount.innerHTML = '';
    if (error || !data || !data.length) {
      mount.innerHTML = '<div class="notis-item"><div><p>Tiada pengumuman buat masa ini.</p></div></div>';
      return;
    }
    const bulanNama = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
    data.forEach(function (n) {
      const item = document.createElement('div'); item.className = 'notis-item';
      const parts = (n.tarikh || '').split('-');
      const dateEl = document.createElement('div'); dateEl.className = 'notis-date';
      if (parts.length === 3) {
        dateEl.textContent = parts[2] + ' ' + (bulanNama[parseInt(parts[1], 10) - 1] || '');
      }
      const body = document.createElement('div');
      const h4 = document.createElement('h4'); h4.textContent = n.tajuk;
      const p = document.createElement('p'); p.textContent = n.kandungan || '';
      body.appendChild(h4); body.appendChild(p);
      item.appendChild(dateEl); item.appendChild(body);
      mount.appendChild(item);
    });
  };

  // Artikel program sekolah dipaparkan sebagai kad editorial yang boleh dibuka ke artikel penuh.
  window.cmsLoadProgramArticles = async function (mountId, options) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    options = options || {};
    const limit = options.limit || 6;
    const achievementResponse = await cmsClient.from('achievement').select('*')
      .eq('kategori', 'sekolah')
      .order('tarikh', { ascending: false }).order('susunan').limit(limit);
    const rows = achievementResponse.error ? [] : (achievementResponse.data || []);
    mount.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'achievement-empty';
      empty.textContent = options.emptyText || 'Belum ada program sekolah untuk dipaparkan.';
      mount.appendChild(empty);
      return;
    }
    const monthNames = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
    function safeInternalUrl(value, fallback) {
      const raw = String(value || '').trim();
      if (!raw) return fallback;
      try {
        const parsed = new URL(raw, window.location.origin);
        if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.origin === window.location.origin) return parsed.href;
      } catch (error) { /* invalid CMS link */ }
      return fallback;
    }
    function formatDate(value) {
      const parts = String(value || '').split('-').map(Number);
      return parts.length === 3 && parts[0] && monthNames[parts[1] - 1] ? parts[2] + ' ' + monthNames[parts[1] - 1] + ' ' + parts[0] : '';
    }
    rows.forEach(function (row) {
      const title = String(row.tajuk || 'Program Sekolah SMKA Jerlun').trim();
      const articleHref = row.slug
        ? '/program/?slug=' + encodeURIComponent(String(row.slug).trim())
        : (row.pautan ? safeInternalUrl(row.pautan, '/program/') : null);
      const card = document.createElement(articleHref ? 'a' : 'article');
      card.className = 'achievement-card' + (options.featured ? ' is-featured' : '');
      if (articleHref) card.href = articleHref;
      const image = row.image_url ? { image_url: row.image_url, alt_text: title } : null;
      const media = document.createElement('div');
      media.className = 'achievement-card-media' + (image ? '' : ' is-empty');
      if (image && image.image_url) {
        const img = document.createElement('img');
        img.src = safeInternalUrl(image.image_url, '/assets/hero-sekolah.jpg');
        img.alt = image.alt_text || title;
        img.loading = options.featured ? 'eager' : 'lazy';
        media.appendChild(img);
      } else {
        media.textContent = 'PROGRAM SEKOLAH';
      }
      const body = document.createElement('div');
      body.className = 'achievement-card-body';
      const label = document.createElement('span');
      label.className = 'achievement-card-label';
      label.textContent = options.label || 'Program sekolah';
      const heading = document.createElement('h3');
      heading.textContent = title;
      const summary = document.createElement('p');
      summary.textContent = row.penerangan || 'Baca maklumat dan sorotan aktiviti rasmi SMK Agama Jerlun.';
      const meta = document.createElement('time');
      meta.className = 'achievement-card-date';
      meta.dateTime = row.tarikh || '';
      meta.textContent = formatDate(row.tarikh);
      const link = document.createElement('span');
      link.className = 'achievement-card-link';
      link.textContent = articleHref ? 'Baca artikel' : 'Lihat program';
      body.append(label, heading, summary, meta, link);
      card.append(media, body);
      mount.appendChild(card);
    });
  };

  // Alias dalaman untuk halaman lama yang mungkin masih memanggil nama fungsi terdahulu.
  window.cmsLoadAchievements = window.cmsLoadProgramArticles;

  // Muatkan satu makluman terkini untuk panel "Hari ini di SMKAJ".
  window.cmsLoadTodayNotice = async function (mountId) {
    const mount = document.getElementById(mountId);
    const alertStrip = document.getElementById('home-alert-strip');
    if (!mount) return;
    const { data, error } = await cmsClient.from('pengumuman').select('tajuk,tarikh,kandungan')
      .eq('portal', 'sekolah')
      .order('tarikh', { ascending: false }).order('id', { ascending: false }).limit(1);
    if (error || !data || !data.length) {
      mount.innerHTML = '<p class="ios-today-empty">Tiada makluman baharu buat masa ini.</p>';
      if (alertStrip) alertStrip.hidden = true;
      return;
    }
    const item = data[0];
    const parts = (item.tarikh || '').split('-');
    const bulan = BULAN_PENUH;
    const date = parts.length === 3 ? parts[2] + ' ' + (bulan[parseInt(parts[1], 10) - 1] || '') : '';
    mount.innerHTML = '<strong>' + esc(item.tajuk) + '</strong>' + (date ? '<small>' + esc(date) + '</small>' : '');
    if (alertStrip) {
      const title = document.getElementById('home-alert-title');
      const dateEl = document.getElementById('home-alert-date');
      if (title) title.textContent = item.tajuk || 'Makluman sekolah';
      if (dateEl) dateEl.textContent = date;
      alertStrip.hidden = false;
    }
  };

  function box(x, y, w, h, cls, role, nama, gred) {
    return '<foreignObject x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '">' +
      '<div xmlns="http://www.w3.org/1999/xhtml" class="orgbox ' + cls + '">' +
      '<span class="role">' + esc(role || '') + '</span><span class="nm">' + esc(nama) + '</span>' +
      (gred ? '<span class="gr">Gred ' + esc(gred) + '</span>' : '') +
      '</div></foreignObject>';
  }

  function buildOrgSvg(pengetua, pkList, ketuaList) {
    const W = 1160;
    const pengetuaY = 20, pengetuaH = 78, pengetuaW = 300;
    const pkY = 176, pkH = 82, pkW = 210, pkGap = 30;
    const ketuaY = 330, ketuaH = 86, ketuaW = 190, ketuaGap = 22;
    let lines = '', boxes = '';
    const pengetuaX = (W - pengetuaW) / 2;
    const pengetuaCx = pengetuaX + pengetuaW / 2;
    const pengetuaBottom = pengetuaY + pengetuaH;

    if (pengetua) boxes += box(pengetuaX, pengetuaY, pengetuaW, pengetuaH, 'top', pengetua.jawatan || 'Pengetua', pengetua.nama, pengetua.gred);

    let pkCenters = [];
    if (pkList.length) {
      const totalW = pkList.length * pkW + (pkList.length - 1) * pkGap;
      const startX = (W - totalW) / 2;
      pkList.forEach(function (s, i) {
        const x = startX + i * (pkW + pkGap);
        const cx = x + pkW / 2;
        pkCenters.push(cx);
        boxes += box(x, pkY, pkW, pkH, 'tier2', s.jawatan, s.nama, s.gred);
      });
      const busY = pengetuaBottom + Math.max(10, (pkY - pengetuaBottom) / 2);
      if (pengetua) {
        lines += '<line x1="' + pengetuaCx + '" y1="' + pengetuaBottom + '" x2="' + pengetuaCx + '" y2="' + busY + '"/>';
        lines += '<line x1="' + pkCenters[0] + '" y1="' + busY + '" x2="' + pkCenters[pkCenters.length - 1] + '" y2="' + busY + '"/>';
      }
      pkCenters.forEach(function (cx) { lines += '<line x1="' + cx + '" y1="' + busY + '" x2="' + cx + '" y2="' + pkY + '"/>'; });
    }

    let ketuaCenters = [];
    if (ketuaList.length) {
      const totalW = ketuaList.length * ketuaW + (ketuaList.length - 1) * ketuaGap;
      const startX = Math.max(20, (W - totalW) / 2);
      ketuaList.forEach(function (s, i) {
        const x = startX + i * (ketuaW + ketuaGap);
        const cx = x + ketuaW / 2;
        ketuaCenters.push(cx);
        boxes += box(x, ketuaY, ketuaW, ketuaH, 'tier3', s.jawatan, s.nama, s.gred);
      });
      if (pengetua) {
        const trunkX = 20;
        const busY2 = Math.max(pkY + pkH + 20, pengetuaBottom + 40);
        lines += '<line x1="' + pengetuaCx + '" y1="' + pengetuaBottom + '" x2="' + trunkX + '" y2="' + pengetuaBottom + '"/>';
        lines += '<line x1="' + trunkX + '" y1="' + pengetuaBottom + '" x2="' + trunkX + '" y2="' + busY2 + '"/>';
        lines += '<line x1="' + trunkX + '" y1="' + busY2 + '" x2="' + ketuaCenters[ketuaCenters.length - 1] + '" y2="' + busY2 + '"/>';
        ketuaCenters.forEach(function (cx) { lines += '<line x1="' + cx + '" y1="' + busY2 + '" x2="' + cx + '" y2="' + ketuaY + '"/>'; });
      }
    }
    const totalH = ketuaList.length ? ketuaY + ketuaH + 10 : (pkList.length ? pkY + pkH + 10 : pengetuaBottom + 10);
    return '<svg viewBox="0 0 ' + W + ' ' + totalH + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Carta organisasi barisan kepimpinan SMK Agama Jerlun">' +
      '<g style="stroke:var(--plum);stroke-width:2;fill:none">' + lines + '</g>' + boxes + '</svg>';
  }

  // Muatkan carta organisasi (kategori='pentadbir') ke dalam mount
  window.cmsLoadStaffOrg = async function (mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    const { data, error } = await cmsClient.from('staff').select('*').eq('kategori', 'pentadbir').order('susunan');
    if (error || !data) return;
    const pengetua = data.find(function (s) { return s.tier === 'pengetua'; });
    const pk = data.filter(function (s) { return s.tier === 'pk'; });
    const ketua = data.filter(function (s) { return s.tier === 'ketua'; });
    mount.innerHTML = buildOrgSvg(pengetua, pk, ketua);
  };

  // Muatkan senarai staf (kategori lain) ke dalam mount. tpl: 'card' | 'list' | 'list-akp'
  window.cmsLoadStaffGrid = async function (kategori, mountId, tpl) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    const { data, error } = await cmsClient.from('staff').select('*').eq('kategori', kategori).order('susunan');
    mount.innerHTML = '';
    if (error || !data) return;
    data.forEach(function (s) {
      let el = document.createElement('div');
      const gr = s.gred ? 'Gred ' + s.gred : '';
      if (tpl === 'card') {
        el.className = 'staff-card';
        el.innerHTML = '<span class="role">' + esc(s.jawatan || '') + '</span><div class="nm">' + esc(s.nama) + '</div><div class="gr">' + esc(gr) + '</div>';
      } else if (tpl === 'list-akp') {
        el.className = 'item';
        el.innerHTML = '<span class="j">' + esc(s.jawatan || '') + '</span><span class="n">' + esc(s.nama) + '</span><span class="g">' + esc(gr) + '</span>';
      } else {
        el.className = 'item';
        el.innerHTML = '<span class="n">' + esc(s.nama) + '</span><span class="g">' + esc(gr) + '</span>';
      }
      mount.appendChild(el);
    });
  };

  const BULAN_PENUH = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

  function localTodayIso() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const value = function (type) {
      const part = parts.find(function (item) { return item.type === type; });
      return part ? part.value : '';
    };
    return value('year') + '-' + value('month') + '-' + value('day');
  }

  function compareActivityRows(a, b, today) {
    const aStart = String(a.tarikh_mula || '9999-12-31');
    const bStart = String(b.tarikh_mula || '9999-12-31');
    const aEnd = String(a.tarikh_tamat || aStart);
    const bEnd = String(b.tarikh_tamat || bStart);
    const aOngoing = aStart <= today && aEnd >= today;
    const bOngoing = bStart <= today && bEnd >= today;
    if (aOngoing !== bOngoing) return aOngoing ? -1 : 1;
    return aStart.localeCompare(bStart) || String(a.susunan || 0).localeCompare(String(b.susunan || 0)) || Number(a.id || 0) - Number(b.id || 0);
  }

  function upcomingActivityRows(rows, limit) {
    const today = localTodayIso();
    return rows.filter(function (row) {
      return String(row.tarikh_tamat || row.tarikh_mula || '') >= today;
    }).sort(function (a, b) {
      return compareActivityRows(a, b, today);
    }).slice(0, limit || 5);
  }

  function buildUpcomingActivityList(rows, limit) {
    const activity = upcomingActivityRows(rows, limit);
    if (!activity.length) return '<p class="takwim-upcoming-empty">Tiada aktiviti terdekat direkodkan buat masa ini.</p>';
    return activity.map(function (row) {
      const today = localTodayIso();
      const start = String(row.tarikh_mula || '');
      const end = String(row.tarikh_tamat || start);
      const label = start <= today && end >= today ? 'Sedang berlangsung' : '';
      return '<article class="takwim-upcoming-item"><span class="takwim-upcoming-date">' + fmtTakwimDateShort(row.tarikh_mula, row.tarikh_tamat) + '</span><div><h4>' + esc(row.tajuk) + '</h4>' + (row.keterangan ? '<p>' + esc(row.keterangan) + '</p>' : '') + (label ? '<small class="takwim-upcoming-live">' + label + '</small>' : '') + '</div></article>';
    }).join('');
  }

  function fmtTakwimDate(mulaStr, tamatStr) {
    const m = mulaStr.split('-').map(Number);
    const mula = new Date(Date.UTC(m[0], m[1] - 1, m[2]));
    if (!tamatStr) return mula.getUTCDate() + ' ' + BULAN_PENUH[mula.getUTCMonth()] + ' ' + mula.getUTCFullYear();
    const t = tamatStr.split('-').map(Number);
    const tamat = new Date(Date.UTC(t[0], t[1] - 1, t[2]));
    if (mula.getUTCFullYear() === tamat.getUTCFullYear() && mula.getUTCMonth() === tamat.getUTCMonth()) {
      return mula.getUTCDate() + ' &ndash; ' + tamat.getUTCDate() + ' ' + BULAN_PENUH[mula.getUTCMonth()] + ' ' + mula.getUTCFullYear();
    }
    if (mula.getUTCFullYear() === tamat.getUTCFullYear()) {
      return mula.getUTCDate() + ' ' + BULAN_PENUH[mula.getUTCMonth()] + ' &ndash; ' + tamat.getUTCDate() + ' ' + BULAN_PENUH[tamat.getUTCMonth()] + ' ' + mula.getUTCFullYear();
    }
    return mula.getUTCDate() + ' ' + BULAN_PENUH[mula.getUTCMonth()] + ' ' + mula.getUTCFullYear() + ' &ndash; ' + tamat.getUTCDate() + ' ' + BULAN_PENUH[tamat.getUTCMonth()] + ' ' + tamat.getUTCFullYear();
  }
  function fmtTakwimDateShort(mulaStr, tamatStr) {
    const m = mulaStr.split('-').map(Number);
    const mula = new Date(Date.UTC(m[0], m[1] - 1, m[2]));
    const bulanNama = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
    let out = mula.getUTCDate() + ' ' + bulanNama[mula.getUTCMonth()];
    if (tamatStr) {
      const t = tamatStr.split('-').map(Number);
      const tamat = new Date(Date.UTC(t[0], t[1] - 1, t[2]));
      out += ' &ndash; ' + tamat.getUTCDate() + ' ' + bulanNama[tamat.getUTCMonth()];
    }
    return out;
  }

  function isoDate(date) { return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); }
  function dateFromIso(value) { return new Date(value + 'T00:00:00'); }
  function occursInMonth(row, monthDate) {
    const start = dateFromIso(row.tarikh_mula);
    const end = dateFromIso(row.tarikh_tamat || row.tarikh_mula);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
    return start <= monthEnd && end >= monthStart;
  }
  function buildMonthlyCalendar(rows, monthDate) {
    const byDay = {};
    rows.filter(function (row) { return occursInMonth(row, monthDate); }).forEach(function (row) {
      const start = dateFromIso(row.tarikh_mula);
      const end = dateFromIso(row.tarikh_tamat || row.tarikh_mula);
      const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      const from = start < firstDay ? firstDay : start;
      const to = end > lastDay ? lastDay : end;
      for (let date = new Date(from); date <= to; date.setDate(date.getDate() + 1)) {
        const key = isoDate(date);
        (byDay[key] || (byDay[key] = [])).push(row);
      }
    });
    const today = localTodayIso();
    const weekdays = ['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Ahd'];
    const year = monthDate.getFullYear(), month = monthDate.getMonth();
    const first = new Date(year, month, 1), days = new Date(year, month + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    let html = '<div class="activity-calendar-grid activity-calendar-grid-single"><section class="calendar-month calendar-month-current"><div class="calendar-weekdays">' + weekdays.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div><div class="calendar-days">';
    for (let blank = 0; blank < offset; blank++) html += '<span class="calendar-day blank"></span>';
    for (let day = 1; day <= days; day++) {
      const key = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      const events = byDay[key] || [];
      const labels = events.map(function (event) { return esc(event.tajuk); }).join('&#10;');
      html += '<span class="calendar-day' + (events.length ? ' has-event' : '') + (key === today ? ' today' : '') + '"' + (labels ? ' title="' + labels + '"' : '') + '><b>' + day + '</b>' + (events.length ? '<i>' + events.length + '</i>' : '') + '</span>';
    }
    return html + '</div></section></div><p class="calendar-legend"><span></span> Tarikh berlatar ungu mempunyai aktiviti. Halakan kursor atau tekan pada tarikh untuk melihat maklumat program.</p>';
  }
  function buildMonthlyActivityList(rows, monthDate) {
    const activity = rows.filter(function (row) { return occursInMonth(row, monthDate); })
      .sort(function (a, b) { return compareActivityRows(a, b, localTodayIso()); });
    if (!activity.length) return '<p class="month-activity-empty">Tiada aktiviti direkodkan bagi bulan ini.</p>';
    return activity.map(function (row) {
      return '<article class="month-activity"><span class="month-activity-date">' + fmtTakwimDateShort(row.tarikh_mula, row.tarikh_tamat) + '</span><div><h4>' + esc(row.tajuk) + '</h4>' + (row.keterangan ? '<p>' + esc(row.keterangan) + '</p>' : '') + '</div></article>';
    }).join('');
  }

  // Muatkan takwim sekolah sebagai satu bulan pada satu masa.
  window.cmsLoadTakwim = async function (options) {
    const mAkademik = document.getElementById(options.akademikId);
    const mCuti = document.getElementById(options.cutiId);
    const mAktiviti = document.getElementById(options.calendarId);
    const mSenarai = document.getElementById(options.activityListId);
    const mUpcoming = document.getElementById(options.upcomingId);
    const mBulan = document.getElementById(options.monthHeadingId);
    const mRingkasan = document.getElementById(options.summaryHeadingId);
    const prev = document.getElementById(options.prevId);
    const next = document.getElementById(options.nextId);
    const { data, error } = await cmsClient.from('takwim').select('*').eq('portal', 'sekolah').order('tarikh_mula');
    if (error || !data) return;

    if (mAkademik) {
      mAkademik.innerHTML = '';
      data.filter(function (r) { return r.kategori === 'akademik'; }).forEach(function (r) {
        const item = document.createElement('div'); item.className = 'takwim-term';
        item.innerHTML = '<span class="tj">' + esc(r.tajuk) + '</span><span class="tr">' + fmtTakwimDate(r.tarikh_mula, r.tarikh_tamat) + '</span>' +
          (r.keterangan ? '<span class="kt">' + esc(r.keterangan) + '</span>' : '');
        mAkademik.appendChild(item);
      });
    }
    if (mCuti) {
      mCuti.innerHTML = '';
      data.filter(function (r) { return r.kategori === 'cuti'; }).forEach(function (r) {
        const item = document.createElement('div'); item.className = 'takwim-cuti-item';
        item.innerHTML = '<span>' + esc(r.tajuk) + '</span><span style="font-family:var(--font-mono);color:var(--plum);white-space:nowrap">' + fmtTakwimDate(r.tarikh_mula, r.tarikh_tamat) + '</span>';
        mCuti.appendChild(item);
      });
    }
    const aktiviti = data.filter(function (r) { return r.kategori === 'aktiviti'; });
    if (mUpcoming) mUpcoming.innerHTML = buildUpcomingActivityList(aktiviti, options.upcomingLimit || 5);
    const selectedMonth = new Date();
    selectedMonth.setDate(1);
    function renderMonth() {
      const label = BULAN_PENUH[selectedMonth.getMonth()] + ' ' + selectedMonth.getFullYear();
      if (mBulan) mBulan.textContent = label;
      if (mRingkasan) mRingkasan.textContent = 'Aktiviti ' + label;
      if (mAktiviti) mAktiviti.innerHTML = buildMonthlyCalendar(aktiviti, selectedMonth);
      if (mSenarai) mSenarai.innerHTML = buildMonthlyActivityList(aktiviti, selectedMonth);
    }
    if (prev) prev.addEventListener('click', function () { selectedMonth.setMonth(selectedMonth.getMonth() - 1); renderMonth(); });
    if (next) next.addEventListener('click', function () { selectedMonth.setMonth(selectedMonth.getMonth() + 1); renderMonth(); });
    renderMonth();
  };

  // Muatkan senarai aktiviti terdekat (untuk widget di laman utama)
  window.cmsLoadAktivitiTerdekat = async function (mountId, limit) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    const todayStr = localTodayIso();
    const { data, error } = await cmsClient.from('takwim').select('*')
      .eq('portal', 'sekolah')
      .eq('kategori', 'aktiviti')
      .or('tarikh_mula.gte.' + todayStr + ',tarikh_tamat.gte.' + todayStr)
      .order('tarikh_mula')
      .limit(limit || 5);
    mount.innerHTML = '';
    if (error || !data || !data.length) {
      mount.innerHTML = '<p style="font-size:.85rem;color:var(--muted)">Tiada aktiviti terdekat buat masa ini.</p>';
      return;
    }
    upcomingActivityRows(data || [], limit || 5).forEach(function (r) {
      const item = document.createElement('div'); item.className = 'aktiviti-item';
      item.innerHTML = '<span class="tgl">' + fmtTakwimDateShort(r.tarikh_mula, r.tarikh_tamat) + '</span><span class="tj">' + esc(r.tajuk) + '</span>';
      mount.appendChild(item);
    });
  };

  window.cmsLoadAktivitiWidget = async function (mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    const todayStr = localTodayIso();
    const { data, error } = await cmsClient.from('takwim').select('tajuk,tarikh_mula,tarikh_tamat').eq('portal', 'sekolah').eq('kategori', 'aktiviti')
      .or('tarikh_mula.gte.' + todayStr + ',tarikh_tamat.gte.' + todayStr).order('tarikh_mula').limit(1);
    mount.textContent = !error && data && data.length ? data[0].tajuk : 'Tiada aktiviti terdekat';
  };

  // Muatkan sorotan Akademik: tarikh kategori akademik dan makluman terkini.
  window.cmsLoadAkademikHighlights = async function (options) {
    options = options || {};
    const calendar = document.getElementById(options.calendarId);
    const notices = document.getElementById(options.noticeId);
    const todayStr = localTodayIso();
    const calendarLimit = options.calendarLimit || 3;
    const noticeLimit = options.noticeLimit || 2;
    const bulanNama = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
    function formatDate(mula, tamat) {
      const start = (mula || '').split('-').map(Number);
      if (start.length !== 3 || !start[0]) return '';
      let output = start[2] + ' ' + (bulanNama[start[1] - 1] || '');
      if (tamat && tamat !== mula) {
        const end = tamat.split('-').map(Number);
        if (end.length === 3 && end[0]) output += ' - ' + end[2] + ' ' + (bulanNama[end[1] - 1] || '');
      }
      return output;
    }
    const results = await Promise.all([
      cmsClient.from('takwim').select('tajuk,tarikh_mula,tarikh_tamat,keterangan')
        .eq('portal', 'sekolah')
        .eq('kategori', 'akademik')
        .or('tarikh_mula.gte.' + todayStr + ',tarikh_tamat.gte.' + todayStr)
        .order('tarikh_mula').limit(calendarLimit),
      cmsClient.from('pengumuman').select('tajuk,kandungan,tarikh')
        .eq('portal', 'sekolah')
        .order('tarikh', { ascending: false }).order('id', { ascending: false }).limit(noticeLimit)
    ]);
    const calendarResult = results[0];
    const noticeResult = results[1];
    if (calendar) {
      if (calendarResult.error) {
        calendar.innerHTML = '<p class="academic-empty">Tarikh akademik tidak dapat dimuatkan. Sila rujuk Takwim Sekolah.</p>';
      } else if (!calendarResult.data || !calendarResult.data.length) {
        calendar.innerHTML = '<p class="academic-empty">Tiada tarikh akademik akan datang buat masa ini.</p>';
      } else {
        calendar.innerHTML = calendarResult.data.map(function (item) {
          return '<article class="academic-timeline-item"><span>' + esc(formatDate(item.tarikh_mula, item.tarikh_tamat)) + '</span><div><h4>' + esc(item.tajuk) + '</h4>' + (item.keterangan ? '<p>' + esc(item.keterangan) + '</p>' : '') + '</div></article>';
        }).join('');
      }
    }
    if (notices) {
      if (noticeResult.error) {
        notices.innerHTML = '<p class="academic-empty">Pengumuman tidak dapat dimuatkan buat masa ini.</p>';
      } else if (!noticeResult.data || !noticeResult.data.length) {
        notices.innerHTML = '<p class="academic-empty">Tiada pengumuman buat masa ini.</p>';
      } else {
        notices.innerHTML = noticeResult.data.map(function (item) {
          return '<article class="academic-notice-item"><span>' + esc(formatDate(item.tarikh)) + '</span><div><h4>' + esc(item.tajuk) + '</h4>' + (item.kandungan ? '<p>' + esc(item.kandungan) + '</p>' : '') + '</div></article>';
        }).join('');
      }
    }
  };

  window.cmsSetupSubtabs = function () {
    const tabs = document.querySelectorAll('.subtab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (item) {
          const active = item === tab, panel = document.getElementById(item.dataset.panel);
          item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active));
          if (panel) panel.hidden = !active;
        });
      });
    });
  };

  window.cmsSetupInfoHashTabs = function () {
    const routeTabs = {
      '/info-sekolah/profil-sekolah/': 'profil',
      '/info-sekolah/lagu-sekolah/': 'lagu',
      '/info-sekolah/pengurusan/': 'pengurusan',
      '/info-sekolah/warga-sekolah/': 'warga',
      '/info-sekolah/takwim/': 'takwim'
    };
    const route = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/';
    const requestedTab = new URLSearchParams(location.search).get('tab');
    const key = routeTabs[route] || requestedTab;
    const tab = key && document.querySelector('.subtab[data-panel="panel-' + key + '"]');
    if (tab) tab.click();
  };

  window.cmsSetupSectionQuery = function () {
    var section = new URLSearchParams(location.search).get('section');
    if (!section) return;
    requestAnimationFrame(function () {
      var target = document.getElementById(section);
      if (target) target.scrollIntoView({ block: 'start' });
    });
  };

  // Kemaskini nav Log Masuk / Log Keluar / Panel Admin pada laman awam
  window.cmsLoadAuthNav = async function () {
    const loginEl = document.getElementById('nav-login');
    const adminEl = document.getElementById('nav-panel-admin');
    const { data: { user } } = await cmsClient.auth.getUser();
    if (!user) {
      if (loginEl) { loginEl.textContent = 'Log Masuk'; loginEl.href = '/tempahan/log-masuk/'; loginEl.onclick = null; }
      if (adminEl) adminEl.style.display = 'none';
      return;
    }
    if (loginEl) {
      loginEl.textContent = 'Log Keluar';
      loginEl.href = '#';
      loginEl.onclick = async function (e) {
        e.preventDefault();
        await cmsClient.auth.signOut();
        location.reload();
      };
    }
    if (adminEl) {
      const { data: adminRow } = await cmsClient.from('admin_pengguna').select('user_id').eq('user_id', user.id).maybeSingle();
      adminEl.style.display = adminRow ? 'inline-block' : 'none';
    }
  };
  (function () {
    var schoolNav = document.querySelector('nav.tabs');
    var schoolRoute = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/';
    function activeGroup() {
      if (schoolRoute.indexOf('/info-sekolah/') === 0 || schoolRoute.indexOf('/info/') === 0) return 'info';
      if (schoolRoute.indexOf('/program/') === 0 || schoolRoute.indexOf('/berita/') === 0) return 'program';
      if (schoolRoute.indexOf('/perkhidmatan/') === 0 || schoolRoute.indexOf('/tempahan/') === 0) return 'perkhidmatan';
      if (schoolRoute.indexOf('/akademik/') === 0) return 'akademik';
      if (schoolRoute.indexOf('/hem/') === 0) return 'hem';
      if (schoolRoute.indexOf('/kokurikulum/') === 0) return 'kokurikulum';
      if (schoolRoute.indexOf('/asrama/') === 0) return 'asrama';
      return 'utama';
    }
    function activeClass(group) { return activeGroup() === group ? ' is-active' : ''; }
    function megaMenu(group, label, overview, intro, links) {
      return '<details class="nav-dropdown nav-mega' + activeClass(group) + '"><summary>' + label + '</summary><div class="subnav nav-mega-panel"><div class="nav-mega-copy"><strong>' + label + '</strong><small>' + intro + '</small><a class="nav-overview" href="' + overview + '">Lihat halaman ' + label + '</a></div><div class="nav-mega-links">' + links.map(function (link) {
        return '<a href="' + link.href + '"><b>' + link.title + '</b><small>' + link.copy + '</small></a>';
      }).join('') + '</div></div></details>';
    }
    if (schoolNav) {
      schoolNav.setAttribute('aria-label', 'Navigasi utama sekolah');
      schoolNav.id = 'school-main-navigation';
      schoolNav.innerHTML = [
        '<a href="/"' + (activeGroup() === 'utama' ? ' class="active"' : '') + '>Utama</a>',
        megaMenu('program', 'Program Sekolah', '/program/', 'Artikel dan aktiviti rasmi warga sekolah.', [
          { href: '/program/', title: 'Program Terkini', copy: 'Sorotan aktiviti rasmi sekolah' }
        ]),
        megaMenu('akademik', 'Akademik', '/akademik/', 'Kurikulum, panitia dan maklumat pembelajaran.', [
          { href: '/akademik/?section=academic-calendar', title: 'Tarikh Penting', copy: 'Agenda akademik yang akan datang' },
          { href: '/akademik/?section=page-content', title: 'Kurikulum dan Panitia', copy: 'Program serta bidang mata pelajaran' },
          { href: '/akademik/rujukan/', title: 'Rujukan Akademik', copy: 'Pakej, waktu dan pentaksiran' },
          { href: '/perkhidmatan/muat-turun/', title: 'Borang dan Dokumen', copy: 'Bahan rujukan untuk dimuat turun' }
        ]),
        megaMenu('hem', 'HEM', '/hem/', 'Kebajikan, sahsiah dan keselamatan murid.', [
          { href: '/hem/?section=kebajikan', title: 'Kebajikan Murid', copy: 'Bantuan, SPBT dan sokongan' },
          { href: '/hem/?section=sahsiah', title: 'Sahsiah dan Disiplin', copy: 'SUMUR dan sekolah penyayang' },
          { href: '/hem/?section=selamat', title: 'Keselamatan', copy: 'Kesihatan, 3K dan kecemasan' },
          { href: '/hem/?section=sokongan', title: 'Kaunseling dan PPDa', copy: 'Bimbingan dan pencegahan' }
        ]),
        megaMenu('kokurikulum', 'Kokurikulum', '/kokurikulum/', 'Pengurusan aktiviti luar bilik darjah.', [
          { href: '/kokurikulum/?section=koku-uniform-section', title: 'Unit Beruniform', copy: 'Maklumat guru penasihat' },
          { href: '/kokurikulum/?section=koku-persatuan-section', title: 'Kelab dan Persatuan', copy: 'Rujukan unit dan penyelaras' },
          { href: '/kokurikulum/?section=koku-permainan-section', title: 'Sukan dan Permainan', copy: 'Unit sukan sekolah' }
        ]),
        megaMenu('asrama', 'Asrama', '/asrama/', 'Panduan penginapan dan kehidupan harian murid.', [
          { href: '/asrama/?section=page-content', title: 'Maklumat Asrama', copy: 'Pengurusan dan kemudahan' },
          { href: '/asrama/?section=jadual-harian', title: 'Jadual Harian', copy: 'Rutin penghuni asrama' },
          { href: '/asrama/?section=peraturan', title: 'Peraturan Asrama', copy: 'Panduan dan tatatertib penghuni' }
        ]),
        megaMenu('info', 'Info Sekolah', '/info/?tab=profil', 'Profil, warga sekolah dan maklumat rasmi.', [
          { href: '/info/?tab=profil', title: 'Profil Sekolah', copy: 'Identiti dan latar sekolah' },
          { href: '/info/?tab=lagu', title: 'Lagu Sekolah', copy: 'Lirik dan identiti sekolah' },
          { href: '/info/?tab=pengurusan', title: 'Pengurusan', copy: 'Barisan kepimpinan sekolah' },
          { href: '/info/?tab=warga', title: 'Warga Sekolah', copy: 'Guru dan anggota pelaksana' },
          { href: '/info/?tab=takwim', title: 'Takwim', copy: 'Kalendar dan aktiviti sekolah' },
          { href: '/info/?tab=hubungi', title: 'Hubungi', copy: 'Alamat, telefon dan e-mel rasmi sekolah' }
        ]),
        megaMenu('perkhidmatan', 'Perkhidmatan', '/hub/', 'Sistem digital dan rujukan pantas sekolah.', [
          { href: '/pss/', title: 'Portal PSS', copy: 'Katalog, NILAM dan pinjaman' },
          { href: '/tempahan/', title: 'Tempahan Bilik', copy: 'Semak slot dan tempah ruang' },
          { href: '/perkhidmatan/klinik/', title: 'Rekod Klinik', copy: 'Semakan rekod kesihatan' },
          { href: '/perkhidmatan/muat-turun/', title: 'Muat Turun', copy: 'Borang dan dokumen sekolah' }
        ]),
        '<a href="/admin/" id="nav-panel-admin" style="display:none">Panel Admin</a>',
        '<a href="/tempahan/log-masuk/" id="nav-login">Log Masuk</a>'
      ].join('');
      if (!document.querySelector('.school-menu-toggle')) {
        var menuToggle = document.createElement('button');
        menuToggle.type = 'button';
        menuToggle.className = 'school-menu-toggle';
        menuToggle.setAttribute('aria-controls', schoolNav.id);
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.textContent = 'Menu';
        schoolNav.parentNode.insertBefore(menuToggle, schoolNav);
        menuToggle.addEventListener('click', function () {
          var open = schoolNav.classList.toggle('is-open');
          menuToggle.setAttribute('aria-expanded', String(open));
          if (!open) closeMenus();
        });
      }
      if (!document.querySelector('.school-mobile-dock')) {
        var mobileDock = document.createElement('nav');
        mobileDock.className = 'school-mobile-dock';
        mobileDock.setAttribute('aria-label', 'Akses pantas mudah alih');
        mobileDock.innerHTML = '<a href="/">Utama</a><a href="/?section=notis-title">Notis</a><a href="/pss/">PSS</a><a href="/tempahan/">Tempah</a><button type="button" aria-controls="school-main-navigation" aria-expanded="false">Menu</button>';
        document.body.appendChild(mobileDock);
        mobileDock.querySelector('button').addEventListener('click', function () {
          var trigger = document.querySelector('.school-menu-toggle');
          if (trigger) trigger.click();
          this.setAttribute('aria-expanded', String(schoolNav.classList.contains('is-open')));
        });
      }
    }
    var menus = document.querySelectorAll('nav.tabs details.nav-dropdown');
    function closeMenus(except) { menus.forEach(function (menu) { if (menu !== except) menu.open = false; }); }
    function isDesktop() { return window.matchMedia('(min-width: 821px)').matches; }
    menus.forEach(function (menu) {
      menu.addEventListener('click', function (event) {
        if (isDesktop() && event.target.closest('summary')) { event.preventDefault(); menu.open = !menu.open; closeMenus(menu); }
      });
      menu.addEventListener('mouseenter', function () { if (isDesktop()) { closeMenus(menu); menu.open = true; } });
    });
    document.querySelectorAll('nav.tabs > a').forEach(function (link) { link.addEventListener('mouseenter', function () { if (isDesktop()) closeMenus(); }); });
    document.addEventListener('click', function (event) { if (isDesktop() && schoolNav && !schoolNav.contains(event.target) && !event.target.closest('.school-menu-toggle')) closeMenus(); });
    window.addEventListener('scroll', function () { closeMenus(); }, { passive: true });
    var guides = {
      '/akademik/': { label: 'Dalam Akademik', items: [
        { href: '/akademik/?section=academic-calendar', title: 'Tarikh Penting', copy: 'Agenda akademik akan datang' },
        { href: '/akademik/?section=page-content', title: 'Kurikulum dan Panitia', copy: 'Program dan bidang mata pelajaran' },
        { href: '/perkhidmatan/muat-turun/', title: 'Dokumen', copy: 'Borang dan bahan sekolah' }
      ] },
      '/kokurikulum/': { label: 'Dalam Kokurikulum', items: [
        { href: '/kokurikulum/?section=koku-uniform-section', title: 'Unit Beruniform', copy: 'Guru penasihat dan pengurusan' },
        { href: '/kokurikulum/?section=koku-persatuan-section', title: 'Kelab dan Persatuan', copy: 'Unit dan penyelaras' },
        { href: '/kokurikulum/?section=koku-permainan-section', title: 'Sukan dan Permainan', copy: 'Maklumat aktiviti sukan' }
      ] },
      '/asrama/': { label: 'Dalam Asrama', items: [
        { href: '/asrama/?section=page-content', title: 'Maklumat Asrama', copy: 'Kemudahan dan pengurusan' },
        { href: '/asrama/?section=jadual-harian', title: 'Jadual Harian', copy: 'Rutin penghuni asrama' },
        { href: '/asrama/?section=peraturan', title: 'Peraturan Asrama', copy: 'Panduan dan tatatertib' }
      ] }
    };
    var guide = guides[schoolRoute], pagehead = document.querySelector('.pagehead');
    if (guide && pagehead && !document.querySelector('.page-guide')) {
      var guideNav = document.createElement('nav');
      guideNav.className = 'page-guide';
      guideNav.setAttribute('aria-label', guide.label);
      guideNav.innerHTML = '<div class="page-guide-inner"><span>' + guide.label + '</span><div>' + guide.items.map(function (item) { return '<a href="' + item.href + '"><b>' + item.title + '</b><small>' + item.copy + '</small></a>'; }).join('') + '</div></div>';
      pagehead.insertAdjacentElement('afterend', guideNav);
    }
    var routeAnchors = { '/perkhidmatan/muat-turun/': 'pusat-muat-turun', '/perkhidmatan/direktori/': 'direktori-sekolah' };
    if (routeAnchors[schoolRoute]) {
      requestAnimationFrame(function () {
        var target = document.getElementById(routeAnchors[schoolRoute]);
        if (target) target.scrollIntoView({ block: 'start' });
      });
    }
    window.cmsSetupSectionQuery();
  }());
})();
