// ===== dripdrip — category page: multi-attribute filter + size guide =====
(function () {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function uniq(a) { var o = []; a.forEach(function (v) { if (v && o.indexOf(v) === -1) o.push(v); }); return o; }
  function flat(a) { return [].concat.apply([], a); }

  var SIZE_ORDER = ['Mini', 'Small', 'Medium', 'Large'];
  function sortSizes(arr) {
    return arr.slice().sort(function (a, b) {
      var na = parseFloat(String(a).replace(/[^0-9.]/g, '')), nb = parseFloat(String(b).replace(/[^0-9.]/g, ''));
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      var ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return String(a).localeCompare(String(b));
    });
  }

  function init() {
    var root = document.getElementById('catRoot');
    if (!root) return;
    var category = root.dataset.category;
    var all = (window.TIAO_PRODUCTS || []).filter(function (p) { return p.category === category; });

    var grid = root.querySelector('.js-grid');
    var count = root.querySelector('.js-count');
    var filterBar = root.querySelector('.js-filters');
    var sort = 'featured';
    var filters = { gender: [], size: [], color: [], brand: [] };

    var genders = uniq(all.map(function (p) { return p.gender; }));
    var sizes = sortSizes(uniq(flat(all.map(function (p) { return p.sizes || []; }))));
    var colors = uniq(flat(all.map(function (p) { return p.colors || []; }))).sort();
    var brands = uniq(all.map(function (p) { return p.brand; })).sort();

    function row(dim, label, opts, extra) {
      if (!opts.length) return '';
      var tags = opts.map(function (v) {
        var on = filters[dim].indexOf(v) !== -1;
        return '<button class="filt-tag' + (on ? ' is-on' : '') + '" data-dim="' + dim + '" data-val="' + esc(v) + '">' + esc(v) + '</button>';
      }).join('');
      return '<div class="filt-row"><span class="filt-label">' + label + '</span>' +
        '<div class="filt-opts">' +
          '<button class="filt-tag' + (filters[dim].length === 0 ? ' is-on' : '') + '" data-dim="' + dim + '" data-val="__ALL__">All</button>' +
          tags + (extra || '') +
        '</div></div>';
    }

    function renderFilters() {
      var guide = '<button class="filt-guide" data-guide="1">Size guide →</button>';
      filterBar.innerHTML =
        row('gender', 'GENDER', genders) +
        row('size', 'SIZE', sizes, guide) +
        row('color', 'COLOUR', colors) +
        row('brand', 'BRAND', brands);
    }

    function apply() {
      var list = all.filter(function (p) {
        if (filters.gender.length && filters.gender.indexOf(p.gender) === -1) return false;
        if (filters.size.length && !(p.sizes || []).some(function (s) { return filters.size.indexOf(s) !== -1; })) return false;
        if (filters.color.length && !(p.colors || []).some(function (c) { return filters.color.indexOf(c) !== -1; })) return false;
        if (filters.brand.length && filters.brand.indexOf(p.brand) === -1) return false;
        return true;
      });
      if (sort === 'low') list.sort(function (a, b) { return a.price - b.price; });
      else if (sort === 'high') list.sort(function (a, b) { return b.price - a.price; });
      else if (sort === 'new') list.sort(function (a, b) { return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0); });

      grid.innerHTML = list.length ? list.map(UI.card).join('')
        : '<p class="empty-note">Nothing matches those filters. <button class="link-inline" id="clearFilters">Clear all</button></p>';
      if (count) count.textContent = list.length + (list.length === 1 ? ' piece' : ' pieces');
      UI.refresh();
      var clr = document.getElementById('clearFilters');
      if (clr) clr.addEventListener('click', function () { filters = { gender: [], size: [], color: [], brand: [] }; renderFilters(); apply(); });
    }

    filterBar.addEventListener('click', function (e) {
      if (e.target.closest('[data-guide]')) { openGuide(category); return; }
      var tag = e.target.closest('[data-dim]');
      if (!tag) return;
      var dim = tag.dataset.dim, val = tag.dataset.val;
      if (val === '__ALL__') filters[dim] = [];
      else { var i = filters[dim].indexOf(val); if (i === -1) filters[dim].push(val); else filters[dim].splice(i, 1); }
      renderFilters(); apply();
    });

    var sortSel = root.querySelector('.js-sort');
    if (sortSel) sortSel.addEventListener('change', function () { sort = sortSel.value; apply(); });

    renderFilters(); apply();
  }

  /* ---------------- size guide ---------------- */
  // [ foot length cm, UK, EU, US Men, US Women ]
  var SHOE_ROWS = [
    ['22.0', 'UK 3', '35.5', '4', '5.5'], ['22.9', 'UK 4', '37', '5', '6.5'], ['23.5', 'UK 5', '38', '6', '7.5'],
    ['24.4', 'UK 6', '39.5', '7', '8.5'], ['25.4', 'UK 7', '41', '8', '9.5'], ['26.0', 'UK 8', '42.5', '9', '10.5'],
    ['27.0', 'UK 9', '44', '10', '11.5'], ['27.9', 'UK 10', '45', '11', '12.5'], ['28.6', 'UK 11', '46', '12', '13.5'], ['29.4', 'UK 12', '47.5', '13', '14.5']
  ];
  var BAG_ROWS = [
    ['Mini', '≤ 18 cm wide', 'Phone, cards, lipstick'],
    ['Small', '19 – 23 cm', 'Phone, cardholder, keys'],
    ['Medium', '24 – 28 cm', '+ small wallet & sunglasses'],
    ['Large', '29 cm +', 'Everyday tote, tablet, more']
  ];

  function guideHTML(category) {
    if (category === 'shoes') {
      var rows = SHOE_ROWS.map(function (r) {
        return '<tr><td>' + r[0] + '</td><td><strong>' + r[1] + '</strong></td><td>' + r[2] + '</td><td>' + r[3] + '</td><td>' + r[4] + '</td></tr>';
      }).join('');
      return '<h3>Shoe size guide</h3>' +
        '<p class="sg-note">Find your size by foot length. Fit can vary by brand — if you’re between sizes, we recommend sizing up.</p>' +
        '<div class="sg-measure"><h4>How to measure your foot</h4><ol>' +
          '<li>Place a sheet of paper on a hard floor with one edge against a wall.</li>' +
          '<li>Stand on it with your heel touching the wall.</li>' +
          '<li>Mark the tip of your longest toe on the paper.</li>' +
          '<li>Measure the distance from the wall to the mark in centimetres.</li>' +
          '<li>Measure both feet in the afternoon (feet swell through the day) and use the larger measurement.</li>' +
        '</ol></div>' +
        '<div class="sg-scroll"><table class="sg-table"><thead><tr><th>Foot length (cm)</th><th>UK</th><th>EU</th><th>US Men</th><th>US Women</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
    var brows = BAG_ROWS.map(function (r) {
      return '<tr><td><strong>' + r[0] + '</strong></td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>';
    }).join('');
    return '<h3>Bag size guide</h3><p class="sg-note">A quick sense of scale — exact dimensions are on each product’s page.</p>' +
      '<div class="sg-scroll"><table class="sg-table"><thead><tr><th>Size</th><th>Approx width</th><th>Fits</th></tr></thead><tbody>' + brows + '</tbody></table></div>';
  }

  var guideEl;
  function openGuide(category) {
    if (!guideEl) {
      guideEl = document.createElement('div');
      guideEl.className = 'sg-modal';
      guideEl.innerHTML = '<div class="sg-backdrop" data-sgclose></div><div class="sg-panel"><button class="sg-close" data-sgclose>✕</button><div class="sg-body"></div></div>';
      document.body.appendChild(guideEl);
      guideEl.addEventListener('click', function (e) { if (e.target.hasAttribute('data-sgclose')) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }
    guideEl.querySelector('.sg-body').innerHTML = guideHTML(category);
    guideEl.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function close() { if (guideEl) guideEl.classList.remove('is-open'); document.body.style.overflow = ''; }

  function boot() { (window.TIAO_CATALOG_READY || Promise.resolve()).then(init); }
  if (window.UI) boot(); else window.addEventListener('DOMContentLoaded', boot);
})();
