// ===== tiao — shared UI: header, footer, drawers, search, login =====
(function () {
  'use strict';

  var CFG = window.TIAO_CONFIG || {};
  var PRODUCTS = window.TIAO_PRODUCTS || [];

  function money(n) { return '£' + n.toLocaleString('en-GB'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  var ICONS = {
    search: '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    heart: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 20s-7-4.5-9.5-9C1 8 2.5 4.5 6 4.5c2 0 3.3 1.2 4 2.4.7-1.2 2-2.4 4-2.4 3.5 0 5 3.5 3.5 6.5C19 15.5 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    cart: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 8h12l-1 12H7L6 8z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'
  };

  var NAV = [
    { label: 'BAGS', href: 'bags.html' },
    { label: 'SHOES', href: 'shoes.html' },
    { label: 'WATCHES', href: 'watches.html' },
    { label: 'ACCESSORIES', href: 'accessories.html' }
  ];

  /* =================== HEADER =================== */
  function headerHTML() {
    var links = NAV.map(function (n) { return '<a href="' + n.href + '" class="nav__link">' + n.label + '</a>'; }).join('');
    return '' +
      '<div class="announce"><div class="wrap announce__inner">' +
        '<span class="announce__msg">FREE UK DELIVERY OVER £250 · 100% AUTHENTICATED · WORLDWIDE SHIPPING</span>' +
        '<nav class="announce__links"><a href="#">Track Order</a><span>|</span><a href="#">Help</a></nav>' +
      '</div></div>' +
      '<div class="wrap header__inner">' +
        '<nav class="nav nav--left">' + links + '</nav>' +
        '<a href="index.html" class="logo">tiao</a>' +
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
        '<div class="footer__brand"><span class="logo logo--footer">tiao</span>' +
          '<p>Authenticated luxury resale. Bags, shoes, watches and accessories — verified, on-hand, ready to ship.</p></div>' +
        '<div class="footer__col"><h4>SHOP</h4><a href="bags.html">Bags</a><a href="shoes.html">Shoes</a><a href="watches.html">Watches</a><a href="accessories.html">Accessories</a></div>' +
        '<div class="footer__col"><h4>HELP</h4><a href="#">Authentication</a><a href="#">Shipping</a><a href="#">Returns</a><a href="#">Contact</a></div>' +
        '<div class="footer__col"><h4>COMPANY</h4><a href="#">About</a><a href="#">Sell With Us</a><a href="#">Careers</a><a href="#">Terms & Privacy</a></div>' +
      '</div>' +
      '<div class="wrap footer__bottom"><span>© 2026 tiao. All rights reserved.</span><span>Every piece independently authenticated.</span></div>';
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
          '<a href="request.html" class="btn btn--solid btn--block js-checkout">REQUEST ORDER</a></div>' +
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
      // Mobile menu
      '<div class="mobile-nav" data-drawer="menu"><div class="mobile-nav__backdrop" data-close></div>' +
        '<nav class="mobile-nav__panel">' +
          '<button class="mobile-nav__close" data-close aria-label="Close">✕</button>' +
          NAV.map(function (n) { return '<a href="' + n.href + '">' + n.label + '</a>'; }).join('') +
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
          '<img src="' + p.img + '" alt="' + esc(p.brand + ' ' + p.name) + '" loading="lazy" />' +
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
        '<div class="d-item__name">' + esc(p.name) + '</div><div class="d-item__price">' + money(p.price) + '</div></div>' +
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
  function renderAccount() {
    var panel = document.querySelector('.js-account-panel');
    if (!panel) return;
    var u = Store.getUser();
    if (u) {
      panel.innerHTML = '' +
        '<button class="modal__close" data-close aria-label="Close">✕</button>' +
        '<div class="account"><div class="account__avatar">' + (u.picture ? '<img src="' + u.picture + '" alt="">' : esc(u.name.charAt(0).toUpperCase())) + '</div>' +
        '<h3>Hi, ' + esc(u.name) + '</h3><p>' + esc(u.email) + '</p>' +
        '<div class="account__links"><a href="#">My Orders</a><a href="wishlist" data-open="wishlist">My Wishlist</a><a href="#">Account Settings</a></div>' +
        '<button class="btn btn--outline btn--block js-signout">SIGN OUT</button></div>';
    } else {
      panel.innerHTML = '' +
        '<button class="modal__close" data-close aria-label="Close">✕</button>' +
        '<div class="login"><span class="login__logo">tiao</span><h3>Sign in</h3><p>Access your orders, wishlist and faster checkout.</p>' +
        '<div class="js-gbtn login__gbtn"></div>' +
        '<div class="login__divider"><span>or</span></div>' +
        '<form class="login__form js-email-form"><input type="email" placeholder="Email address" required aria-label="Email" />' +
        '<input type="password" placeholder="Password" required aria-label="Password" />' +
        '<button type="submit" class="btn btn--solid btn--block">CONTINUE</button></form>' +
        '<p class="login__fine">By continuing you agree to tiao’s Terms & Privacy Policy.</p></div>';
      mountGoogle();
    }
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
        Store.signIn({ name: 'Tiao Member', email: 'member@tiao.store', picture: '' });
        toast('Signed in (demo)'); closeAll();
      });
    }
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

      var add = e.target.closest('[data-add]');
      if (add) { var id = add.closest('.card').dataset.id; Store.addToCart(id); toast('Added to cart'); open('cart'); return; }

      var wishBtn = e.target.closest('[data-wish]');
      if (wishBtn) { var wid = wishBtn.closest('.card').dataset.id; var on = Store.toggleWishlist(wid); toast(on ? 'Added to wishlist' : 'Removed from wishlist'); return; }

      var rc = e.target.closest('[data-remove-cart]'); if (rc) { Store.removeFromCart(+rc.dataset.removeCart); return; }
      var rw = e.target.closest('[data-remove-wish]'); if (rw) { Store.removeFromWishlist(rw.dataset.removeWish); return; }
      var mc = e.target.closest('[data-move-cart]'); if (mc) { Store.addToCart(mc.dataset.moveCart); Store.removeFromWishlist(mc.dataset.moveCart); toast('Moved to cart'); return; }
      if (e.target.closest('.js-signout')) { Store.signOut(); toast('Signed out'); renderAccount(); return; }
    });

    // Search input
    document.addEventListener('input', function (e) {
      if (e.target.classList.contains('js-search-input')) runSearch(e.target.value);
    });
    // Email login (demo)
    document.addEventListener('submit', function (e) {
      if (e.target.classList.contains('js-email-form')) {
        e.preventDefault();
        var email = e.target.querySelector('input[type=email]').value;
        var name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
        Store.signIn({ name: name || 'Member', email: email, picture: '' });
        toast('Signed in'); closeAll();
      }
    });
    // Esc closes
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

    Store.onChange(function () { renderBadges(); renderCart(); renderWish(); });
    renderBadges();
  }

  // expose card renderer for page scripts
  window.UI = { card: cardHTML, refresh: renderBadges };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
