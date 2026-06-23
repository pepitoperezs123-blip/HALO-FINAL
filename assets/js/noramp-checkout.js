/* ============================================================
   noramp-checkout.js — connects the Halocompounds checkout to NoRamp.
   Loaded by checkout.html. Posts the order to the Netlify function
   /api/payment-checkout (which holds the secret token) and redirects
   the customer to NoRamp's hosted checkout page.

   Dormant until you set PAYMENT_GATEWAY_* env vars in Netlify: if the
   gateway isn't configured, this throws and checkout.html falls back
   to its current "request a payment link" confirmation. Nothing breaks.
   The merchant token is NEVER referenced here.
   ============================================================ */
(function () {
  "use strict";

  async function startNorampCheckout(order) {
    var origin = window.location.origin;

    var res = await fetch("/api/payment-checkout", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        order: order,
        success_url: origin + "/?paid=1&ref=" + encodeURIComponent(order.id),
        cancel_url: origin + "/checkout.html",
        checkout_id: order.key || order.id,
        company_name: order.customer && order.customer.company,
        compliance: {
          buyer_type: "business_or_lab",
          use_case: "in_vitro_research",
          product_category: "ruo_reference_materials",
          site_acknowledgment: "research_use_only",
          not_for_consumption_acknowledged: true,
          coa_available: true,
          shipping_contains: "research_materials"
        }
      })
    });

    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data.checkout_url) {
      throw new Error(data.error || ("Checkout unavailable (HTTP " + res.status + ")"));
    }

    window.location.assign(data.checkout_url);
  }

  window.startNorampCheckout = startNorampCheckout;
})();
