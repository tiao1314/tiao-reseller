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
})();
