// netlify/functions/payment-checkout.js
//
// Creates a NoRamp hosted checkout session SERVER-SIDE and returns
// { checkout_url }. The merchant token never leaves the server.
//
// Self-contained: no npm dependencies (uses Node 18+ global fetch).
// Maps to NoRamp's documented endpoint:  POST {API_BASE}/checkout/sessions
// Auth header:  authorization: Bearer <merchant token>

const API_BASE_URL = (process.env.PAYMENT_GATEWAY_API_BASE_URL || "").replace(/\/+$/, "");
const MERCHANT_TOKEN = process.env.PAYMENT_GATEWAY_MERCHANT_TOKEN || "";
const SITE_URL = (process.env.SITE_URL || "").replace(/\/+$/, "");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }
  if (!API_BASE_URL || !MERCHANT_TOKEN) {
    return json(500, { error: "Payment gateway is not configured on the server." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const order = body.order;
  if (!order || !order.id || !Array.isArray(order.items) || order.total == null) {
    return json(400, { error: "Missing or invalid 'order' (needs id, items[], total)." });
  }

  const stableKey = body.checkout_id || body.idempotency_key || order.key || order.id;

  const payload = {
    order,
    success_url: body.success_url,
    cancel_url: body.cancel_url,
    callback_url: SITE_URL ? `${SITE_URL}/api/payment-callback` : body.callback_url,
    checkout_id: stableKey,
    idempotency_key: stableKey,
    source: "custom_site",
    company_name: body.company_name || order.company_name,
    compliance: body.compliance || order.compliance,
  };

  try {
    const res = await fetch(`${API_BASE_URL}/checkout/sessions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${MERCHANT_TOKEN}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      return json(res.status, {
        error: (data && data.error) || `Gateway error: HTTP ${res.status}`,
        code: data && data.code,
      });
    }
    if (!data || !data.checkout_url) {
      return json(502, { error: "Gateway did not return a checkout_url." });
    }

    return json(200, { checkout_url: data.checkout_url, session_id: data.session_id });
  } catch (err) {
    return json(502, { error: "Could not reach the payment gateway." });
  }
};

async function safeJson(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(obj),
  };
}
