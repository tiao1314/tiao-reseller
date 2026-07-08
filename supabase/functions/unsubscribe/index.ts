// ===== dripdrip — unsubscribe (Supabase Edge Function) =====
// Opened from the "unsubscribe" link in newsletter emails:
//   https://<project>.supabase.co/functions/v1/unsubscribe?t=<unsub_token>
// Removes that subscriber (matched by token, so no one can unsubscribe another
// person) and returns a small confirmation page. Uses the service-role key to
// delete, which bypasses RLS — so keep "Verify JWT" OFF and don't expose it.
//
// Deploy (CLI):  supabase functions deploy unsubscribe --no-verify-jwt
// Secrets:       SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically.

function page(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — dripdrip</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;background:#f6f6f4;color:#111;margin:0;
      display:grid;place-items:center;min-height:100vh;padding:24px}
    .card{background:#fff;max-width:420px;width:100%;padding:40px 32px;border-radius:12px;
      box-shadow:0 10px 40px rgba(0,0,0,.08);text-align:center}
    h1{font-weight:900;letter-spacing:.04em;margin:0 0 6px;font-size:26px}
    .tag{color:#999;font-size:11px;letter-spacing:.14em;margin:0 0 22px}
    h2{font-size:19px;margin:0 0 10px}
    p{color:#555;line-height:1.6;font-size:15px;margin:0 0 22px}
    a.btn{background:#111;color:#fff;text-decoration:none;padding:13px 26px;border-radius:6px;
      font-weight:700;font-size:14px;display:inline-block}
  </style></head><body><div class="card">
    <h1>dripdrip</h1><p class="tag">AUTHENTICATED LUXURY</p>${body}
    <a class="btn" href="https://dripdrip.store">Back to store</a>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  const html = (b: string, status = 200) =>
    new Response(page(status === 200 ? "Unsubscribed" : "Link problem", b),
      { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

  const token = new URL(req.url).searchParams.get("t");
  if (!token) return html(`<h2>Invalid link</h2><p>This unsubscribe link is missing its code. If you keep getting emails, reply to one and we’ll remove you.</p>`, 400);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SERVICE) return html(`<h2>Something went wrong</h2><p>Please try again shortly.</p>`, 500);

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/subscribers?unsub_token=eq.${encodeURIComponent(token)}`,
      { method: "DELETE", headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Prefer: "return=representation" } }
    );
    if (!r.ok) return html(`<h2>Something went wrong</h2><p>Please try again shortly.</p>`, 500);
    return html(`<h2>You're unsubscribed 👋</h2><p>You won't get any more newsletter emails from dripdrip. Changed your mind? You can re-subscribe any time on our homepage.</p>`);
  } catch {
    return html(`<h2>Something went wrong</h2><p>Please try again shortly.</p>`, 500);
  }
});
