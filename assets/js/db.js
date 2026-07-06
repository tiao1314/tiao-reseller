// ===== tiao — Supabase client (shared) =====
// Initialises a Supabase client if configured. Exposes window.TIAO_DB (the
// client) and window.TIAO_DB_READY (boolean). Pages degrade gracefully when
// Supabase isn't connected yet, so the site still works before setup.
(function () {
  'use strict';
  var CFG = window.TIAO_CONFIG || {};
  window.TIAO_DB = null;
  window.TIAO_DB_READY = false;

  if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase) {
    try {
      window.TIAO_DB = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
      window.TIAO_DB_READY = true;
    } catch (e) {
      console.warn('Supabase init failed:', e.message);
    }
  }
})();
