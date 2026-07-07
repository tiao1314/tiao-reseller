// ===== tiao — catalogue loader =====
// Loads products from Supabase (products_public view) and updates the shared
// window.TIAO_PRODUCTS array IN PLACE (so existing references stay valid).
// Falls back to the built-in list in data.js if the DB is unreachable/empty.
// Exposes window.TIAO_CATALOG_READY (a promise) that pages await before render.
(function () {
  'use strict';
  var CFG = window.TIAO_CONFIG || {};
  window.TIAO_PRODUCTS = window.TIAO_PRODUCTS || [];

  function apply(list) {
    var arr = window.TIAO_PRODUCTS;
    arr.length = 0;
    list.forEach(function (p) { arr.push(p); });
    // rebuild brand lists per category from whatever we loaded
    var brands = {};
    arr.forEach(function (p) {
      (brands[p.category] = brands[p.category] || []);
      if (brands[p.category].indexOf(p.brand) === -1) brands[p.category].push(p.brand);
    });
    window.TIAO_BRANDS = brands;
  }

  function map(row) {
    return {
      id: row.id, category: row.category, brand: row.brand, name: row.name,
      price: Number(row.price), condition: row.condition, badge: row.badge,
      isNew: !!row.is_new, img: row.img
    };
  }

  window.TIAO_CATALOG_READY = new Promise(function (resolve) {
    if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) { resolve('fallback'); return; }
    fetch(CFG.SUPABASE_URL + '/rest/v1/products_public?select=*&order=sort_order.asc', {
      headers: { 'apikey': CFG.SUPABASE_ANON_KEY }
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (rows) {
      if (Array.isArray(rows) && rows.length) { apply(rows.map(map)); resolve('db'); }
      else resolve('fallback');   // keep data.js seed
    }).catch(function () { resolve('fallback'); });
  });
})();
