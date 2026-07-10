// ===== dripdrip — admin panel (orders + dashboard) =====
(function () {
  'use strict';

  var CFG = window.TIAO_CONFIG || {};
  var REST = (CFG.SUPABASE_URL || '') + '/rest/v1/';
  var AUTH = (CFG.SUPABASE_URL || '') + '/auth/v1/';
  var TKEY = 'tiao_admin_token', RKEY = 'tiao_admin_refresh', EKEY = 'tiao_admin_email';
  var token = localStorage.getItem(TKEY) || '';
  var userEmail = localStorage.getItem(EKEY) || '';

  // Direct REST helpers (no supabase-js). apikey identifies the project; the
  // Bearer is the admin's session token, resolving to the authenticated role.
  function headers(extra) {
    var h = { 'apikey': CFG.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token };
    if (extra) { for (var k in extra) h[k] = extra[k]; }
    return h;
  }
  function saveSession(d) {
    token = d.access_token;
    if (d.user && d.user.email) userEmail = d.user.email;
    localStorage.setItem(TKEY, token);
    if (d.refresh_token) localStorage.setItem(RKEY, d.refresh_token);
    localStorage.setItem(EKEY, userEmail);
  }
  // Exchange the refresh token for a fresh access token when the old one expires.
  function refreshSession() {
    var rt = localStorage.getItem(RKEY);
    if (!rt) return Promise.reject(new Error('no-refresh'));
    return fetch(AUTH + 'token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': CFG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.access_token) throw new Error('refresh-failed');
      saveSession(d); return token;
    });
  }
  // Core request with one automatic token-refresh + retry on 401.
  function request(method, path, extraHeaders, body, retried) {
    var opts = { method: method, headers: headers(extraHeaders) };
    if (body != null) opts.body = body;
    return fetch(REST + path, opts).then(function (r) {
      if (r.status === 401 && !retried) {
        return refreshSession()
          .then(function () { return request(method, path, extraHeaders, body, true); })
          .catch(function () { authFail(); throw new Error('Session expired'); });
      }
      return r.text().then(function (t) {
        if (!r.ok) throw new Error('HTTP ' + r.status + (t ? ' — ' + t : ''));
        return t ? JSON.parse(t) : [];
      });
    });
  }
  function apiGet(path) { return request('GET', path); }
  function apiPatch(path, bodyObj) {
    return request('PATCH', path, { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, JSON.stringify(bodyObj));
  }
  function authFail() {
    token = ''; localStorage.removeItem(TKEY); localStorage.removeItem(RKEY);
    showLogin();
    var m = el('loginMsg'); if (m) { m.hidden = false; m.textContent = 'Your session expired — please sign in again.'; }
  }

  var CONFIRMED = ['accepted', 'shipped', 'delivered']; // count toward revenue/profit
  var STATUSES = ['pending', 'accepted', 'declined', 'shipped', 'delivered'];
  var STATUS_META = {
    pending:  { label: 'Pending',  cls: 'warning',  icon: '●' },
    accepted: { label: 'Accepted', cls: 'good',     icon: '✓' },
    declined: { label: 'Declined', cls: 'critical', icon: '✕' },
    shipped:  { label: 'Shipped',  cls: 'info',     icon: '➤' },
    delivered:{ label: 'Delivered',cls: 'neutral',  icon: '✓✓' }
  };

  var el = function (id) { return document.getElementById(id); };
  function money(n) { return '£' + Math.round(n).toLocaleString('en-GB'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  // ---- toast + in-page confirm (replaces browser alert/confirm) ----
  var toastTimer;
  function toast(msg, kind) {
    var t = el('admToast'); if (!t) { return; }
    t.textContent = msg; t.className = 'adm-toast is-show' + (kind ? ' adm-toast--' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'adm-toast'; }, 2800);
  }
  function confirmAction(msg, onOk, okLabel) {
    var box = el('admConfirm'), m = el('admConfirmMsg'), ok = el('admConfirmOk');
    if (!box) { if (window.confirm(msg)) onOk(); return; }   // fallback
    m.textContent = msg; ok.textContent = okLabel || 'Confirm';
    box.hidden = false;
    function cleanup() { box.hidden = true; ok.onclick = null; box.querySelectorAll('[data-cno]').forEach(function (b) { b.onclick = null; }); }
    ok.onclick = function () { cleanup(); onOk(); };
    box.querySelectorAll('[data-cno]').forEach(function (b) { b.onclick = cleanup; });
  }

  // ---- activity log: records who did what, when (fails silently if table absent) ----
  function logAction(action, detail) {
    request('POST', 'activity_log', { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      JSON.stringify({ actor_email: userEmail, action: action, detail: detail || '' }))
      .then(function () { if (activityLoaded) loadActivity(); })
      .catch(function () {});
  }

  var state = { orders: [], costs: {}, orderCost: {}, filter: 'all' };

  /* ---------------- boot ---------------- */
  function boot() {
    if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) { el('notConfigured').hidden = false; return; }
    wireAuth();
    if (token) gateThenShow(); else showLogin();
  }

  // Confirm the signed-in user is actually an admin (is_admin() RPC) before
  // revealing the dashboard. A valid Supabase login that isn't an admin is
  // rejected here, not just starved of data.
  function verifyAdmin() {
    return request('POST', 'rpc/is_admin', { 'Content-Type': 'application/json' }, '{}')
      .then(function (r) { return r === true; })
      .catch(function () { return false; });
  }
  function gateThenShow() {
    verifyAdmin().then(function (ok) { if (ok) showApp(); else denyAccess(); });
  }
  function denyAccess(customMsg) {
    token = ''; userEmail = '';
    localStorage.removeItem(TKEY); localStorage.removeItem(RKEY); localStorage.removeItem(EKEY);
    showLogin();
    var m = el('loginMsg'); if (m) { m.hidden = false; m.textContent = customMsg || 'This account isn’t authorised for the admin panel.'; }
  }

  function showLogin() { el('loginGate').hidden = false; el('app').hidden = true; }
  function signedOut() {
    token = ''; userEmail = '';
    localStorage.removeItem(TKEY); localStorage.removeItem(EKEY);
    showLogin();
  }
  function showApp() {
    el('loginGate').hidden = true; el('app').hidden = false;
    el('admUser').textContent = userEmail;
    loadData();
  }

  function wireAuth() {
    el('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, btn = el('loginBtn'), msg = el('loginMsg');
      btn.disabled = true; btn.textContent = 'SIGNING IN…'; msg.hidden = true;
      fetch(AUTH + 'token?grant_type=password', {
        method: 'POST',
        headers: { 'apikey': CFG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: f.email.value.trim(), password: f.password.value })
      }).then(function (r) {
        return r.json().then(function (d) { return { ok: r.ok, d: d }; });
      }).then(function (res) {
        btn.disabled = false; btn.textContent = 'SIGN IN';
        if (!res.ok || !res.d.access_token) {
          msg.hidden = false;
          msg.textContent = (res.d && (res.d.msg || res.d.error_description || res.d.error)) || 'Invalid login credentials';
          return;
        }
        userEmail = (res.d.user && res.d.user.email) || f.email.value.trim();
        saveSession(res.d);
        verifyAdmin().then(function (ok) {
          if (ok) showApp();
          else denyAccess('That account isn’t authorised for the admin panel.');
        });
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'SIGN IN';
        msg.hidden = false; msg.textContent = 'Network error — please try again.';
      });
    });
    el('signoutBtn').addEventListener('click', signedOut);
    el('refreshBtn').addEventListener('click', refreshCurrentView);
  }

  // Refresh reloads the data for whichever tab is showing.
  function refreshCurrentView() {
    loadData();  // dashboard tiles/chart/orders
    if (!el('viewListings').hidden) { listingsLoaded = false; loadListings(); }
    if (!el('viewActivity').hidden) loadActivity();
    if (!el('viewBroadcast').hidden) loadBroadcast();
    toast('Refreshed');
  }

  /* ---------------- data ---------------- */
  function loadData() {
    Promise.all([
      apiGet('orders?select=*&order=created_at.desc'),
      // costs live on the products table (what the listing editor writes to)
      apiGet('products?select=id,cost'),
      // frozen per-order cost snapshots (may not exist until freeze_order_costs.sql is run)
      apiGet('order_costs?select=order_id,cost_total').catch(function () { return []; })
    ]).then(function (r) {
      state.orders = Array.isArray(r[0]) ? r[0] : [];
      state.costs = {};
      (Array.isArray(r[1]) ? r[1] : []).forEach(function (c) { state.costs[c.id] = Number(c.cost) || 0; });
      state.orderCost = {};
      (Array.isArray(r[2]) ? r[2] : []).forEach(function (c) { state.orderCost[c.order_id] = Number(c.cost_total) || 0; });
      renderAll();
    }).catch(function (err) {
      console.error(err);
      // Surface the real error on the dashboard instead of silently failing.
      el('tiles').innerHTML = '<div class="adm-tile adm-tile--warn" style="grid-column:1/-1">' +
        '<span class="adm-tile__label">Couldn’t load orders</span>' +
        '<span class="adm-tile__value" style="font-size:14px;line-height:1.4">' + esc(String(err.message)) + '</span>' +
        '<span class="adm-tile__sub">Screenshot this and send it to me.</span></div>';
    });
  }

  function orderProfit(o) {
    // Prefer the cost FROZEN when the order was placed, so changing a product's
    // cost/price later never rewrites the profit of past orders.
    if (state.orderCost && state.orderCost[o.id] != null) {
      return Number(o.subtotal || 0) - Number(state.orderCost[o.id]);
    }
    // Fallback for orders placed before cost-freezing existed: use current cost.
    var items = Array.isArray(o.items) ? o.items : [];
    return items.reduce(function (s, it) {
      var cost = state.costs[it.id] != null ? state.costs[it.id] : 0;
      return s + (Number(it.price) - cost) * (it.qty || 1);
    }, 0);
  }

  /* ---------------- render ---------------- */
  function renderAll() { renderTiles(); renderChart(); renderFilters(); renderTable(); }

  function renderTiles() {
    var confirmed = state.orders.filter(function (o) { return CONFIRMED.indexOf(o.status) !== -1; });
    var revenue = confirmed.reduce(function (s, o) { return s + Number(o.subtotal || 0); }, 0);
    var profit = confirmed.reduce(function (s, o) { return s + orderProfit(o); }, 0);
    var pending = state.orders.filter(function (o) { return o.status === 'pending'; }).length;
    var aov = confirmed.length ? revenue / confirmed.length : 0;
    var margin = revenue ? (profit / revenue * 100) : 0;

    var tiles = [
      { label: 'Revenue', value: money(revenue), sub: confirmed.length + ' confirmed orders' },
      { label: 'Profit', value: money(profit), sub: margin.toFixed(0) + '% margin', accent: 'profit' },
      { label: 'Avg order value', value: money(aov), sub: 'per confirmed order' },
      { label: 'Needs review', value: String(pending), sub: pending ? 'tap to review pending →' : 'pending requests', accent: pending ? 'warn' : '', jump: 'pending' }
    ];
    el('tiles').innerHTML = tiles.map(function (t) {
      return '<div class="adm-tile' + (t.accent ? ' adm-tile--' + t.accent : '') + (t.jump ? ' adm-tile--click' : '') + '"' + (t.jump ? ' data-jump="' + t.jump + '"' : '') + '>' +
        '<span class="adm-tile__label">' + t.label + '</span>' +
        '<span class="adm-tile__value">' + t.value + '</span>' +
        '<span class="adm-tile__sub">' + t.sub + '</span></div>';
    }).join('');
    var jumpTile = el('tiles').querySelector('[data-jump]');
    if (jumpTile) jumpTile.addEventListener('click', function () {
      state.filter = jumpTile.dataset.jump;
      renderFilters(); renderTable();
      var tbl = el('ordersTable'); if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ---- SVG line chart: revenue + profit over time (by day) ---- */
  var chartSeries = { rev: true, prof: true };
  function legendBtn(key, label) {
    var on = chartSeries[key];
    return '<button class="adm-key adm-key--btn ' + (on ? 'is-on' : 'is-off') + '" data-series="' + key + '">' +
      '<span class="adm-tick"><i class="adm-swatch adm-swatch--' + key + '"></i></span>' + label + '</button>';
  }
  function renderChart() {
    var host = el('chart');
    var confirmed = state.orders.filter(function (o) { return CONFIRMED.indexOf(o.status) !== -1; });

    // group by day
    var byDay = {};
    confirmed.forEach(function (o) {
      var d = (o.created_at || '').slice(0, 10);
      if (!byDay[d]) byDay[d] = { rev: 0, prof: 0 };
      byDay[d].rev += Number(o.subtotal || 0);
      byDay[d].prof += orderProfit(o);
    });
    var days = Object.keys(byDay).sort();

    el('chartLegend').innerHTML = legendBtn('rev', 'Revenue') + legendBtn('prof', 'Profit');
    el('chartLegend').querySelectorAll('[data-series]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.series;
        var onCount = (chartSeries.rev ? 1 : 0) + (chartSeries.prof ? 1 : 0);
        if (chartSeries[k] && onCount === 1) return;   // keep at least one series visible
        chartSeries[k] = !chartSeries[k];
        renderChart();
      });
    });

    if (days.length === 0) {
      host.innerHTML = '<p class="adm-empty">No confirmed orders yet — accept an order to see it here.</p>';
      return;
    }

    var W = Math.max(host.clientWidth || 760, 320), H = 300;
    var m = { t: 24, r: 66, b: 40, l: 64 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var maxV = Math.max.apply(null, days.map(function (d) {
      return Math.max(chartSeries.rev ? byDay[d].rev : 0, chartSeries.prof ? byDay[d].prof : 0);
    }).concat([1]));
    var step = Math.pow(10, Math.floor(Math.log10(maxV)));
    var niceMax = Math.ceil(maxV / step) * step || 1;

    var single = days.length === 1;
    var xAt = function (i) { return single ? m.l + iw / 2 : m.l + (iw * i / (days.length - 1)); };
    var yAt = function (v) { return m.t + ih - (ih * v / niceMax); };
    var baseY = m.t + ih;

    // Build point lists. For a single day we render a flat line across the full
    // width so it clearly reads as a level, not a lone dot.
    function coords(key) {
      if (single) {
        var y = yAt(byDay[days[0]][key]);
        return [{ x: m.l, y: y }, { x: xAt(0), y: y, mark: true }, { x: W - m.r, y: y }];
      }
      return days.map(function (d, i) { return { x: xAt(i), y: yAt(byDay[d][key]), mark: true, i: i }; });
    }
    function lineD(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' '); }
    function areaD(pts) { return lineD(pts) + ' L' + pts[pts.length - 1].x.toFixed(1) + ' ' + baseY + ' L' + pts[0].x.toFixed(1) + ' ' + baseY + ' Z'; }
    function dots(pts, cls) {
      return pts.filter(function (p) { return p.mark; }).map(function (p) {
        return '<circle class="adm-dot ' + cls + '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="5"/>';
      }).join('');
    }
    // value labels above each marked point (only when the data is sparse enough to stay legible)
    function valueLabels(pts, key, cls) {
      if (days.length > 8) return '';
      return pts.filter(function (p) { return p.mark; }).map(function (p, k) {
        var v = single ? byDay[days[0]][key] : byDay[days[k]][key];
        var dy = key === 'prof' ? 18 : -10;   // profit label below its point, revenue above, to avoid overlap
        return '<text class="adm-vlabel ' + cls + '" x="' + p.x.toFixed(1) + '" y="' + (p.y + dy).toFixed(1) + '" text-anchor="middle">' + money(v) + '</text>';
      }).join('');
    }

    var revPts = coords('rev'), profPts = coords('prof');

    // gridlines + y labels
    var grid = '', GY = 4;
    for (var g = 0; g <= GY; g++) {
      var val = niceMax * g / GY, y = yAt(val);
      grid += '<line class="adm-grid" x1="' + m.l + '" y1="' + y.toFixed(1) + '" x2="' + (W - m.r) + '" y2="' + y.toFixed(1) + '"/>' +
        '<text class="adm-axis" x="' + (m.l - 12) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + money(val) + '</text>';
    }
    // x-axis date labels
    var xl = '';
    var idxs = single ? [0] : (days.length <= 6 ? days.map(function (_, i) { return i; }) : [0, Math.floor((days.length - 1) / 2), days.length - 1]);
    idxs.forEach(function (i) {
      var lbl = new Date(days[i]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      xl += '<text class="adm-axis" x="' + xAt(i).toFixed(1) + '" y="' + (H - 14) + '" text-anchor="middle">' + lbl + '</text>';
    });

    host.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="adm-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Revenue and profit over time">' +
        grid + xl +
        (chartSeries.rev ? '<path class="adm-area adm-area--rev" d="' + areaD(revPts) + '"/>' : '') +
        (chartSeries.prof ? '<path class="adm-area adm-area--prof" d="' + areaD(profPts) + '"/>' : '') +
        (chartSeries.rev ? '<path class="adm-line adm-line--rev" d="' + lineD(revPts) + '"/>' : '') +
        (chartSeries.prof ? '<path class="adm-line adm-line--prof" d="' + lineD(profPts) + '"/>' : '') +
        (chartSeries.rev ? dots(revPts, 'adm-dot--rev') : '') + (chartSeries.prof ? dots(profPts, 'adm-dot--prof') : '') +
        (chartSeries.rev ? valueLabels(revPts, 'rev', 'adm-vlabel--rev') : '') + (chartSeries.prof ? valueLabels(profPts, 'prof', 'adm-vlabel--prof') : '') +
        '<rect id="admHit" x="' + m.l + '" y="' + m.t + '" width="' + iw + '" height="' + ih + '" fill="transparent"/>' +
        '<g id="admCross" style="display:none"><line class="adm-cross" y1="' + m.t + '" y2="' + baseY + '"/></g>' +
      '</svg>' +
      '<div id="admTip" class="adm-tip" hidden></div>';

    wireChartHover(host, days, byDay, xAt);
  }

  function wireChartHover(host, days, byDay, xAt) {
    var svg = host.querySelector('svg'), cross = host.querySelector('#admCross'),
        crossLine = cross.querySelector('line'), tip = host.querySelector('#admTip');
    var hit = host.querySelector('#admHit');
    function nearest(px) {
      var best = 0, bd = Infinity;
      for (var i = 0; i < days.length; i++) { var d = Math.abs(xAt(i) - px); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    hit.addEventListener('mousemove', function (e) {
      var r = svg.getBoundingClientRect();
      var px = (e.clientX - r.left) * (svg.viewBox.baseVal.width / r.width);
      var i = nearest(px), d = days[i];
      cross.style.display = ''; crossLine.setAttribute('x1', xAt(i)); crossLine.setAttribute('x2', xAt(i));
      tip.hidden = false;
      tip.innerHTML = '<strong>' + new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '</strong>' +
        (chartSeries.rev ? '<span><i class="adm-swatch adm-swatch--rev"></i>Revenue ' + money(byDay[d].rev) + '</span>' : '') +
        (chartSeries.prof ? '<span><i class="adm-swatch adm-swatch--prof"></i>Profit ' + money(byDay[d].prof) + '</span>' : '');
      var left = Math.min((e.clientX - r.left) + 14, r.width - tip.offsetWidth - 8);
      tip.style.left = Math.max(8, left) + 'px'; tip.style.top = '12px';
    });
    hit.addEventListener('mouseleave', function () { cross.style.display = 'none'; tip.hidden = true; });
  }

  /* ---- status filters ---- */
  function renderFilters() {
    var counts = { all: state.orders.length };
    STATUSES.forEach(function (s) { counts[s] = state.orders.filter(function (o) { return o.status === s; }).length; });
    var opts = ['all'].concat(STATUSES);
    el('statusFilters').innerHTML = opts.map(function (s) {
      var label = s === 'all' ? 'All' : STATUS_META[s].label;
      return '<button class="adm-chip' + (state.filter === s ? ' is-active' : '') + '" data-filter="' + s + '">' +
        label + ' <em>' + counts[s] + '</em></button>';
    }).join('');
    el('statusFilters').querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () { state.filter = b.dataset.filter; renderFilters(); renderTable(); });
    });
  }

  /* ---- orders table ---- */
  function renderTable() {
    var rows = state.filter === 'all' ? state.orders : state.orders.filter(function (o) { return o.status === state.filter; });
    var body = el('ordersBody');
    el('ordersEmpty').hidden = rows.length > 0;
    body.innerHTML = rows.map(function (o) {
      var items = Array.isArray(o.items) ? o.items : [];
      var itemHtml = items.map(function (it) { return '<div class="adm-item"><b>' + esc(it.brand) + '</b> ' + esc(it.name) + ((it.qty || 1) > 1 ? ' <b>×' + it.qty + '</b>' : '') + (it.size ? ' <span class="adm-muted">· ' + esc(it.size) + '</span>' : '') + '</div>'; }).join('');
      var meta = STATUS_META[o.status] || STATUS_META.pending;
      var ref = '#' + String(o.id).slice(0, 8).toUpperCase();
      var date = new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      var statusSel = '<select class="adm-select" data-id="' + o.id + '" data-field="status">' +
        STATUSES.map(function (s) { return '<option value="' + s + '"' + (s === o.status ? ' selected' : '') + '>' + STATUS_META[s].label + '</option>'; }).join('') + '</select>';
      var track = '<input class="adm-track" data-id="' + o.id + '" data-field="tracking_url" placeholder="Tracking link" value="' + esc(o.tracking_url) + '" />';
      return '<tr>' +
        '<td class="adm-nowrap"><div>' + date + '</div><span class="adm-ref">' + ref + '</span></td>' +
        '<td><div class="adm-cust">' + esc(o.customer_name) + '</div>' +
          '<div class="adm-muted adm-sm">' + esc(o.customer_email) + '</div>' +
          (o.customer_phone ? '<div class="adm-muted adm-sm">' + esc(o.customer_phone) + '</div>' : '') +
          (function () {
            var addr = [o.address_line1, o.address_line2, o.city, o.postcode, o.country].filter(Boolean).join(', ');
            return addr ? '<div class="adm-addr">📦 ' + esc(addr) + '</div>' : '';
          })() +
          (o.note ? '<div class="adm-note">“' + esc(o.note) + '”</div>' : '') + '</td>' +
        '<td class="adm-items">' + itemHtml + '</td>' +
        '<td class="num">' + money(o.subtotal) + '</td>' +
        '<td class="num adm-profit">' + money(orderProfit(o)) + '</td>' +
        '<td><span class="adm-badge adm-badge--' + meta.cls + '">' + meta.icon + ' ' + meta.label + '</span>' +
          '<div class="adm-actions">' +
            '<button class="adm-mini adm-mini--ok" data-accept="' + o.id + '">Accept</button>' +
            '<button class="adm-mini adm-mini--no" data-decline="' + o.id + '">Decline</button>' +
            '<button class="adm-mini adm-mini--del" data-delorder="' + o.id + '" title="Delete order">🗑</button>' +
          '</div></td>' +
        '<td>' + statusSel + track +
          (o.tracking_url ? '<a class="adm-tracklink" href="' + esc(o.tracking_url) + '" target="_blank" rel="noopener">Open tracking →</a>' : '') +
        '</td>' +
      '</tr>';
    }).join('');
    wireTable();
  }

  function wireTable() {
    var body = el('ordersBody');
    body.querySelectorAll('[data-accept]').forEach(function (b) { b.addEventListener('click', function () { update(b.dataset.accept, { status: 'accepted' }); }); });
    body.querySelectorAll('[data-decline]').forEach(function (b) { b.addEventListener('click', function () { update(b.dataset.decline, { status: 'declined' }); }); });
    body.querySelectorAll('[data-delorder]').forEach(function (b) { b.addEventListener('click', function () { deleteOrder(b.dataset.delorder); }); });
    body.querySelectorAll('.adm-select').forEach(function (s) { s.addEventListener('change', function () { update(s.dataset.id, { status: s.value }); }); });
    body.querySelectorAll('.adm-track').forEach(function (t) {
      t.addEventListener('keydown', function (e) { if (e.key === 'Enter') { t.blur(); } });
      t.addEventListener('blur', function () { update(t.dataset.id, { tracking_url: t.value.trim() }, true); });
    });
  }

  function update(id, patch, quiet) {
    // optimistic local update
    var o = state.orders.find(function (x) { return String(x.id) === String(id); });
    var who = o ? o.customer_name : id;
    if (o) Object.assign(o, patch);
    if (!quiet) renderAll(); else { renderTiles(); renderChart(); }
    apiPatch('orders?id=eq.' + encodeURIComponent(id), patch).then(function () {
      if (patch.status) logAction('order.status', 'Set ' + who + '’s order to ' + patch.status);
      else if (patch.tracking_url !== undefined) logAction('order.tracking', 'Updated tracking for ' + who + '’s order');
    }).catch(function (err) { console.error(err); loadData(); });
  }

  function deleteOrder(id) {
    var o = state.orders.find(function (x) { return String(x.id) === String(id); });
    confirmAction('Delete this order permanently? This cannot be undone.', function () {
      request('DELETE', 'orders?id=eq.' + encodeURIComponent(id)).then(function () {
        logAction('order.delete', 'Deleted order ' + (o ? (o.customer_name + ' · ' + money(o.subtotal)) : id));
        state.orders = state.orders.filter(function (x) { return String(x.id) !== String(id); });
        renderAll(); toast('Order deleted');
      }).catch(function (err) { toast('Delete failed: ' + err.message, 'err'); });
    }, 'Delete');
  }

  /* ---- manually add an order ---- */
  function ensureProducts() {
    if (products.length) return Promise.resolve();
    return apiGet('products?select=*&order=brand.asc').then(function (rows) { products = rows || []; }, function () { products = []; });
  }

  function openOrderForm() {
    ensureProducts().then(renderOrderForm);
  }

  function renderOrderForm() {
    var picked = [];
    var opts = '<option value="">— choose a product —</option>' + products.map(function (p) {
      return '<option value="' + esc(p.id) + '">' + esc(p.brand) + ' — ' + esc(p.name) + ' (' + money(p.price) + ')</option>';
    }).join('');
    el('listingModalBody').innerHTML =
      '<button class="adm-lmodal__close" data-lclose>✕</button>' +
      '<h3>New order</h3>' +
      '<form id="orderForm" class="adm-lform">' +
        '<label>Customer name<input name="name" required placeholder="Full name"></label>' +
        '<div class="adm-lrow"><label>Email<input name="email" type="email" required placeholder="name@email.com"></label>' +
          '<label>Phone<input name="phone" placeholder="Optional"></label></div>' +
        '<label>Note<input name="note" placeholder="Optional"></label>' +
        '<label>Status<select name="status">' +
          STATUSES.map(function (s) { return '<option value="' + s + '">' + STATUS_META[s].label + '</option>'; }).join('') + '</select></label>' +
        '<div class="adm-oitems"><span class="adm-lbl">Items</span>' +
          '<div class="adm-oadd"><select id="oProduct">' + opts + '</select>' +
            '<button type="button" class="adm-btn adm-btn--ghost" id="oAdd">Add</button></div>' +
          '<div id="oList" class="adm-olist"></div>' +
          '<div class="adm-ototal">Subtotal <strong id="oTotal">£0</strong></div>' +
        '</div>' +
        '<p class="adm-lmsg" id="oMsg" hidden></p>' +
        '<div class="adm-lactions"><button type="submit" class="adm-btn adm-btn--solid" id="oSave">CREATE ORDER</button></div>' +
      '</form>';
    el('listingModal').hidden = false;

    function renderItems() {
      el('oList').innerHTML = picked.length ? picked.map(function (it, i) {
        return '<div class="adm-oitem"><span>' + esc(it.brand) + ' ' + esc(it.name) + '</span>' +
          '<span>' + money(it.price) + ' <button type="button" class="adm-x" data-rm="' + i + '">✕</button></span></div>';
      }).join('') : '<p class="adm-muted adm-sm">No items added yet.</p>';
      el('oTotal').textContent = money(picked.reduce(function (s, it) { return s + Number(it.price); }, 0));
      el('oList').querySelectorAll('[data-rm]').forEach(function (b) {
        b.addEventListener('click', function () { picked.splice(+b.dataset.rm, 1); renderItems(); });
      });
    }
    renderItems();

    el('oAdd').addEventListener('click', function () {
      var sel = el('oProduct'), id = sel.value; if (!id) return;
      var p = products.find(function (x) { return String(x.id) === id; });
      if (p) { picked.push({ id: p.id, brand: p.brand, name: p.name, price: Number(p.price), img: p.img }); renderItems(); sel.value = ''; }
    });

    el('orderForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, btn = el('oSave'), msg = el('oMsg');
      if (!picked.length) { msg.hidden = false; msg.textContent = 'Add at least one item.'; return; }
      var order = {
        customer_name: f.elements.name.value.trim(), customer_email: f.email.value.trim(),
        customer_phone: f.phone.value.trim(), note: f.note.value.trim(),
        items: picked, subtotal: picked.reduce(function (s, it) { return s + Number(it.price); }, 0),
        status: f.status.value, ref_code: 'DRIP-' + Math.random().toString(36).slice(2, 8).toUpperCase()
      };
      btn.disabled = true; btn.textContent = 'CREATING…'; msg.hidden = true;
      request('POST', 'orders', { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, JSON.stringify(order))
        .then(function () { logAction('order.create', 'Created order for ' + order.customer_name + ' · ' + money(order.subtotal)); closeListingModal(); loadData(); toast('Order created'); })
        .catch(function (err) { btn.disabled = false; btn.textContent = 'CREATE ORDER'; msg.hidden = false; msg.textContent = err.message || 'Could not create'; });
    });
  }

  /* ================= LISTINGS ================= */
  var CATEGORIES = ['bags', 'shoes'];
  var BADGES = ['ON HAND', 'NEW IN', 'AUTHENTICATED'];
  var GENDERS = ['Women', 'Men', 'Unisex'];
  var BAG_SIZES = ['Mini', 'Small', 'Medium', 'Large'];
  var SHOE_SIZES = ['UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'];
  var COLOURS = ['Black', 'White', 'Brown', 'Beige', 'Grey', 'Blue', 'Green', 'Red', 'Pink', 'Gold', 'Silver', 'Multi'];
  function csvToArr(v) { return (v || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
  var products = [];
  var listingsLoaded = false;

  var tabsWired = false;
  function wireTabs() {
    if (tabsWired) return; tabsWired = true;
    document.querySelectorAll('.adm-tab').forEach(function (t) {
      t.addEventListener('click', function () { switchView(t.dataset.view); });
    });
    el('addListingBtn').addEventListener('click', function () { openListingForm(null); });
    el('addOrderBtn').addEventListener('click', openOrderForm);
    document.getElementById('listingModal').addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-lclose')) closeListingModal();
    });
  }

  function switchView(v) {
    el('viewDashboard').hidden = v !== 'dashboard';
    el('viewListings').hidden = v !== 'listings';
    el('viewBroadcast').hidden = v !== 'broadcast';
    el('viewActivity').hidden = v !== 'activity';
    document.querySelectorAll('.adm-tab').forEach(function (t) { t.classList.toggle('is-active', t.dataset.view === v); });
    if (v === 'listings' && !listingsLoaded) loadListings();
    if (v === 'broadcast') loadBroadcast();
    if (v === 'activity') loadActivity();
  }

  /* ---- broadcast (email the newsletter list) ---- */
  var broadcastWired = false;
  function loadBroadcast() {
    // show how many people are on the list
    apiGet('subscribers?select=email').then(function (rows) {
      var n = Array.isArray(rows) ? rows.length : 0;
      el('bcCount').textContent = n + ' subscriber' + (n === 1 ? '' : 's');
    }).catch(function () { el('bcCount').textContent = ''; });

    if (broadcastWired) return; broadcastWired = true;
    el('bcTest').addEventListener('click', function () { sendBroadcast(true); });
    el('broadcastForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      confirmAction('Send this email to every subscriber? This can’t be undone.', function () {
        sendBroadcast(false);
      }, 'Send to all');
    });
  }

  function sendBroadcast(test) {
    var f = el('broadcastForm'), msg = el('bcMsg');
    var sendBtn = el('bcSend'), testBtn = el('bcTest');
    var subject = f.subject.value.trim(), message = f.message.value.trim();
    msg.hidden = true; msg.className = 'adm-lmsg';
    if (!subject || !message) { msg.hidden = false; msg.textContent = 'Add a subject and a message first.'; return; }

    var btn = test ? testBtn : sendBtn;
    var orig = btn.textContent; btn.disabled = true; btn.textContent = test ? 'SENDING TEST…' : 'SENDING…';

    fetch(CFG.SUPABASE_URL + '/functions/v1/broadcast-email', {
      method: 'POST',
      headers: { 'apikey': CFG.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: subject, message: message, test: !!test })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        btn.disabled = false; btn.textContent = orig;
        var d = res.d || {};
        if (!res.ok || d.error) { msg.hidden = false; msg.textContent = d.error || 'Send failed.'; return; }
        if (test) { toast('Test sent to ' + userEmail); return; }
        if (!d.sent) { msg.hidden = false; msg.textContent = d.note || 'No one was emailed.'; return; }
        toast('Sent to ' + d.sent + ' of ' + d.total + ' subscribers');
        logAction('broadcast.send', 'Emailed ' + d.sent + ' subscribers · “' + subject + '”');
        f.reset();
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = orig;
        msg.hidden = false; msg.textContent = 'Network error: ' + err.message;
      });
  }

  /* ---- activity log view ---- */
  var activityLoaded = false;
  function loadActivity() {
    activityLoaded = true;
    apiGet('activity_log?select=*&order=created_at.desc&limit=200').then(function (rows) {
      renderActivity(Array.isArray(rows) ? rows : []);
    }).catch(function (err) {
      el('activityList').innerHTML = '<p class="adm-empty">Couldn’t load the log: ' + esc(err.message) + '<br><span class="adm-sm">Run supabase/activity_log.sql to enable it.</span></p>';
    });
  }
  var ACTION_LABEL = {
    'order.status': 'Order status', 'order.tracking': 'Tracking', 'order.create': 'Order created',
    'order.delete': 'Order deleted', 'listing.add': 'Listing added', 'listing.edit': 'Listing edited', 'listing.delete': 'Listing deleted',
    'broadcast.send': 'Newsletter sent'
  };
  function renderActivity(rows) {
    if (!rows.length) { el('activityList').innerHTML = '<p class="adm-empty">No activity yet.</p>'; return; }
    el('activityList').innerHTML = rows.map(function (r) {
      var d = new Date(r.created_at);
      var when = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return '<div class="adm-act">' +
        '<span class="adm-act__tag">' + esc(ACTION_LABEL[r.action] || r.action) + '</span>' +
        '<span class="adm-act__detail">' + esc(r.detail || '') + '</span>' +
        '<span class="adm-act__meta">' + esc((r.actor_email || 'unknown').split('@')[0]) + ' · ' + when + '</span>' +
      '</div>';
    }).join('');
  }

  function loadListings() {
    listingsLoaded = true;
    el('listingsGrid').innerHTML = '<p class="adm-empty">Loading…</p>';
    apiGet('products?select=*&order=sort_order.asc,created_at.desc').then(function (rows) {
      products = Array.isArray(rows) ? rows : [];
      renderListings();
    }).catch(function (err) {
      el('listingsGrid').innerHTML = '<p class="adm-empty">Couldn’t load listings: ' + esc(err.message) + '</p>';
    });
  }

  function renderListings() {
    var grid = el('listingsGrid');
    if (!products.length) { grid.innerHTML = '<p class="adm-empty">No listings yet — click “Add listing”.</p>'; return; }
    grid.innerHTML = products.map(function (p) {
      return '<div class="adm-listing' + (p.active ? '' : ' is-off') + '">' +
        '<div class="adm-listing__img" style="background-image:url(\'' + esc(p.img || '') + '\')">' +
          (p.active ? '' : '<span class="adm-listing__badge">Hidden</span>') + '</div>' +
        '<div class="adm-listing__body">' +
          '<span class="adm-listing__brand">' + esc(p.brand) + '</span>' +
          '<span class="adm-listing__name">' + esc(p.name) + '</span>' +
          '<span class="adm-listing__meta">' + esc(p.category) + ' · ' + money(p.price) +
            ' <span class="adm-muted">(cost ' + money(p.cost) + ')</span></span>' +
        '</div>' +
        '<div class="adm-listing__actions">' +
          '<button class="adm-mini" data-ledit="' + esc(p.id) + '">Edit</button>' +
          '<button class="adm-mini adm-mini--no" data-ldel="' + esc(p.id) + '">Delete</button>' +
        '</div></div>';
    }).join('');
    grid.querySelectorAll('[data-ledit]').forEach(function (b) {
      b.addEventListener('click', function () { openListingForm(products.find(function (p) { return String(p.id) === b.dataset.ledit; })); });
    });
    grid.querySelectorAll('[data-ldel]').forEach(function (b) {
      b.addEventListener('click', function () { deleteListing(b.dataset.ldel); });
    });
  }

  function openListingForm(p) {
    var edit = !!p; p = p || {};
    var opt = function (arr, sel) { return arr.map(function (v) { return '<option' + (v === sel ? ' selected' : '') + '>' + v + '</option>'; }).join(''); };
    var imgs = p.images ? csvToArr(p.images) : (p.img ? [p.img] : []);
    var selSizes = csvToArr(p.sizes), selColors = csvToArr(p.colors), selGender = p.gender || 'Women';

    function ticks(name, opts, selected, type) {
      return opts.map(function (v) {
        var on = selected.indexOf(v) !== -1;
        return '<label class="adm-tick' + (on ? ' is-on' : '') + '"><input type="' + type + '" name="' + name + '" value="' + esc(v) + '"' + (on ? ' checked' : '') + '>' + esc(v) + '</label>';
      }).join('');
    }

    el('listingModalBody').innerHTML =
      '<button class="adm-lmodal__close" data-lclose>✕</button>' +
      '<h3>' + (edit ? 'Edit listing' : 'Add listing') + '</h3>' +
      '<form id="listingForm" class="adm-lform">' +
        '<div class="adm-lfield"><span class="adm-lbl">Photos <span class="adm-muted">(first is the cover; hover swaps to the second)</span></span>' +
          '<div class="adm-thumbs" id="lImgs"></div>' +
          '<span class="adm-muted adm-sm" id="lUploadMsg">JPG/PNG — you can select several at once</span></div>' +
        '<div class="adm-lrow"><label>Category<select name="category" id="lCat">' + opt(CATEGORIES, p.category || 'bags') + '</select></label>' +
          '<label>Badge<select name="badge">' + opt(BADGES, p.badge) + '</select></label></div>' +
        '<label>Brand<input name="brand" value="' + esc(p.brand || '') + '" required placeholder="e.g. CHANEL"></label>' +
        '<label>Name<input name="name" value="' + esc(p.name || '') + '" required placeholder="e.g. Classic Flap Medium"></label>' +
        '<div class="adm-lrow"><label>Price £<input name="price" type="number" min="0" step="1" value="' + (p.price != null ? p.price : '') + '" required></label>' +
          '<label>Your cost £<input name="cost" type="number" min="0" step="1" value="' + (p.cost != null ? p.cost : '') + '"></label></div>' +
        '<label>Condition<input name="condition" value="' + esc(p.condition || 'Brand New · Boxed') + '"></label>' +
        '<div class="adm-lfield"><span class="adm-lbl">Gender</span><div class="adm-ticks">' + ticks('gender', GENDERS, [selGender], 'radio') + '</div></div>' +
        '<div class="adm-lfield"><span class="adm-lbl">Sizes</span><div class="adm-ticks" id="lSizes">' + ticks('sizes', (p.category === 'shoes' ? SHOE_SIZES : BAG_SIZES), selSizes, 'checkbox') + '</div></div>' +
        '<div class="adm-lfield"><span class="adm-lbl">Colours</span><div class="adm-ticks">' + ticks('colors', COLOURS, selColors, 'checkbox') + '</div></div>' +
        '<div class="adm-lrow adm-lrow--checks">' +
          '<label class="adm-check"><input type="checkbox" name="is_new"' + (p.is_new ? ' checked' : '') + '> Mark “new”</label>' +
          '<label class="adm-check"><input type="checkbox" name="active"' + (edit ? (p.active ? ' checked' : '') : ' checked') + '> Visible in store</label>' +
        '</div>' +
        '<p class="adm-lmsg" id="lMsg" hidden></p>' +
        '<div class="adm-lactions"><button type="submit" class="adm-btn adm-btn--solid" id="lSave">' + (edit ? 'SAVE CHANGES' : 'ADD LISTING') + '</button></div>' +
      '</form>';
    el('listingModal').hidden = false;

    var form = el('listingForm');

    function renderImgs() {
      el('lImgs').innerHTML = imgs.map(function (u, i) {
        return '<div class="adm-thumb' + (i === 0 ? ' is-cover' : '') + '" style="background-image:url(\'' + esc(u) + '\')">' +
          (i === 0 ? '<span class="adm-thumb__tag">Cover</span>' : '') +
          '<button type="button" class="adm-thumb__x" data-rmimg="' + i + '" title="Remove">✕</button></div>';
      }).join('') + '<label class="adm-thumb adm-thumb--add" title="Add photo"><span>+</span><input type="file" id="lImage" accept="image/*" multiple hidden></label>';
      el('lImgs').querySelectorAll('[data-rmimg]').forEach(function (b) {
        b.addEventListener('click', function () { imgs.splice(+b.dataset.rmimg, 1); renderImgs(); });
      });
      el('lImage').addEventListener('change', function () {
        var files = Array.prototype.slice.call(el('lImage').files); if (!files.length) return;
        el('lUploadMsg').textContent = 'Uploading ' + files.length + ' photo' + (files.length > 1 ? 's' : '') + '…';
        Promise.all(files.map(function (f) { return uploadImage(f); })).then(function (urls) {
          urls.forEach(function (u) { imgs.push(u); });
          renderImgs(); el('lUploadMsg').textContent = 'Uploaded ✓';
        }).catch(function (err) { el('lUploadMsg').textContent = 'Upload failed: ' + err.message; });
      });
    }
    renderImgs();

    // category change → swap the size options (bags vs shoes)
    el('lCat').addEventListener('change', function () {
      el('lSizes').innerHTML = ticks('sizes', (el('lCat').value === 'shoes' ? SHOE_SIZES : BAG_SIZES), [], 'checkbox');
    });
    // reflect tick state visually
    form.addEventListener('change', function (e) {
      var lbl = e.target.closest('.adm-tick'); if (!lbl) return;
      if (e.target.type === 'radio') form.querySelectorAll('.adm-tick').forEach(function (l) { if (l.querySelector('input[name=gender]')) l.classList.toggle('is-on', l.querySelector('input').checked); });
      else lbl.classList.toggle('is-on', e.target.checked);
    });

    function checkedVals(name) {
      return Array.prototype.slice.call(form.querySelectorAll('input[name=' + name + ']:checked')).map(function (i) { return i.value; }).join(', ');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = el('lSave'), msg = el('lMsg');
      var genderEl = form.querySelector('input[name=gender]:checked');
      var data = {
        category: form.category.value, brand: form.brand.value.trim(), name: form.elements.name.value.trim(),
        price: Number(form.price.value) || 0, cost: Number(form.cost.value) || 0,
        condition: form.condition.value.trim(), badge: form.badge.value,
        gender: genderEl ? genderEl.value : '', sizes: checkedVals('sizes'), colors: checkedVals('colors'),
        is_new: form.is_new.checked, active: form.active.checked,
        img: imgs[0] || '', images: imgs.join(',')
      };
      btn.disabled = true; btn.textContent = 'SAVING…'; msg.hidden = true;
      saveListing(data, edit ? p.id : null).then(function () {
        logAction(edit ? 'listing.edit' : 'listing.add', (edit ? 'Edited' : 'Added') + ' listing ' + data.brand + ' ' + data.name);
        closeListingModal(); listingsLoaded = false; loadListings(); toast(edit ? 'Listing saved' : 'Listing added');
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = edit ? 'SAVE CHANGES' : 'ADD LISTING';
        msg.hidden = false; msg.textContent = err.message || 'Could not save';
      });
    });
  }

  function closeListingModal() { el('listingModal').hidden = true; }

  function saveListing(data, id) {
    if (id) return apiPatch('products?id=eq.' + encodeURIComponent(id), data);
    return request('POST', 'products', { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, JSON.stringify(data));
  }

  function deleteListing(id) {
    var p = products.find(function (x) { return String(x.id) === String(id); });
    confirmAction('Delete this listing? This cannot be undone.', function () {
      request('DELETE', 'products?id=eq.' + encodeURIComponent(id)).then(function () {
        logAction('listing.delete', 'Deleted listing ' + (p ? (p.brand + ' ' + p.name) : id));
        products = products.filter(function (x) { return String(x.id) !== String(id); });
        renderListings(); toast('Listing deleted');
      }).catch(function (err) { toast('Delete failed: ' + err.message, 'err'); });
    }, 'Delete');
  }

  // Upload an image to Supabase Storage; refresh the token once on 401.
  function uploadImage(file, retried) {
    var safe = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    var url = CFG.SUPABASE_URL + '/storage/v1/object/product-images/' + encodeURIComponent(safe);
    return fetch(url, {
      method: 'POST',
      headers: { 'apikey': CFG.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' },
      body: file
    }).then(function (r) {
      if (r.status === 401 && !retried) { return refreshSession().then(function () { return uploadImage(file, true); }); }
      if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('HTTP ' + r.status)); });
      return CFG.SUPABASE_URL + '/storage/v1/object/public/product-images/' + encodeURIComponent(safe);
    });
  }

  // hook tab wiring into showApp (runs after login)
  var _showApp = showApp;
  showApp = function () { _showApp(); wireTabs(); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
