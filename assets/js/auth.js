// ===== tiao — customer auth (direct REST, no supabase-js) =====
// Email/password accounts for shoppers. Stores the session in localStorage
// (keys separate from the admin panel). Exposes window.TiaoAuth.
(function () {
  'use strict';
  var CFG = window.TIAO_CONFIG || {};
  var AUTH = (CFG.SUPABASE_URL || '') + '/auth/v1/';
  var K = { t: 'tiao_cust_token', r: 'tiao_cust_refresh', u: 'tiao_cust_user' };

  function saveSession(d) {
    if (!d || !d.access_token) return false;
    localStorage.setItem(K.t, d.access_token);
    if (d.refresh_token) localStorage.setItem(K.r, d.refresh_token);
    if (d.user) localStorage.setItem(K.u, JSON.stringify({ id: d.user.id, email: d.user.email }));
    return true;
  }
  function clear() { localStorage.removeItem(K.t); localStorage.removeItem(K.r); localStorage.removeItem(K.u); }

  function postAuth(path, body) {
    return fetch(AUTH + path, {
      method: 'POST',
      headers: { 'apikey': CFG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); });
  }

  var TiaoAuth = {
    isReady: function () { return !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY); },
    getUser: function () { try { return JSON.parse(localStorage.getItem(K.u)); } catch (e) { return null; } },
    isLoggedIn: function () { return !!localStorage.getItem(K.t) && !!this.getUser(); },

    signUp: function (email, password) {
      return postAuth('signup', { email: email, password: password }).then(function (res) {
        if (!res.ok) throw new Error(msg(res.d));
        // If email confirmation is OFF, signup returns a session → logged in.
        if (res.d.access_token) { saveSession(res.d); return { session: true }; }
        // Otherwise the user must confirm via email first.
        return { session: false, needsConfirm: true };
      });
    },

    signIn: function (email, password) {
      return postAuth('token?grant_type=password', { email: email, password: password }).then(function (res) {
        if (!res.ok || !res.d.access_token) throw new Error(msg(res.d));
        saveSession(res.d);
        return TiaoAuth.getUser();
      });
    },

    // Kick off a social login (google / discord). Redirects away and comes
    // back to this same page with the session in the URL hash.
    oauth: function (provider) {
      var redirect = window.location.href.split('#')[0];
      window.location.href = AUTH + 'authorize?provider=' + encodeURIComponent(provider) +
        '&redirect_to=' + encodeURIComponent(redirect);
    },

    signOut: function () { clear(); },

    // Returns a valid access token, refreshing it if needed. Rejects if signed out.
    token: function () {
      var t = localStorage.getItem(K.t);
      if (!t) return Promise.reject(new Error('not-signed-in'));
      return Promise.resolve(t);
    },
    refresh: function () {
      var rt = localStorage.getItem(K.r);
      if (!rt) return Promise.reject(new Error('no-refresh'));
      return postAuth('token?grant_type=refresh_token', { refresh_token: rt }).then(function (res) {
        if (!res.ok || !res.d.access_token) { clear(); throw new Error('refresh-failed'); }
        saveSession(res.d);
        return res.d.access_token;
      });
    }
  };

  function msg(d) {
    return (d && (d.msg || d.error_description || d.error_code || d.error || d.message)) || 'Something went wrong';
  }

  window.TiaoAuth = TiaoAuth;

  // On page load, complete a social login if we came back with tokens in the URL.
  function handleCallback() {
    var h = window.location.hash || '';
    if (h.indexOf('access_token=') === -1) return Promise.resolve(false);
    var params = {};
    h.replace(/^#/, '').split('&').forEach(function (kv) {
      var p = kv.split('='); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
    });
    if (!params.access_token) return Promise.resolve(false);
    return fetch(AUTH + 'user', {
      headers: { 'apikey': CFG.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + params.access_token }
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (user) {
      if (!user || !user.id) return false;
      saveSession({ access_token: params.access_token, refresh_token: params.refresh_token, user: user });
      try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
      document.dispatchEvent(new CustomEvent('tiao:auth', { detail: { user: { id: user.id, email: user.email } } }));
      return true;
    }).catch(function () { return false; });
  }
  window.TIAO_AUTH_READY = handleCallback();
})();
