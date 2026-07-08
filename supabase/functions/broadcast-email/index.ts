// ===== dripdrip — broadcast email to subscribers (Supabase Edge Function) =====
// Called from the Admin panel's "Broadcast" tab. Sends one email to every
// newsletter subscriber via Resend (https://resend.com).
//
// Security: this function reads the subscriber list using the CALLER'S token
// (forwarded in the Authorization header). Row-Level Security only lets an
// admin read public.subscribers, so a non-admin caller gets an empty list and
// nothing is sent. The Resend key never leaves the server.
//
// Deploy (CLI):  supabase functions deploy broadcast-email --no-verify-jwt
// Secrets:       RESEND_API_KEY (required), WELCOME_FROM (optional sender)
//                SUPABASE_URL + SUPABASE_ANON_KEY are injected automatically.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function esc(s: string) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (o: unknown, status = 200) =>
    new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => ({}));
    const subject = (body?.subject || "").toString().trim();
    const message = (body?.message || "").toString().trim();
    const test = !!body?.test;
    if (!subject || !message) return json({ error: "Subject and message are required." }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON = Deno.env.get("SUPABASE_ANON_KEY");
    const KEY = Deno.env.get("RESEND_API_KEY");
    const FROM = Deno.env.get("WELCOME_FROM") || "dripdrip <hello@dripdrip.store>";
    if (!KEY) return json({ error: "RESEND_API_KEY not set" }, 500);

    const auth = req.headers.get("Authorization") || "";
    let people: { email: string; token: string }[] = [];

    if (test) {
      // Test send: resolve the caller's OWN verified email from their token, so
      // this can only ever email the logged-in admin — never an arbitrary address.
      const me = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: ANON!, Authorization: auth },
      });
      if (!me.ok) return json({ error: "Sign in again to send a test." }, 401);
      const u = await me.json();
      if (u?.email) people = [{ email: u.email, token: "" }];
    } else {
      // Pull subscribers with the caller's token — RLS enforces admin-only read.
      const listRes = await fetch(`${SUPABASE_URL}/rest/v1/subscribers?select=email,unsub_token`, {
        headers: { apikey: ANON!, Authorization: auth },
      });
      if (!listRes.ok) {
        const t = await listRes.text();
        return json({ error: `Could not read subscribers (${listRes.status}): ${t}` }, 403);
      }
      const rows = await listRes.json();
      people = (Array.isArray(rows) ? rows : [])
        .map((r: { email?: string; unsub_token?: string }) => ({ email: (r.email || "").trim(), token: r.unsub_token || "" }))
        .filter((p: { email: string }) => p.email);
    }

    if (!people.length) return json({ sent: 0, total: 0, note: "No subscribers to email (or you're not an admin)." });

    // Build a branded HTML body from the plain-text message (keep line breaks).
    // The unsubscribe link is per-recipient (uses their token).
    const htmlMsg = esc(message).replace(/\n/g, "<br>");
    const build = (token: string) => {
      const unsub = token
        ? `${SUPABASE_URL}/functions/v1/unsubscribe?t=${encodeURIComponent(token)}`
        : "https://dripdrip.store";
      return `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#111;padding:8px">
        <h1 style="font-weight:800;letter-spacing:.04em;margin:0 0 4px">dripdrip</h1>
        <p style="color:#999;font-size:12px;letter-spacing:.12em;margin:0 0 24px">AUTHENTICATED LUXURY · BAGS &amp; SHOES</p>
        <div style="color:#333;line-height:1.7;font-size:15px">${htmlMsg}</div>
        <p style="margin:26px 0 0"><a href="https://dripdrip.store" style="background:#111;color:#fff;text-decoration:none;padding:13px 26px;border-radius:6px;font-weight:700;font-size:14px;display:inline-block">SHOP NOW</a></p>
        <p style="color:#aaa;font-size:12px;margin-top:32px">You received this because you subscribed at dripdrip.store.<br>
          <a href="${unsub}" style="color:#aaa">Unsubscribe</a></p>
      </div>`;
    };

    // Resend's batch endpoint accepts up to 100 messages per call.
    let sent = 0;
    const errors: string[] = [];
    for (let i = 0; i < people.length; i += 100) {
      const chunk = people.slice(i, i + 100);
      const payload = chunk.map((p) => ({ from: FROM, to: p.email, subject, html: build(p.token) }));
      const r = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) sent += chunk.length;
      else errors.push(`batch ${i / 100}: ${r.status} ${await r.text()}`);
    }

    return json({ sent, total: people.length, errors: errors.length ? errors : undefined });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
