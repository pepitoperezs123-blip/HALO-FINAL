// netlify/functions/payment-callback.js
//
// Receives NoRamp's payment status callback and VERIFIES its signature
// before trusting it.
//
// Signature scheme:
//   header  x-platform-signature
//   value   hmac_sha256( raw_json_body , sha256(MERCHANT_TOKEN) )   // hex
//
// Self-contained: uses Node's built-in crypto, no npm dependencies.

const crypto = require("node:crypto");

const MERCHANT_TOKEN = process.env.PAYMENT_GATEWAY_MERCHANT_TOKEN || "";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body || "";

  const signature = getHeader(event, "x-platform-signature");

  if (!verifyGatewayCallbackSignature(rawBody, signature, MERCHANT_TOKEN)) {
    return { statusCode: 401, body: "Invalid signature" };
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  console.log(
    "[noramp] callback verified",
    JSON.stringify({
      session_id: payload.session_id,
      payment_status: payload.payment_status || payload.status,
      order_id: payload.order_id,
    }),
  );

  return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ received: true }) };
};

function verifyGatewayCallbackSignature(rawBody, signature, merchantToken) {
  if (!signature || !merchantToken) return false;
  const tokenHash = crypto.createHash("sha256").update(merchantToken, "utf8").digest("hex");
  const expected = crypto.createHmac("sha256", tokenHash).update(rawBody, "utf8").digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getHeader(event, name) {
  const headers = event.headers || {};
  return headers[name] || headers[name.toLowerCase()] || null;
}
