(() => {
  'use strict';
  const retry = document.getElementById('pwa-retry');
  retry.addEventListener('click', () => window.location.reload());
  const status = document.getElementById('pwa-offline-status');
  const sync = () => {
    status.textContent = navigator.onLine
      ? 'Cuba semula apabila sambungan internet tersedia.'
      : 'Telefon atau komputer anda masih di luar talian.';
  };
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  sync();
})();
