(function () {
  'use strict';
  const targets = { akademik: '/akademik/', hem: '/hem/', kokurikulum: '/kokurikulum/', asrama: '/asrama/', info: '/info/?tab=profil', perkhidmatan: '/hub/', program: '/program/' };
  const key = new URLSearchParams(location.search).get('bahagian');
  location.replace(Object.hasOwn(targets, key) ? targets[key] : targets.info);
}());
