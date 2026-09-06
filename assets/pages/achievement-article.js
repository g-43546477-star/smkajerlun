(function () {
  var params = new URLSearchParams(window.location.search);
  var slug = String(params.get('slug') || '').trim().toLowerCase();
  var loading = document.getElementById('article-loading');
  var article = document.getElementById('achievement-article');

  function tick() {
    var now = new Date();
    var date = document.getElementById('tarikh-masihi');
    if (date) date.textContent = new Intl.DateTimeFormat('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    var hijri = document.getElementById('tarikh-hijri');
    if (hijri) {
      try { hijri.textContent = new Intl.DateTimeFormat('ms-MY-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(now).replace(/\s*H$/, '') + ' H'; }
      catch (error) { hijri.style.display = 'none'; }
    }
    var clock = document.getElementById('jam');
    if (clock) clock.textContent = new Intl.DateTimeFormat('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
  }

  function safeUrl(value) {
    try {
      var parsed = new URL(String(value || '').trim(), window.location.origin);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
    } catch (error) {
      return null;
    }
  }

  function formatDate(value) {
    var parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return '';
    return new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])));
  }

  function labelFor(category) {
    return 'PROGRAM SEKOLAH';
  }

  function renderProse(text) {
    var mount = document.getElementById('achievement-prose');
    mount.replaceChildren();
    String(text || '').split(/\n\s*\n/).forEach(function (paragraph) {
      var value = paragraph.trim();
      if (!value) return;
      var lines = value.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
      var unordered = lines.length > 0 && lines.every(function (line) { return /^[-*]\s+/.test(line); });
      var ordered = lines.length > 0 && lines.every(function (line) { return /^\d+[.)]\s+/.test(line); });
      if (unordered || ordered) {
        var list = document.createElement(unordered ? 'ul' : 'ol');
        lines.forEach(function (line) {
          var item = document.createElement('li');
          item.textContent = line.replace(unordered ? /^[-*]\s+/ : /^\d+[.)]\s+/, '').trim();
          list.appendChild(item);
        });
        mount.appendChild(list);
        return;
      }
      var node = document.createElement('p');
      node.textContent = value;
      mount.appendChild(node);
    });
  }

  function normalizeGallery(value) {
    if (!Array.isArray(value)) return [];
    return value.map(function (item) {
      if (typeof item === 'string') return { url: safeUrl(item), alt: '' };
      return { url: safeUrl(item && item.url), alt: String(item && item.alt || ''), caption: String(item && item.caption || '') };
    }).filter(function (item) { return Boolean(item.url); });
  }

  function renderGallery(items, title) {
    var section = document.getElementById('achievement-gallery');
    var grid = document.getElementById('achievement-gallery-grid');
    grid.replaceChildren();
    if (!items.length) return;
    items.forEach(function (item) {
      var figure = document.createElement('figure');
      var image = document.createElement('img');
      image.src = item.url;
      image.alt = item.alt || title;
      image.loading = 'lazy';
      figure.appendChild(image);
      if (item.caption) {
        var caption = document.createElement('figcaption');
        caption.textContent = item.caption;
        figure.appendChild(caption);
      }
      grid.appendChild(figure);
    });
    section.hidden = false;
  }

  function setMeta(row) {
    document.title = row.tajuk + ' | SMKA Jerlun';
    var description = document.querySelector('meta[name="description"]');
    if (description) description.content = row.penerangan || 'Program dan aktiviti terkini SMK Agama Jerlun.';
    var canonical = document.querySelector('link[rel="canonical"]') || document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = window.location.origin + '/program/?slug=' + encodeURIComponent(slug);
    if (!canonical.parentNode) document.head.appendChild(canonical);
    var schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Article', headline: row.tajuk,
      description: row.penerangan || '', datePublished: row.tarikh || undefined,
      publisher: { '@type': 'Organization', name: 'SMK Agama Jerlun' }
    });
    document.head.appendChild(schema);
  }

  async function loadArticle() {
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      loading.textContent = 'Pautan program ini tidak sah.';
      return;
    }
    var response = await window.cms.from('achievement').select('*').eq('slug', slug).maybeSingle();
    var row = response.data;
    if (response.error || !row || !row.kandungan) {
      loading.textContent = 'Program ini tidak ditemui atau belum diterbitkan.';
      return;
    }
    var title = String(row.tajuk || 'Program Sekolah SMKA Jerlun');
    document.getElementById('achievement-kicker').textContent = labelFor(row.kategori);
    document.getElementById('achievement-title').textContent = title;
    document.getElementById('achievement-dek').textContent = row.penerangan || '';
    var date = document.getElementById('achievement-date');
    date.dateTime = row.tarikh || '';
    date.textContent = formatDate(row.tarikh);
    var imageUrl = safeUrl(row.image_url);
    if (imageUrl) {
      var figure = document.getElementById('achievement-figure');
      document.getElementById('achievement-image').src = imageUrl;
      document.getElementById('achievement-image').alt = title;
      document.getElementById('achievement-caption').textContent = row.penerangan || title;
      figure.hidden = false;
    }
    renderProse(row.kandungan);
    renderGallery(normalizeGallery(row.galeri), title);
    setMeta(row);
    article.hidden = false;
    loading.hidden = true;
  }

  tick();
  setInterval(tick, 1000);
  var year = document.getElementById('thn');
  if (year) year.textContent = new Date().getFullYear();
  if (window.cmsLoadAuthNav) window.cmsLoadAuthNav();
  if (!slug || !article || !loading) return;
  loadArticle().catch(function () { loading.textContent = 'Program ini tidak dapat dimuatkan buat masa ini.'; });
}());
