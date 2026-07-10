// ===== dripdrip — shared UI: header, footer, drawers, search, login =====
(function () {
  'use strict';

  var CFG = window.TIAO_CONFIG || {};
  var PRODUCTS = window.TIAO_PRODUCTS || [];

  function money(n) { return '£' + n.toLocaleString('en-GB'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function findProduct(id) { return (window.TIAO_PRODUCTS || []).find(function (p) { return String(p.id) === String(id); }); }

  var ICONS = {
    search: '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    heart: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 20s-7-4.5-9.5-9C1 8 2.5 4.5 6 4.5c2 0 3.3 1.2 4 2.4.7-1.2 2-2.4 4-2.4 3.5 0 5 3.5 3.5 6.5C19 15.5 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    cart: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 8h12l-1 12H7L6 8z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'
  };

  var NAV = [
    { label: 'BAGS', href: 'bags' },
    { label: 'SHOES', href: 'shoes' }
  ];

  // dripping wordmark — anchor + falling blobs merged by an SVG goo filter
  function dripLogo() {
    var pos = [16, 39, 61, 83], delay = [0.2, 1.5, 2.6, 3.4];
    var blobs = pos.map(function (x, i) {
      return '<i class="blob blob--a" style="left:' + x + '%"></i>' +
             '<i class="blob blob--f" style="left:' + x + '%;animation-delay:' + delay[i] + 's"></i>';
    }).join('');
    return '<span class="drip-logo__text">dripdrip</span><span class="goo">' + blobs + '</span>';
  }
  var GOO_SVG = '<svg class="goo-defs" width="0" height="0" aria-hidden="true" focusable="false">' +
    '<defs><filter id="goo-filter"><feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="b"/>' +
    '<feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11"/></filter></defs></svg>';

  /* =================== HEADER =================== */
  function headerHTML() {
    var links = NAV.map(function (n) { return '<a href="' + n.href + '" class="nav__link">' + n.label + '</a>'; }).join('');
    return '' +
      '<div class="announce"><div class="wrap announce__inner">' +
        '<span class="announce__msg">FREE UK DELIVERY OVER £250 · 100% AUTHENTICATED · WORLDWIDE SHIPPING</span>' +
        '<nav class="announce__links"><a href="account">Track My Order</a><span>|</span><a href="#">Help</a></nav>' +
      '</div></div>' +
      '<div class="wrap header__inner">' +
        '<nav class="nav nav--left">' + links + '</nav>' +
        '<a href="/" class="logo">dripdrip</a>' +
        '<div class="header__actions">' +
          '<button class="icon-btn" data-open="search">' + ICONS.search + '<span>SEARCH</span></button>' +
          '<button class="icon-btn" data-open="account">' + ICONS.user + '<span class="js-login-label">LOGIN</span></button>' +
          '<button class="icon-btn" data-open="wishlist">' + ICONS.heart + '<span>WISHLIST (<em class="js-wish-count">0</em>)</span></button>' +
          '<button class="icon-btn" data-open="cart">' + ICONS.cart + '<span>CART (<em class="js-cart-count">0</em>)</span></button>' +
          '<button class="burger" data-open="menu" aria-label="Menu"><span></span><span></span><span></span></button>' +
        '</div>' +
      '</div>';
  }

  /* =================== FOOTER =================== */
  function footerHTML() {
    return '' +
      '<div class="wrap footer__grid">' +
        '<div class="footer__brand"><span class="logo logo--footer">dripdrip</span>' +
          '<p>Authenticated luxury. Bags and shoes — verified, on-hand, ready to ship.</p></div>' +
        '<div class="footer__col"><h4>SHOP</h4><a href="bags">Bags</a><a href="shoes">Shoes</a><a href="account">Track Order</a><a href="request">Request</a></div>' +
        '<div class="footer__col"><h4>HELP</h4><a href="delivery">Delivery</a><a href="returns">Returns &amp; Refunds</a><a href="account">Track Order</a><a href="#">Contact</a></div>' +
        '<div class="footer__col"><h4>COMPANY</h4><a href="about">About Us</a><a href="sell">Sell With Us</a></div>' +
      '</div>' +
      '<div class="wrap footer__bottom"><span>© 2026 dripdrip. All rights reserved.</span><span>Every piece independently authenticated.</span></div>';
  }

  /* =================== OVERLAYS (drawers, search, login) =================== */
  function overlaysHTML() {
    return '' +
      // Cart drawer
      '<div class="drawer" data-drawer="cart"><div class="drawer__backdrop" data-close></div>' +
        '<aside class="drawer__panel" role="dialog" aria-label="Cart">' +
          '<div class="drawer__head"><h3>YOUR CART</h3><button class="drawer__close" data-close aria-label="Close">✕</button></div>' +
          '<div class="drawer__items js-cart-items"></div>' +
          '<div class="drawer__foot"><div class="drawer__total"><span>Subtotal</span><strong class="js-cart-total">£0</strong></div>' +
          '<a href="request" class="btn btn--solid btn--block js-checkout">REQUEST ORDER</a></div>' +
        '</aside></div>' +
      // Wishlist drawer
      '<div class="drawer" data-drawer="wishlist"><div class="drawer__backdrop" data-close></div>' +
        '<aside class="drawer__panel" role="dialog" aria-label="Wishlist">' +
          '<div class="drawer__head"><h3>YOUR WISHLIST</h3><button class="drawer__close" data-close aria-label="Close">✕</button></div>' +
          '<div class="drawer__items js-wish-items"></div>' +
        '</aside></div>' +
      // Search overlay
      '<div class="search" data-drawer="search"><div class="search__backdrop" data-close></div>' +
        '<div class="search__panel"><div class="wrap">' +
          '<div class="search__bar">' + ICONS.search +
            '<input type="text" class="js-search-input" placeholder="Search brands & products — try “Chanel”, “Jordan”, “Rolex”" aria-label="Search" />' +
            '<button class="search__close" data-close aria-label="Close">✕</button></div>' +
          '<div class="search__results js-search-results"><p class="search__hint">Start typing to search the collection.</p></div>' +
        '</div></div></div>' +
      // Login / account modal
      '<div class="modal" data-drawer="account"><div class="modal__backdrop" data-close></div>' +
        '<div class="modal__panel js-account-panel" role="dialog" aria-label="Account"></div></div>' +
      // Size picker modal (shown before adding a sized item to the cart)
      '<div class="modal" data-drawer="size"><div class="modal__backdrop" data-close></div>' +
        '<div class="modal__panel js-size-panel" role="dialog" aria-label="Choose a size"></div></div>' +
      // Mobile menu
      '<div class="mobile-nav" data-drawer="menu"><div class="mobile-nav__backdrop" data-close></div>' +
        '<nav class="mobile-nav__panel">' +
          '<button class="mobile-nav__close" data-close aria-label="Close">✕</button>' +
          NAV.map(function (n) { return '<a href="' + n.href + '">' + n.label + '</a>'; }).join('') +
          '<a href="account">MY ORDERS</a>' +
        '</nav></div>' +
      // Toast
      '<div class="toast js-toast" aria-live="polite"></div>';
  }

  /* =================== PRODUCT CARD (shared) =================== */
  function cardHTML(p) {
    return '' +
      '<article class="card" data-id="' + p.id + '">' +
        '<div class="card__media">' +
          '<span class="card__badge' + (p.isNew ? ' card__badge--new' : '') + '">' + esc(p.badge) + '</span>' +
          '<button class="card__wish' + (Store.inWishlist(p.id) ? ' is-active' : '') + '" data-wish aria-label="Wishlist">' + ICONS.heart + '</button>' +
          ((p.images && p.images.length > 1) ? '<img class="card__img card__img--alt" src="' + p.images[1] + '" alt="" loading="lazy" />' : '') +
          '<img class="card__img card__img--main" src="' + p.img + '" alt="' + esc(p.brand + ' ' + p.name) + '" loading="lazy" />' +
          '<button class="card__add" data-add>ADD TO CART</button>' +
        '</div>' +
        '<div class="card__body">' +
          '<div class="card__brand">' + esc(p.brand) + '</div>' +
          '<div class="card__name">' + esc(p.name) + '</div>' +
          '<div class="card__row"><span class="card__price">' + money(p.price) + '</span><span class="card__cond">' + esc(p.condition) + '</span></div>' +
        '</div>' +
      '</article>';
  }

  /* =================== RENDER helpers =================== */
  function renderBadges() {
    document.querySelectorAll('.js-cart-count').forEach(function (el) { el.textContent = Store.cartCount(); });
    document.querySelectorAll('.js-wish-count').forEach(function (el) { el.textContent = Store.wishCount(); });
    var u = Store.getUser();
    document.querySelectorAll('.js-login-label').forEach(function (el) { el.textContent = u ? (u.name.split(' ')[0].toUpperCase()) : 'LOGIN'; });
    // keep card hearts in sync
    document.querySelectorAll('.card').forEach(function (c) {
      var w = c.querySelector('[data-wish]');
      if (w) w.classList.toggle('is-active', Store.inWishlist(c.dataset.id));
    });
  }

  function renderCart() {
    var items = Store.getCart();
    var box = document.querySelector('.js-cart-items');
    if (!box) return;
    box.innerHTML = items.length ? items.map(function (p, i) {
      return '<div class="d-item"><img src="' + p.img + '" alt="' + esc(p.name) + '" />' +
        '<div class="d-item__info"><div class="d-item__brand">' + esc(p.brand) + '</div>' +
        '<div class="d-item__name">' + esc(p.name) + '</div>' +
        (p.chosenSize ? '<div class="d-item__size">Size: ' + esc(p.chosenSize) + '</div>' : '') +
        '<div class="d-item__qty">' +
          '<button class="d-item__qbtn" data-qty-dec="' + i + '" aria-label="Decrease quantity">−</button>' +
          '<span class="d-item__qn">' + p.qty + '</span>' +
          '<button class="d-item__qbtn" data-qty-inc="' + i + '" aria-label="Increase quantity">+</button>' +
        '</div>' +
        '<div class="d-item__price">' + money(p.price * p.qty) +
          (p.qty > 1 ? ' <span class="d-item__each">(' + money(p.price) + ' each)</span>' : '') + '</div></div>' +
        '<button class="d-item__remove" data-remove-cart="' + i + '">Remove</button></div>';
    }).join('') : '<p class="drawer__empty">Your cart is empty.</p>';
    document.querySelectorAll('.js-cart-total').forEach(function (el) { el.textContent = money(Store.cartTotal()); });
  }

  function renderWish() {
    var items = Store.getWishlist();
    var box = document.querySelector('.js-wish-items');
    if (!box) return;
    box.innerHTML = items.length ? items.map(function (p) {
      return '<div class="d-item" data-id="' + p.id + '"><img src="' + p.img + '" alt="' + esc(p.name) + '" />' +
        '<div class="d-item__info"><div class="d-item__brand">' + esc(p.brand) + '</div>' +
        '<div class="d-item__name">' + esc(p.name) + '</div><div class="d-item__price">' + money(p.price) + '</div>' +
        '<button class="d-item__move" data-move-cart="' + p.id + '">Move to cart</button></div>' +
        '<button class="d-item__remove" data-remove-wish="' + p.id + '">Remove</button></div>';
    }).join('') : '<p class="drawer__empty">Your wishlist is empty.</p>';
  }

  /* =================== ACCOUNT / LOGIN =================== */
  var authMode = 'signin';   // or 'signup'

  function renderAccount() {
    var panel = document.querySelector('.js-account-panel');
    if (!panel) return;
    var auth = window.TiaoAuth;
    var u = auth && auth.isLoggedIn() ? auth.getUser() : null;

    if (u) {
      panel.innerHTML = '' +
        '<button class="modal__close" data-close aria-label="Close">✕</button>' +
        '<div class="account"><div class="account__avatar">' + esc((u.email || '?').charAt(0).toUpperCase()) + '</div>' +
        '<h3>Your account</h3><p>' + esc(u.email) + '</p>' +
        '<div class="account__links"><a href="account">My Orders</a><a href="#" data-open="wishlist">My Wishlist</a></div>' +
        '<button class="btn btn--outline btn--block js-signout">SIGN OUT</button></div>';
      return;
    }
    if (!auth || !auth.isReady()) {
      panel.innerHTML = '<button class="modal__close" data-close aria-label="Close">✕</button>' +
        '<div class="login"><span class="login__logo">dripdrip</span><h3>Sign in</h3>' +
        '<p>Accounts aren’t connected yet.</p></div>';
      return;
    }
    var signup = authMode === 'signup';
    var gIcon = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>';
    var dIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#5865F2"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.25.5a18.3 18.3 0 0 1 4.34 1.35 15.6 15.6 0 0 0-11.06 0A18 18 0 0 1 12.8 3.5L12.56 3A19.7 19.7 0 0 0 7.7 4.4C4.55 9.06 3.7 13.6 4.12 18.08a19.9 19.9 0 0 0 6.06 3.06l.48-.66a13 13 0 0 1-1.9-.92l.16-.12a14.2 14.2 0 0 0 12.15 0l.16.12c-.6.36-1.24.67-1.9.92l.48.66a19.8 19.8 0 0 0 6.06-3.06c.5-5.2-.86-9.7-3.28-13.68zM9.68 15.33c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42s2.17 1.1 2.15 2.42c0 1.34-.96 2.42-2.15 2.42zm4.64 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42s2.17 1.1 2.15 2.42c0 1.34-.95 2.42-2.15 2.42z"/></svg>';
    panel.innerHTML = '' +
      '<button class="modal__close" data-close aria-label="Close">✕</button>' +
      '<div class="login"><span class="login__logo">dripdrip</span>' +
      '<h3>' + (signup ? 'Create account' : 'Sign in') + '</h3>' +
      '<p>' + (signup ? 'Join dripdrip to track your orders.' : 'Access your orders and faster checkout.') + '</p>' +
      '<div class="login__social">' +
        '<button type="button" class="login__soc" data-oauth="google">' + gIcon + 'Continue with Google</button>' +
        '<button type="button" class="login__soc" data-oauth="discord">' + dIcon + 'Continue with Discord</button>' +
      '</div>' +
      '<div class="login__divider"><span>or with email</span></div>' +
      '<form class="login__form js-auth-form">' +
        '<input type="email" name="email" placeholder="Email address" required aria-label="Email" autocomplete="email" />' +
        '<input type="password" name="password" placeholder="Password (min 6 characters)" required minlength="6" aria-label="Password" autocomplete="' + (signup ? 'new-password' : 'current-password') + '" />' +
        '<button type="submit" class="btn btn--solid btn--block js-auth-submit">' + (signup ? 'CREATE ACCOUNT' : 'SIGN IN') + '</button>' +
      '</form>' +
      '<p class="login__msg js-auth-msg" hidden></p>' +
      '<p class="login__toggle">' + (signup ? 'Already have an account? ' : 'New to dripdrip? ') +
        '<a href="#" class="js-auth-toggle">' + (signup ? 'Sign in' : 'Create an account') + '</a></p>' +
      '<p class="login__fine">By continuing you agree to dripdrip’s Terms & Privacy Policy.</p></div>';
  }

  function syncStore(user) {
    if (user) Store.signIn({ name: (user.email || 'Member').split('@')[0], email: user.email, picture: '' });
    else Store.signOut();
  }

  function decodeJWT(token) {
    try {
      var p = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(escape(atob(p))));
    } catch (e) { return {}; }
  }

  function mountGoogle() {
    var slot = document.querySelector('.js-gbtn');
    if (!slot) return;
    var hasReal = CFG.GOOGLE_CLIENT_ID && window.google && google.accounts && google.accounts.id;
    if (hasReal) {
      google.accounts.id.initialize({
        client_id: CFG.GOOGLE_CLIENT_ID,
        callback: function (res) {
          var d = decodeJWT(res.credential);
          Store.signIn({ name: d.name || 'Member', email: d.email || '', picture: d.picture || '' });
          toast('Signed in with Google'); closeAll();
        }
      });
      google.accounts.id.renderButton(slot, { theme: 'outline', size: 'large', width: 320, text: 'continue_with' });
    } else {
      // DEMO fallback — no real Google account required
      slot.innerHTML = '<button class="gbtn-demo" type="button">' +
        '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>' +
        'Continue with Google</button>';
      slot.querySelector('.gbtn-demo').addEventListener('click', function () {
        Store.signIn({ name: 'Tiao Member', email: 'member@dripdrip.store', picture: '' });
        toast('Signed in (demo)'); closeAll();
      });
    }
  }

  /* =================== SIZE PICKER =================== */
  // Add-to-cart for a sized item: show its sizes, and add once one is chosen.
  function openSize(p) {
    var panel = document.querySelector('.js-size-panel');
    if (!panel) { Store.addToCart(p.id, ''); toast('Added to cart'); open('cart'); return; }
    var pills = p.sizes.map(function (s) {
      return '<button type="button" class="sizepick__opt" data-size="' + esc(s) + '" data-id="' + esc(p.id) + '">' + esc(s) + '</button>';
    }).join('');
    panel.innerHTML =
      '<button class="modal__close" data-close aria-label="Close">✕</button>' +
      '<div class="sizepick">' +
        '<div class="sizepick__brand">' + esc(p.brand) + '</div>' +
        '<div class="sizepick__name">' + esc(p.name) + '</div>' +
        '<div class="sizepick__label">Select a size</div>' +
        '<div class="sizepick__opts">' + pills + '</div>' +
        '<p class="sizepick__hint">Tap a size to add it to your cart.</p>' +
      '</div>';
    var el = document.querySelector('[data-drawer="size"]');
    el.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  /* =================== SEARCH =================== */
  function runSearch(q) {
    var box = document.querySelector('.js-search-results');
    q = q.trim().toLowerCase();
    if (!q) { box.innerHTML = '<p class="search__hint">Start typing to search the collection.</p>'; return; }
    var hits = PRODUCTS.filter(function (p) {
      return (p.brand + ' ' + p.name + ' ' + p.category).toLowerCase().indexOf(q) !== -1;
    });
    box.innerHTML = hits.length
      ? '<div class="product-grid product-grid--search">' + hits.map(cardHTML).join('') + '</div>'
      : '<p class="search__hint">No matches for “' + esc(q) + '”. Try a brand like Chanel, Dior or Rolex.</p>';
    renderBadges();
  }

  /* =================== TOAST =================== */
  var toastTimer;
  function toast(msg) {
    var el = document.querySelector('.js-toast');
    if (!el) return;
    el.textContent = msg; el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-show'); }, 2200);
  }

  /* =================== OPEN / CLOSE =================== */
  function open(name) {
    var el = document.querySelector('[data-drawer="' + name + '"]');
    if (!el) return;
    if (name === 'cart') renderCart();
    if (name === 'wishlist') renderWish();
    if (name === 'account') renderAccount();
    el.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (name === 'search') { var i = el.querySelector('.js-search-input'); if (i) setTimeout(function () { i.focus(); }, 60); }
  }
  function closeAll() {
    document.querySelectorAll('[data-drawer]').forEach(function (el) { el.classList.remove('is-open'); });
    document.body.style.overflow = '';
  }

  /* =================== INIT =================== */
  function init() {
    var header = document.getElementById('site-header');
    var footer = document.getElementById('site-footer');
    if (header) header.innerHTML = headerHTML();
    if (footer) footer.innerHTML = footerHTML();
    var ov = document.createElement('div');
    ov.innerHTML = overlaysHTML();
    document.body.appendChild(ov);

    // Global click handling (event delegation)
    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-open]');
      if (opener) { e.preventDefault(); open(opener.getAttribute('data-open')); return; }
      if (e.target.closest('[data-close]')) { closeAll(); return; }

      var sizeOpt = e.target.closest('[data-size]');
      if (sizeOpt) { closeAll(); Store.addToCart(sizeOpt.dataset.id, sizeOpt.dataset.size); toast('Added to cart · ' + sizeOpt.dataset.size); open('cart'); return; }

      var add = e.target.closest('[data-add]');
      if (add) {
        var id = add.closest('.card').dataset.id;
        var p = findProduct(id);
        if (p && p.sizes && p.sizes.length) { openSize(p); }
        else { Store.addToCart(id, ''); toast('Added to cart'); open('cart'); }
        return;
      }

      var wishBtn = e.target.closest('[data-wish]');
      if (wishBtn) { var wid = wishBtn.closest('.card').dataset.id; var on = Store.toggleWishlist(wid); toast(on ? 'Added to wishlist' : 'Removed from wishlist'); return; }

      var qi = e.target.closest('[data-qty-inc]'); if (qi) { Store.changeQty(+qi.dataset.qtyInc, 1); return; }
      var qd = e.target.closest('[data-qty-dec]'); if (qd) { Store.changeQty(+qd.dataset.qtyDec, -1); return; }
      var rc = e.target.closest('[data-remove-cart]'); if (rc) { Store.removeFromCart(+rc.dataset.removeCart); return; }
      var rw = e.target.closest('[data-remove-wish]'); if (rw) { Store.removeFromWishlist(rw.dataset.removeWish); return; }
      var mc = e.target.closest('[data-move-cart]'); if (mc) { Store.addToCart(mc.dataset.moveCart); Store.removeFromWishlist(mc.dataset.moveCart); toast('Moved to cart'); return; }
      if (e.target.closest('.js-signout')) {
        if (window.TiaoAuth) window.TiaoAuth.signOut();
        syncStore(null); toast('Signed out'); renderAccount(); return;
      }
      if (e.target.closest('.js-auth-toggle')) {
        e.preventDefault(); authMode = (authMode === 'signup' ? 'signin' : 'signup'); renderAccount(); return;
      }
      var oauthBtn = e.target.closest('[data-oauth]');
      if (oauthBtn) { e.preventDefault(); if (window.TiaoAuth) window.TiaoAuth.oauth(oauthBtn.dataset.oauth); return; }
    });

    // Search input
    document.addEventListener('input', function (e) {
      if (e.target.classList.contains('js-search-input')) runSearch(e.target.value);
    });
    // Real customer auth (sign in / create account) via TiaoAuth
    document.addEventListener('submit', function (e) {
      if (!e.target.classList.contains('js-auth-form')) return;
      e.preventDefault();
      var form = e.target, btn = form.querySelector('.js-auth-submit');
      var msgEl = document.querySelector('.js-auth-msg');
      var email = form.email.value.trim(), pass = form.password.value;
      var signup = authMode === 'signup';
      btn.disabled = true; btn.textContent = signup ? 'CREATING…' : 'SIGNING IN…';
      if (msgEl) msgEl.hidden = true;

      var done = function () { btn.disabled = false; btn.textContent = signup ? 'CREATE ACCOUNT' : 'SIGN IN'; };
      var fail = function (m) { done(); if (msgEl) { msgEl.hidden = false; msgEl.textContent = m; } };

      var op = signup ? window.TiaoAuth.signUp(email, pass) : window.TiaoAuth.signIn(email, pass);
      op.then(function (res) {
        if (signup && res && res.needsConfirm) {
          done();
          if (msgEl) { msgEl.hidden = false; msgEl.classList.add('login__msg--ok'); msgEl.textContent = 'Check your email to confirm, then sign in.'; }
          authMode = 'signin';
          return;
        }
        syncStore(window.TiaoAuth.getUser());
        toast(signup ? 'Welcome to dripdrip' : 'Signed in');
        closeAll();
      }).catch(function (err) { fail(err.message || 'Something went wrong'); });
    });
    // Esc closes
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

    Store.onChange(function () { renderBadges(); renderCart(); renderWish(); });

    // reflect the real (TiaoAuth) sign-in state in the header
    if (window.TiaoAuth && window.TiaoAuth.isLoggedIn()) syncStore(window.TiaoAuth.getUser());
    else if (window.TiaoAuth && Store.getUser()) syncStore(null);   // stale — clear it
    document.addEventListener('tiao:auth', function () {
      syncStore(window.TiaoAuth.getUser()); renderBadges(); renderAccount(); toast('Signed in');
    });
    document.addEventListener('tiao:auth-error', function (e) {
      toast('Sign-in failed: ' + ((e.detail && e.detail.message) || 'please try again'));
    });

    renderBadges();

    // Once the catalogue is loaded, drop any cart items that no longer exist
    // so the count matches what's actually in the drawer.
    (window.TIAO_CATALOG_READY || Promise.resolve()).then(function () {
      Store.pruneCart(); renderBadges(); renderCart();
    });
  }

  // expose card renderer for page scripts
  window.UI = { card: cardHTML, refresh: renderBadges };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
