(function () {
  var mount = document.getElementById('notis-list');
  if (!mount) return;

  function showUnavailable() {
    mount.replaceChildren();
    var message = document.createElement('p');
    message.className = 'pss-announcement-state';
    message.textContent = 'Pengumuman tidak dapat dimuatkan buat masa ini.';
    mount.appendChild(message);
  }

  if (typeof window.cmsLoadPengumuman !== 'function') {
    showUnavailable();
    mount.setAttribute('aria-busy', 'false');
    return;
  }

  Promise.resolve(window.cmsLoadPengumuman('notis-list'))
    .catch(showUnavailable)
    .finally(function () {
      mount.setAttribute('aria-busy', 'false');
    });
}());
