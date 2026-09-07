/* School-only motion: content remains available when scripts or animation are off. */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  function enter(element, distance = 12) {
    if (reduce.matches || !element.animate) return;
    const animation = element.animate([
      { opacity: 0, transform: `translateY(${distance}px)` },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 280, easing: 'cubic-bezier(.2,.7,.2,1)' });
    animations.add(animation);
    animation.finished.finally(() => animations.delete(animation)).catch(() => {});
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        enter(entry.target); observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    document.querySelectorAll('.ajer-hero-copy,.ajer-hero-art,.ios-section-heading,.school-section-heading,.service-search').forEach(element => observer.observe(element));
    reduce.addEventListener('change', () => {
      if (reduce.matches) { animations.forEach(animation => animation.cancel()); observer.disconnect(); }
    });
  }
  document.querySelectorAll('nav.tabs details').forEach(menu => {
    menu.addEventListener('toggle', () => {
      if (menu.open) { const panel = menu.querySelector('.nav-mega-panel'); if (panel) enter(panel, -6); }
    });
  });
}());
