(function () {
  var params = new URLSearchParams(window.location.search);
  var slug = String(params.get('slug') || '').trim();
  var listing = document.getElementById('program-listing');
  var loading = document.getElementById('article-loading');
  if (slug) {
    if (listing) listing.hidden = true;
    if (loading) loading.hidden = false;
    document.getElementById('program-heading').hidden = true;
    document.getElementById('program-breadcrumb-overview').hidden = false;
    document.getElementById('program-current-page').textContent = 'Artikel';
    return;
  }
  if (window.cmsLoadProgramArticles) window.cmsLoadProgramArticles('program-list', { limit: 24, label: 'Program sekolah' });
}());
