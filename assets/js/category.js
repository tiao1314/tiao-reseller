// ===== tiao — category page renderer (bags / shoes / watches / accessories) =====
(function () {
  'use strict';

  function init() {
    var root = document.getElementById('catRoot');
    if (!root) return;
    var category = root.dataset.category;
    var all = (window.TIAO_PRODUCTS || []).filter(function (p) { return p.category === category; });
    var brands = (window.TIAO_BRANDS || {})[category] || [];

    var grid = root.querySelector('.js-grid');
    var count = root.querySelector('.js-count');
    var activeBrand = 'ALL';
    var sort = 'featured';

    // Build brand filter chips
    var filterBar = root.querySelector('.js-filters');
    filterBar.innerHTML = ['ALL'].concat(brands).map(function (b) {
      return '<button class="chip' + (b === 'ALL' ? ' is-active' : '') + '" data-brand="' + b + '">' + b + '</button>';
    }).join('');

    function apply() {
      var list = all.slice();
      if (activeBrand !== 'ALL') list = list.filter(function (p) { return p.brand === activeBrand; });
      if (sort === 'low') list.sort(function (a, b) { return a.price - b.price; });
      else if (sort === 'high') list.sort(function (a, b) { return b.price - a.price; });
      else if (sort === 'new') list.sort(function (a, b) { return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0); });

      grid.innerHTML = list.length ? list.map(UI.card).join('')
        : '<p class="empty-note">No pieces in this brand right now — check back soon.</p>';
      count.textContent = list.length + (list.length === 1 ? ' piece' : ' pieces');
      UI.refresh();
    }

    filterBar.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-brand]');
      if (!chip) return;
      activeBrand = chip.dataset.brand;
      filterBar.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
      apply();
    });

    var sortSel = root.querySelector('.js-sort');
    if (sortSel) sortSel.addEventListener('change', function () { sort = sortSel.value; apply(); });

    apply();
  }

  if (window.UI) init(); else window.addEventListener('DOMContentLoaded', init);
})();
