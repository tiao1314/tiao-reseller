(function () {
  'use strict';

  var products = window.TEMPLATE_PRODUCTS || [];
  var cart = [];

  var grid = document.getElementById('productGrid');
  var cartCount = document.getElementById('cartCount');
  var cartTotal = document.getElementById('cartTotal');
  var drawer = document.getElementById('drawer');
  var drawerItems = document.getElementById('drawerItems');

  function money(n) { return '£' + n.toLocaleString('en-GB'); }

  /* ---- Render product cards ---- */
  function renderProducts() {
    grid.innerHTML = products.map(function (p) {
      return '' +
        '<article class="card" data-id="' + p.id + '">' +
          '<div class="card__media">' +
            '<span class="card__badge' + (p.new ? ' card__badge--new' : '') + '">' + p.badge + '</span>' +
            '<button class="card__wish" aria-label="Add to wishlist">' +
              '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 20s-7-4.5-9.5-9C1 8 2.5 4.5 6 4.5c2 0 3.3 1.2 4 2.4.7-1.2 2-2.4 4-2.4 3.5 0 5 3.5 3.5 6.5C19 15.5 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>' +
            '</button>' +
            '<img src="' + p.img + '" alt="' + p.brand + ' ' + p.name + '" loading="lazy" />' +
            '<button class="card__add" data-add>ADD TO CART</button>' +
          '</div>' +
          '<div class="card__body">' +
            '<div class="card__brand">' + p.brand + '</div>' +
            '<div class="card__name">' + p.name + '</div>' +
            '<div class="card__row">' +
              '<span class="card__price">' + money(p.price) + '</span>' +
              '<span class="card__cond">' + p.condition + '</span>' +
            '</div>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  /* ---- Cart ---- */
  function renderCart() {
    cartCount.textContent = cart.length;
    var total = cart.reduce(function (s, i) { return s + i.price; }, 0);
    cartTotal.textContent = money(total);

    if (!cart.length) {
      drawerItems.innerHTML = '<p class="drawer__empty">Your cart is empty.</p>';
      return;
    }
    drawerItems.innerHTML = cart.map(function (p, i) {
      return '' +
        '<div class="d-item">' +
          '<img src="' + p.img + '" alt="' + p.name + '" />' +
          '<div class="d-item__info">' +
            '<div class="d-item__brand">' + p.brand + '</div>' +
            '<div class="d-item__name">' + p.name + '</div>' +
            '<div class="d-item__price">' + money(p.price) + '</div>' +
          '</div>' +
          '<button class="d-item__remove" data-remove="' + i + '">Remove</button>' +
        '</div>';
    }).join('');
  }

  function addToCart(id) {
    var p = products.find(function (x) { return x.id === id; });
    if (p) { cart.push(p); renderCart(); openDrawer(); }
  }

  function openDrawer() { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); }
  function closeDrawer() { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); }

  /* ---- Events ---- */
  grid.addEventListener('click', function (e) {
    var addBtn = e.target.closest('[data-add]');
    if (addBtn) { addToCart(addBtn.closest('.card').dataset.id); return; }
    var wish = e.target.closest('.card__wish');
    if (wish) { wish.classList.toggle('is-active'); }
  });

  document.getElementById('cartBtn').addEventListener('click', openDrawer);

  drawer.addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-close')) { closeDrawer(); return; }
    var rm = e.target.closest('[data-remove]');
    if (rm) { cart.splice(+rm.dataset.remove, 1); renderCart(); }
  });

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

  /* ---- Mobile menu ---- */
  var burger = document.getElementById('burger');
  var mobileNav = document.createElement('nav');
  mobileNav.className = 'mobile-nav';
  mobileNav.innerHTML = ['BAGS', 'SHOES', 'WATCHES', 'ACCESSORIES']
    .map(function (t) { return '<a href="#grid">' + t + '</a>'; }).join('');
  document.body.appendChild(mobileNav);
  burger.addEventListener('click', function () {
    var open = mobileNav.classList.toggle('is-open');
    burger.classList.toggle('is-active', open);
  });
  mobileNav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') mobileNav.classList.remove('is-open');
  });

  /* ---- Newsletter ---- */
  var form = document.getElementById('newsletterForm');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    form.reset();
    document.getElementById('newsletterNote').hidden = false;
  });

  renderProducts();
  renderCart();
})();
