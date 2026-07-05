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

  var cart = read(KEYS.cart, []);      // array of product ids
  var wish = read(KEYS.wish, []);      // array of product ids
  var user = read(KEYS.user, null);    // { name, email, picture }

  function emit() { listeners.forEach(function (fn) { fn(); }); }

  function product(id) {
    return (window.TIAO_PRODUCTS || []).find(function (p) { return p.id === id; });
  }

  return {
    onChange: function (fn) { listeners.push(fn); },

    /* ---- cart ---- */
    getCart: function () { return cart.map(product).filter(Boolean); },
    cartCount: function () { return cart.length; },
    cartTotal: function () { return cart.reduce(function (s, id) { var p = product(id); return s + (p ? p.price : 0); }, 0); },
    addToCart: function (id) { cart.push(id); write(KEYS.cart, cart); emit(); },
    removeFromCart: function (index) { cart.splice(index, 1); write(KEYS.cart, cart); emit(); },

    /* ---- wishlist ---- */
    getWishlist: function () { return wish.map(product).filter(Boolean); },
    wishCount: function () { return wish.length; },
    inWishlist: function (id) { return wish.indexOf(id) !== -1; },
    toggleWishlist: function (id) {
      var i = wish.indexOf(id);
      if (i === -1) wish.push(id); else wish.splice(i, 1);
      write(KEYS.wish, wish); emit();
      return wish.indexOf(id) !== -1;
    },
    removeFromWishlist: function (id) {
      var i = wish.indexOf(id);
      if (i !== -1) { wish.splice(i, 1); write(KEYS.wish, wish); emit(); }
    },

    /* ---- auth ---- */
    getUser: function () { return user; },
    signIn: function (u) { user = u; write(KEYS.user, user); emit(); },
    signOut: function () { user = null; localStorage.removeItem(KEYS.user); emit(); }
  };
})();
