(function () {
  var target = document.body && document.body.dataset.redirect;
  if (!target) return;

  var destination = new URL(target, window.location.origin);
  if (document.body.dataset.preserveSearch === 'true') {
    new URLSearchParams(window.location.search).forEach(function (value, key) {
      if (!destination.searchParams.has(key)) destination.searchParams.set(key, value);
    });
  }

  window.location.replace(destination.pathname + destination.search + destination.hash);
}());
