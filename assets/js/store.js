// ===== tiao — shared state (cart, wishlist, auth) with localStorage =====
window.Store = (function () {
  'use strict';

  var KEYS = { cart: 'tiao_cart', wish: 'tiao_wishlist', user: 'tiao_user' };
  var listeners = [];

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  // cart entries are { id, size, qty }. Older saved carts stored bare id strings
  // or {id,size} — normalise those so nothing breaks on upgrade.
  var cart = read(KEYS.cart, []).map(function (e) {
    if (typeof e === 'string') return { id: e, size: '', qty: 1 };
    return { id: String(e.id), size: e.size || '', qty: e.qty || 1 };
  });
  var wish = read(KEYS.wish, []);      // array of product ids
  var user = read(KEYS.user, null);    // { name, email, picture }

  function emit() { listeners.forEach(function (fn) { fn(); }); }

  // IDs may be strings ("b1") from the seed data or numbers from the database,
  // while dataset.id is always a string — so compare everything as strings.
  function sameId(a, b) { return String(a) === String(b); }
  function product(id) {
    return (window.TIAO_PRODUCTS || []).find(function (p) { return sameId(p.id, id); });
  }

  return {
    onChange: function (fn) { listeners.push(fn); },

    /* ---- cart ---- */
    // Each returned item is a copy of the product with the chosen size + qty.
    getCart: function () {
      return cart.map(function (e) { var p = product(e.id); return p ? Object.assign({}, p, { chosenSize: e.size, qty: e.qty || 1 }) : null; }).filter(Boolean);
    },
    // Badge shows total units (so ×2 counts as 2).
    cartCount: function () { return cart.reduce(function (s, e) { return s + (e.qty || 1); }, 0); },
    cartTotal: function () { return cart.reduce(function (s, e) { var p = product(e.id); return s + (p ? p.price * (e.qty || 1) : 0); }, 0); },
    // Same item + same size stacks into one line (qty++); a different size is a
    // separate line.
    addToCart: function (id, size) {
      id = String(id); size = size || '';
      var e = cart.find(function (x) { return sameId(x.id, id) && x.size === size; });
      if (e) e.qty = (e.qty || 1) + 1;
      else cart.push({ id: id, size: size, qty: 1 });
      write(KEYS.cart, cart); emit();
    },
    // delta +1 / -1; removing the last one drops the line.
    changeQty: function (index, delta) {
      var e = cart[index]; if (!e) return;
      e.qty = (e.qty || 1) + delta;
      if (e.qty < 1) cart.splice(index, 1);
      write(KEYS.cart, cart); emit();
    },
    removeFromCart: function (index) { cart.splice(index, 1); write(KEYS.cart, cart); emit(); },
    clearCart: function () { cart = []; write(KEYS.cart, cart); emit(); },
    // Drop cart entries whose product no longer exists (e.g. items saved before
    // the catalogue changed) so the badge can't get stuck above the drawer.
    // Call this only AFTER the catalogue has loaded.
    pruneCart: function () {
      var before = cart.length;
      cart = cart.filter(function (e) { return !!product(e.id); });
      if (cart.length !== before) { write(KEYS.cart, cart); emit(); }
      return before - cart.length;
    },

    /* ---- wishlist ---- */
    getWishlist: function () { return wish.map(product).filter(Boolean); },
    wishCount: function () { return wish.length; },
    inWishlist: function (id) { return wish.some(function (w) { return sameId(w, id); }); },
    toggleWishlist: function (id) {
      id = String(id);
      var i = wish.findIndex(function (w) { return sameId(w, id); });
      if (i === -1) wish.push(id); else wish.splice(i, 1);
      write(KEYS.wish, wish); emit();
      return wish.indexOf(id) !== -1;
    },
    removeFromWishlist: function (id) {
      var i = wish.findIndex(function (w) { return sameId(w, id); });
      if (i !== -1) { wish.splice(i, 1); write(KEYS.wish, wish); emit(); }
    },

    /* ---- auth ---- */
    getUser: function () { return user; },
    signIn: function (u) { user = u; write(KEYS.user, user); emit(); },
    signOut: function () { user = null; localStorage.removeItem(KEYS.user); emit(); }
  };
})();
