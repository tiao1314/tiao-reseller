// ===== dripdrip — welcome email (Supabase Edge Function) =====
// Triggered by a Database Webhook on INSERT into public.subscribers.
// Sends a "thanks for subscribing" email via Resend (https://resend.com).
//
// Deploy (CLI):   supabase functions deploy welcome-email --no-verify-jwt
// Secrets:        supabase secrets set RESEND_API_KEY=... WELCOME_FROM="dripdrip <hello@dripdrip.store>"
// (or set both in the dashboard: Edge Functions → Secrets)
// Then add a Database Webhook (Database → Webhooks) on subscribers INSERT that
// calls this function. Full steps in WELCOME_EMAIL_SETUP.md.

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body?.record?.email ?? body?.email;
    if (!email) return new Response("no email", { status: 200 });

    const KEY = Deno.env.get("RESEND_API_KEY");
    const FROM = Deno.env.get("WELCOME_FROM") || "dripdrip <hello@dripdrip.store>";
    if (!KEY) return new Response("RESEND_API_KEY not set", { status: 200 });

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#111;padding:8px">
        <h1 style="font-weight:800;letter-spacing:.04em;margin:0 0 4px">dripdrip</h1>
        <p style="color:#999;font-size:12px;letter-spacing:.12em;margin:0 0 24px">BUILT SAME. MADE TO BLEND IN.</p>
        <h2 style="font-weight:800;font-size:22px;margin:0 0 12px">Thanks for subscribing 🖤</h2>
        <p style="color:#555;line-height:1.65;font-size:15px">You're on the list. You'll be first to hear about new drops, restocks and private sales — verified luxury bags &amp; shoes, priced to move.</p>
        <p style="margin:26px 0 0"><a href="https://dripdrip.store" style="background:#111;color:#fff;text-decoration:none;padding:13px 26px;border-radius:6px;font-weight:700;font-size:14px;display:inline-block">SHOP NOW</a></p>
        <p style="color:#aaa;font-size:12px;margin-top:32px">You received this because you subscribed at dripdrip.store.</p>
      </div>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: email, subject: "Welcome to dripdrip", html }),
    });
    const out = await r.text();
    return new Response(`resend ${r.status}: ${out}`, { status: 200 });
  } catch (e) {
    return new Response(`error: ${(e as Error).message}`, { status: 200 });
  }
});
