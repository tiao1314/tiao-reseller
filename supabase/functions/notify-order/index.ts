// ===== tiao — WhatsApp notify on new order (Supabase Edge Function) =====
// Triggered by a Database Webhook on INSERT into public.orders.
// Sends a WhatsApp message to your group via CallMeBot.
//
// Deploy:  supabase functions deploy notify-order --no-verify-jwt
// Secrets: supabase secrets set CALLMEBOT_PHONE=... CALLMEBOT_APIKEY=...
// Then add a Database Webhook (Database → Webhooks) on orders INSERT that
// POSTs to this function's URL. Full steps in SUPABASE_SETUP.md.

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const order = body.record ?? body;              // webhook sends { record: {...} }

    const phone = Deno.env.get("CALLMEBOT_PHONE");
    const apikey = Deno.env.get("CALLMEBOT_APIKEY");
    if (!phone || !apikey) {
      return new Response("CallMeBot not configured", { status: 200 });
    }

    const name = order?.customer_name ?? "a customer";
    const items = Array.isArray(order?.items) ? order.items : [];
    const itemLine = items.length
      ? items.map((i: any) => `${i.brand} ${i.name}`).join(", ")
      : "our products";
    const total = order?.subtotal ?? 0;
    const ref = order?.id ? String(order.id).slice(0, 8).toUpperCase() : "";
    const contact = order?.customer_phone || order?.customer_email || "";

    const text =
      `🛍️ *New tiao order request!*\n` +
      `Thanks ${name} for choosing ${itemLine}.\n` +
      `Est. total: £${total}\n` +
      (contact ? `Contact: ${contact}\n` : "") +
      (ref ? `Ref: #${ref}\n` : "") +
      `Review it in your admin panel.`;

    const url =
      `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
      `&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;

    const res = await fetch(url);
    return new Response(`sent (${res.status})`, { status: 200 });
  } catch (err) {
    // Never fail the order because of a notification problem.
    return new Response(`notify error: ${(err as Error).message}`, { status: 200 });
  }
});
