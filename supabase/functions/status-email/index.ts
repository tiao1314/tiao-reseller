// ===== dripdrip — order status-change email (Supabase Edge Function) =====
// Fired by a DB trigger when an order's status changes. Emails the customer a
// short update tailored to the new status, with their reference + a track link.
//
// Deploy (CLI):  supabase functions deploy status-email --no-verify-jwt
// Secrets:       RESEND_API_KEY (required), WELCOME_FROM (optional sender)

function esc(s: string) {
  return String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

const MSG: Record<string, { subject: string; head: string; body: string }> = {
  accepted:  { subject: "Your dripdrip order is confirmed", head: "Your order is confirmed ✓", body: "Great news — we've confirmed your order. We'll follow up with payment &amp; delivery details shortly." },
  shipped:   { subject: "Your dripdrip order has shipped", head: "On its way 🚚", body: "Your order is on its way. Use the button below to follow your parcel." },
  delivered: { subject: "Your dripdrip order was delivered", head: "Delivered ✓", body: "Your order has been delivered. Thank you for shopping with dripdrip 🖤" },
  declined:  { subject: "Update on your dripdrip order", head: "Order update", body: "Unfortunately we couldn't fulfil this order — and nothing was charged. Reply to this email and we'll help you find an alternative." },
  pending:   { subject: "Update on your dripdrip order", head: "Order update", body: "Your order is back under review. We'll be in touch shortly." },
};

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const o = body?.record ?? body;
    const email = (o?.customer_email || "").trim();
    const status = (o?.status || "").toLowerCase();
    const ref = o?.ref_code || "";
    const m = MSG[status];
    if (!email || !m) return new Response("skip: no email or unhandled status", { status: 200 });

    const KEY = Deno.env.get("RESEND_API_KEY");
    const FROM = Deno.env.get("WELCOME_FROM") || "dripdrip <hello@dripdrip.store>";
    if (!KEY) return new Response("RESEND_API_KEY not set", { status: 200 });

    const track = `https://dripdrip.store/account.html?ref=${encodeURIComponent(ref)}&email=${encodeURIComponent(email)}`;
    const cta = status === "shipped" && o?.tracking_url ? String(o.tracking_url) : track;
    const ctaLabel = status === "shipped" && o?.tracking_url ? "TRACK MY PARCEL" : "VIEW MY ORDER";
    const first = (o?.customer_name || "").split(" ")[0];

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#111;padding:8px">
        <h1 style="font-weight:800;letter-spacing:.04em;margin:0 0 4px">dripdrip</h1>
        <p style="color:#999;font-size:12px;letter-spacing:.12em;margin:0 0 24px">AUTHENTICATED LUXURY · BAGS &amp; SHOES</p>
        <h2 style="font-weight:800;font-size:22px;margin:0 0 12px">${m.head}${first ? `, ${esc(first)}` : ""}</h2>
        <p style="color:#555;line-height:1.65;font-size:15px">${m.body}</p>
        ${ref ? `<div style="background:#f6f6f4;border-radius:10px;padding:14px 18px;margin:18px 0"><span style="color:#999;font-size:11px;letter-spacing:.14em">REFERENCE</span><div style="font-weight:800;font-size:18px;letter-spacing:.06em">${esc(ref)}</div></div>` : ""}
        <p style="margin:24px 0 0"><a href="${cta}" style="background:#111;color:#fff;text-decoration:none;padding:13px 26px;border-radius:6px;font-weight:700;font-size:14px;display:inline-block">${ctaLabel}</a></p>
        <p style="color:#aaa;font-size:12px;margin-top:32px">You received this because there was an update to your dripdrip order.</p>
      </div>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: email, subject: `${m.subject}${ref ? ` — ${ref}` : ""}`, html }),
    });
    const out = await r.text();
    return new Response(`resend ${r.status}: ${out}`, { status: 200 });
  } catch (e) {
    return new Response(`error: ${(e as Error).message}`, { status: 200 });
  }
});
