// ===== tiao — site config =====
window.TIAO_CONFIG = {
  // To enable REAL "Sign in with Google":
  //  1. Go to https://console.cloud.google.com/apis/credentials
  //  2. Create an OAuth 2.0 Client ID (type: Web application)
  //  3. Under "Authorized JavaScript origins" add your site origins, e.g.
  //       https://tiao1314.github.io   and   http://localhost:8000
  //  4. Paste the generated Client ID below.
  // Until then, the login modal runs in DEMO mode (no real Google account needed).
  GOOGLE_CLIENT_ID: '',

  // PayPal — paste your PUBLIC client id here (safe to expose in the browser).
  // The secret NEVER goes here — it lives only in Netlify env vars. See SETUP.md.
  // Get it at https://developer.paypal.com → Apps & Credentials.
  PAYPAL_CLIENT_ID: '',
  PAYPAL_CURRENCY: 'GBP'
};
