// ===== tiao — customer auth (direct REST, no supabase-js) =====
// Email/password accounts for shoppers. Stores the session in localStorage
// (keys separate from the admin panel). Exposes window.TiaoAuth.
(function () {
  'use strict';
  var CFG = window.TIAO_CONFIG || {};
  var AUTH = (CFG.SUPABASE_URL || '') + '/auth/v1/';
  var K = { t: 'tiao_cust_token', r: 'tiao_cust_refresh', u: 'tiao_cust_user', v: 'tiao_pkce_verifier' };

  // ---- PKCE helpers (for social login) ----
  function b64url(bytes) {
    var arr = new Uint8Array(bytes), s = '';
    for (var i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function randomVerifier() { return b64url(crypto.getRandomValues(new Uint8Array(32)).buffer); }
  function challengeFrom(verifier) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then(function (h) { return b64url(h); });
  }
  function parseParams(str) {
    var out = {};
    (str || '').replace(/^[#?]/, '').split('&').forEach(function (kv) {
      if (!kv) return; var p = kv.split('=');
      out[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
    });
    return out;
  }
  function cleanUrl() { try { history.replaceState(null, '', window.location.pathname); } catch (e) {} }

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

    // Kick off a social login (google / discord) using the PKCE code flow.
    oauth: function (provider) {
      var verifier = randomVerifier();
      localStorage.setItem(K.v, verifier);
      var redirect = window.location.href.split('#')[0].split('?')[0];  // clean page URL
      challengeFrom(verifier).then(function (challenge) {
        window.location.href = AUTH + 'authorize?provider=' + encodeURIComponent(provider) +
          '&redirect_to=' + encodeURIComponent(redirect) +
          '&code_challenge=' + challenge + '&code_challenge_method=s256';
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

  function finishLogin(session) {
    // session may lack a user object (code exchange returns it; hash flow doesn't)
    if (session.user && session.user.id) {
      saveSession(session);
      cleanUrl();
      document.dispatchEvent(new CustomEvent('tiao:auth', { detail: { user: { id: session.user.id, email: session.user.email } } }));
      return Promise.resolve(true);
    }
    return fetch(AUTH + 'user', {
      headers: { 'apikey': CFG.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + session.access_token }
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (user) {
      if (!user || !user.id) throw new Error('Could not load your profile');
      saveSession({ access_token: session.access_token, refresh_token: session.refresh_token, user: user });
      cleanUrl();
      document.dispatchEvent(new CustomEvent('tiao:auth', { detail: { user: { id: user.id, email: user.email } } }));
      return true;
    });
  }

  function fail(message) {
    cleanUrl();
    document.dispatchEvent(new CustomEvent('tiao:auth-error', { detail: { message: message } }));
    return false;
  }

  // On page load, complete a social login if we came back from the provider.
  function handleCallback() {
    var q = parseParams(window.location.search), h = parseParams(window.location.hash);
    var err = q.error_description || q.error || h.error_description || h.error;
    if (err) return Promise.resolve(fail(err));

    // Implicit flow (session in the hash)
    if (h.access_token) return finishLogin(h).catch(function (e) { return fail(e.message); });

    // PKCE code flow (?code=...) — exchange the code using our stored verifier
    if (q.code) {
      var verifier = localStorage.getItem(K.v);
      if (!verifier) return Promise.resolve(fail('Login session expired — please try again.'));
      return fetch(AUTH + 'token?grant_type=pkce', {
        method: 'POST',
        headers: { 'apikey': CFG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_code: q.code, code_verifier: verifier })
      }).then(function (r) { return r.json(); }).then(function (d) {
        localStorage.removeItem(K.v);
        if (!d.access_token) throw new Error(msg(d));
        return finishLogin(d);
      }).catch(function (e) { return fail(e.message || 'Sign-in failed'); });
    }
    return Promise.resolve(false);
  }
  window.TIAO_AUTH_READY = handleCallback();
})();
