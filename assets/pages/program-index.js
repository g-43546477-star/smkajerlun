(function () {
  var params = new URLSearchParams(window.location.search);
  var slug = String(params.get('slug') || '').trim();
  var listing = document.getElementById('program-listing');
  var loading = document.getElementById('article-loading');
  if (slug) {
    if (listing) listing.hidden = true;
    if (loading) loading.hidden = false;
    return;
  }
  if (window.cmsLoadProgramArticles) window.cmsLoadProgramArticles('program-list', { limit: 24, label: 'Program sekolah' });
}());
