// ===== tiao — site config =====
window.TIAO_CONFIG = {
  // To enable REAL "Sign in with Google":
  //  1. Go to https://console.cloud.google.com/apis/credentials
  //  2. Create an OAuth 2.0 Client ID (type: Web application)
  //  3. Add your site origins under "Authorized JavaScript origins".
  //  4. Paste the generated Client ID below.
  // Until then, the login modal runs in DEMO mode (no real Google account needed).
  GOOGLE_CLIENT_ID: '',

  // Supabase — your project's URL + PUBLIC anon key (safe to expose; row-level
  // security protects the data). Create a project at https://supabase.com, then
  // Project Settings → API. See SUPABASE_SETUP.md for the full walkthrough.
  SUPABASE_URL: 'https://lnzhsjzwqungawuzqfzt.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxuemhzanp3cXVuZ2F3dXpxZnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjg2ODEsImV4cCI6MjA5ODk0NDY4MX0.PZETP8oPRUzj8M_rQ91R0hpx3BOxZJsugXlepe9u9Ng',

  // Currency + the email of the admin (used only for display in the panel).
  CURRENCY: 'GBP',
  ADMIN_EMAIL: ''
};
