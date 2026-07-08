// ===== dripdrip — order confirmation email (Supabase Edge Function) =====
// Fired by a DB trigger when a new row is inserted into public.orders. Emails
// the customer their reference code (DRIP-XXXXXX) so they can track the order.
// Sends via Resend (https://resend.com).
//
// Deploy (CLI):  supabase functions deploy order-email --no-verify-jwt
// Secrets:       RESEND_API_KEY (required), WELCOME_FROM (optional sender)

function esc(s: string) {
  return String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}
function money(n: number) { return "£" + Number(n || 0).toLocaleString("en-GB"); }

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const o = body?.record ?? body;
    const email = (o?.customer_email || "").trim();
    const ref = o?.ref_code || "";
    if (!email || !ref) return new Response("no email/ref", { status: 200 });

    const KEY = Deno.env.get("RESEND_API_KEY");
    const FROM = Deno.env.get("WELCOME_FROM") || "dripdrip <hello@dripdrip.store>";
    if (!KEY) return new Response("RESEND_API_KEY not set", { status: 200 });

    const items = Array.isArray(o.items) ? o.items : [];
    const rows = items.map((it: { brand?: string; name?: string; price?: number; size?: string }) =>
      `<tr><td style="padding:8px 0;color:#111"><b>${esc(it.brand || "")}</b> ${esc(it.name || "")}` +
      `${it.size ? ` <span style="color:#888">· ${esc(it.size)}</span>` : ""}</td>` +
      `<td style="padding:8px 0;text-align:right;color:#111;white-space:nowrap">${money(it.price || 0)}</td></tr>`
    ).join("");
    const first = (o.customer_name || "").split(" ")[0];

    const track = `https://dripdrip.store/account.html?ref=${encodeURIComponent(ref)}&email=${encodeURIComponent(email)}`;

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#111;padding:8px">
        <h1 style="font-weight:800;letter-spacing:.04em;margin:0 0 4px">dripdrip</h1>
        <p style="color:#999;font-size:12px;letter-spacing:.12em;margin:0 0 24px">AUTHENTICATED LUXURY · BAGS &amp; SHOES</p>
        <h2 style="font-weight:800;font-size:22px;margin:0 0 12px">Order request received${first ? ", " + esc(first) : ""} 🖤</h2>
        <p style="color:#555;line-height:1.65;font-size:15px">Thanks for your request. We're verifying availability and will be in touch with payment &amp; delivery details. <strong>Nothing is charged yet.</strong></p>
        <div style="background:#f6f6f4;border-radius:10px;padding:18px 20px;margin:22px 0">
          <div style="color:#999;font-size:11px;letter-spacing:.14em">YOUR REFERENCE</div>
          <div style="font-weight:800;font-size:24px;letter-spacing:.06em;margin-top:4px">${esc(ref)}</div>
          <div style="color:#777;font-size:13px;margin-top:6px">Keep this to track your order any time.</div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
          <tr><td style="padding:12px 0 0;border-top:1px solid #eee;font-weight:700">Estimated total</td>
              <td style="padding:12px 0 0;border-top:1px solid #eee;text-align:right;font-weight:700">${money(o.subtotal)}</td></tr>
        </table>
        <p style="margin:26px 0 0"><a href="${track}" style="background:#111;color:#fff;text-decoration:none;padding:13px 26px;border-radius:6px;font-weight:700;font-size:14px;display:inline-block">TRACK MY ORDER</a></p>
        <p style="color:#aaa;font-size:12px;margin-top:32px">You received this because you placed an order request at dripdrip.store.</p>
      </div>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: email, subject: `Your dripdrip order — ${ref}`, html }),
    });
    const out = await r.text();
    return new Response(`resend ${r.status}: ${out}`, { status: 200 });
  } catch (e) {
    return new Response(`error: ${(e as Error).message}`, { status: 200 });
  }
});
