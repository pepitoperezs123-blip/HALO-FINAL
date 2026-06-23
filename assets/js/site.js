/* ============================================================
   Halocompounds — shared site script
   ============================================================ */
(function () {
  "use strict";

  var CART_KEY = "halo_cart_v1";
  var LEAD_KEY = "halo_lead_ok_v1";
  var LEAD_FORM_NAME = "lead-gate";

  var LOGO = '<svg class="logo" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<circle cx="24" cy="24" r="20" stroke="#13b0a5" stroke-width="3"/>' +
    '<path d="M19 13h10M21 13v9.5L14.5 33a4 4 0 0 0 3.5 6h12a4 4 0 0 0 3.5-6L27 22.5V13" stroke="#0b1d2c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M17.5 30h13" stroke="#13b0a5" stroke-width="2.4" stroke-linecap="round"/></svg>';

  var VIAL = '<svg viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<rect x="22" y="6" width="36" height="10" rx="2" fill="#cfd9e0"/>' +
    '<rect x="26" y="14" width="28" height="6" fill="#aebac4"/>' +
    '<path d="M24 20h32v82a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V20Z" fill="#ffffff" stroke="#9fb2c0" stroke-width="2"/>' +
    '<path d="M24 70h32v32a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V70Z" fill="#d6ece9"/>' +
    '<rect x="29" y="30" width="22" height="20" rx="2" fill="#0b1d2c"/>' +
    '<text x="40" y="43" font-family="monospace" font-size="9" fill="#7fe3d9" text-anchor="middle">RUO</text></svg>';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function money(n) { return "$" + Number(n).toFixed(2); }

  /* ================= CART ================= */
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveCart(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); updateBadge(); renderDrawer(); }
  function cartCount() { return getCart().reduce(function (s, i) { return s + i.qty; }, 0); }
  function cartSubtotal() { return getCart().reduce(function (s, i) { return s + i.price * i.qty; }, 0); }

  function addToCart(item) {
    var cart = getCart();
    var found = cart.find(function (i) { return i.sku === item.sku && i.size === item.size; });
    if (found) found.qty += item.qty;
    else cart.push(item);
    saveCart(cart);
    toast(item.name + " (" + item.size + ") added to cart");
    openDrawer();
  }
  function setQty(sku, size, qty) {
    var cart = getCart();
    var it = cart.find(function (i) { return i.sku === sku && i.size === size; });
    if (!it) return;
    it.qty = Math.max(1, qty);
    saveCart(cart);
  }
  function removeFromCart(sku, size) {
    saveCart(getCart().filter(function (i) { return !(i.sku === sku && i.size === size); }));
  }

  function updateBadge() {
    var b = $("#cartCount");
    if (!b) return;
    var n = cartCount();
    b.textContent = n;
    b.style.display = n ? "grid" : "none";
  }

  /* ================= TOAST ================= */
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2400);
  }

  /* ================= DRAWER ================= */
  function openDrawer() { var o = $("#drawerOverlay"), d = $("#cartDrawer"); if (o) o.classList.add("open"); if (d) d.classList.add("open"); }
  function closeDrawer() { var o = $("#drawerOverlay"), d = $("#cartDrawer"); if (o) o.classList.remove("open"); if (d) d.classList.remove("open"); }

  function renderDrawer() {
    var body = $("#drawerBody"), foot = $("#drawerFoot");
    if (!body) return;
    var cart = getCart();
    if (!cart.length) {
      body.innerHTML = '<div class="empty-cart">Your cart is empty.<br><br><a class="btn btn-ghost" href="shop.html">Browse catalog</a></div>';
      if (foot) foot.style.display = "none";
      return;
    }
    if (foot) foot.style.display = "block";
    body.innerHTML = cart.map(function (i) {
      return '<div class="cart-line">' +
        '<div class="ci">' + VIAL + '</div>' +
        '<div class="meta"><h4>' + i.name + '</h4><div class="sz">' + i.size + ' · ' + i.sku + '</div>' +
        '<div class="lp">' + money(i.price) + ' × ' + i.qty + '</div></div>' +
        '<button class="rm" data-sku="' + i.sku + '" data-size="' + i.size + '">Remove</button></div>';
    }).join("");
    body.querySelectorAll(".rm").forEach(function (btn) {
      btn.addEventListener("click", function () { removeFromCart(btn.dataset.sku, btn.dataset.size); });
    });
    var sub = $("#drawerSubtotal");
    if (sub) sub.textContent = money(cartSubtotal());
  }

  /* ================= ACCESS GATE (age + RUO combined) =================
     Shown on every page load — never persisted to localStorage.
  */
  function buildAgeGate() {
    var g = document.createElement("div");
    g.className = "agegate show";
    g.id = "ageGate";
    g.innerHTML =
      '<div class="ag-box">' +
      '<div class="ag-logo">' + LOGO + '</div>' +
      '<span class="ag-eyebrow">Research Access Only</span>' +
      '<h2 class="ag-title">Before you enter</h2>' +
      '<p class="ag-intro">Halocompounds is a supplier of high-purity chemical reference standards for the scientific community. Everything in this catalog is intended <strong>exclusively for in-vitro laboratory and research use</strong> — not for human consumption, veterinary use, or any clinical application.</p>' +
      '<div class="ag-divider"></div>' +
      '<p class="ag-confirm-label">To proceed, please confirm both of the following:</p>' +
      '<div class="ag-checks">' +
      '<label class="ag-ck" id="ageLabel1">' +
      '<span class="ag-ck-box"><input type="checkbox" id="ageCheck1"><svg viewBox="0 0 12 10" fill="none"><polyline points="1.5 5 4.5 8 10.5 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
      '<span class="ag-ck-text">I am <strong>21 years of age or older.</strong></span>' +
      '</label>' +
      '<label class="ag-ck" id="ageLabel2">' +
      '<span class="ag-ck-box"><input type="checkbox" id="ageCheck2"><svg viewBox="0 0 12 10" fill="none"><polyline points="1.5 5 4.5 8 10.5 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
      '<span class="ag-ck-text">I am a qualified researcher or purchasing on behalf of a research institution, and I will use these materials solely for <strong>laboratory research purposes</strong> — not for human or veterinary use.</span>' +
      '</label>' +
      '</div>' +
      '<button class="btn btn-primary btn-block ag-enter" id="ageYes" disabled>Enter the research catalog</button>' +
      '<a class="ag-exit" href="https://www.google.com">I do not qualify → Exit</a>' +
      '</div>';
    document.body.appendChild(g);
    document.body.style.overflow = "hidden";

    var c1 = g.querySelector("#ageCheck1");
    var c2 = g.querySelector("#ageCheck2");
    var btn = g.querySelector("#ageYes");

    function refresh() {
      var ok = c1.checked && c2.checked;
      btn.disabled = !ok;
      g.querySelector("#ageLabel1").classList.toggle("checked", c1.checked);
      g.querySelector("#ageLabel2").classList.toggle("checked", c2.checked);
    }
    c1.addEventListener("change", refresh);
    c2.addEventListener("change", refresh);

    btn.addEventListener("click", function () {
      g.remove();
      document.body.style.overflow = "";
    });
  }

  /* ================= EMAIL GATE ================= */
  function leadOk() { return localStorage.getItem(LEAD_KEY) === "1"; }

  function formEncode(data) {
    return Object.keys(data).map(function (k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(data[k]);
    }).join("&");
  }

  function buildEmailGate(onDone) {
    if (leadOk()) { if (onDone) onDone(); return; }

    var g = document.createElement("div");
    g.className = "leadgate";
    g.id = "leadGate";
    g.innerHTML =
      '<div class="lead-box">' + LOGO +
      '<h2>Enter your email to continue</h2>' +
      '<p><strong>Everything on this site is intended strictly for laboratory and scientific research purposes only.</strong> These are reference materials — not for human or veterinary use, and not drugs, foods, or supplements. Enter your work email to access the research catalog.</p>' +
      '<form id="leadForm" novalidate>' +
      '<input type="email" id="leadEmail" name="email" placeholder="you@institution.com" autocomplete="email" required>' +
      '<button type="submit" class="btn btn-primary btn-block" id="leadBtn">Enter site</button>' +
      '<p class="lead-err" id="leadErr"></p>' +
      '<p class="fine">Research use only. By entering you confirm you are accessing these materials solely for research purposes and agree to our Terms of Sale and Privacy Policy.</p>' +
      '</form></div>';
    document.body.appendChild(g);
    document.body.style.overflow = "hidden";

    g.querySelector("#leadForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (g.querySelector("#leadEmail").value || "").trim();
      var err = g.querySelector("#leadErr");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        err.textContent = "Please enter a valid email address.";
        return;
      }
      err.textContent = "";
      var btn = g.querySelector("#leadBtn");
      btn.disabled = true;
      btn.textContent = "Entering…";

      function unlock() {
        try {
          localStorage.setItem(LEAD_KEY, "1");
          localStorage.setItem("halo_lead_email", email);
        } catch (e3) { }
        g.remove();
        document.body.style.overflow = "";
        if (onDone) onDone();
      }

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formEncode({ "form-name": LEAD_FORM_NAME, email: email, "bot-field": "" })
      }).then(unlock).catch(unlock);
    });
  }

  /* ================= HEADER / FOOTER ================= */
  function buildChrome() {
    var page = document.body.getAttribute("data-page") || "";

    var bar = document.createElement("div");
    bar.className = "compliance-bar";
    bar.innerHTML = '<strong>Research Use Only.</strong> All products are sold as laboratory reference materials. Not for human or veterinary use. Not for diagnostic or therapeutic use.';

    var header = document.createElement("header");
    header.className = "site-header";
    var nav = [["Home", "index.html"], ["Catalog", "shop.html"], ["Compliance", "compliance.html"], ["About", "about.html"], ["Contact", "contact.html"]];
    var navHtml = nav.map(function (n) {
      var active = (n[1] === page) ? ' style="color:var(--teal-dark)"' : "";
      return '<a href="' + n[1] + '"' + active + '>' + n[0] + '</a>';
    }).join("");
    header.innerHTML =
      '<div class="wrap"><div class="hd">' +
      '<a class="brand" href="index.html">' + LOGO + '<span class="name">Halo<span>compounds</span></span></a>' +
      '<nav class="nav">' + navHtml + '</nav>' +
      '<div class="hd-actions">' +
      '<button class="cart-btn" id="cartOpen" aria-label="Open cart">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' +
      '<span class="cart-count" id="cartCount">0</span></button>' +
      '<button class="menu-toggle" id="menuToggle" aria-label="Menu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>' +
      '</div></div></div>' +
      '<div class="mobile-nav" id="mobileNav">' + nav.map(function (n) { return '<a href="' + n[1] + '">' + n[0] + '</a>'; }).join("") + '</div>';

    document.body.insertBefore(header, document.body.firstChild);
    document.body.insertBefore(bar, header);

    var footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML =
      '<div class="wrap"><div class="footer-grid">' +
      '<div class="fcol"><a class="brand" href="index.html">' + LOGO + '<span class="name">Halo<span>compounds</span></span></a>' +
      '<p class="footer-blurb">High-purity peptide reference standards for the global research community. Every lot is supplied for laboratory research use only.</p></div>' +
      '<div class="fcol"><h4>Catalog</h4>' +
      '<a href="shop.html?cat=Metabolic Research">Metabolic Research</a>' +
      '<a href="shop.html?cat=Tissue Research">Tissue Research</a>' +
      '<a href="shop.html?cat=Growth Factor Research">Growth Factor</a>' +
      '<a href="shop.html">All products</a></div>' +
      '<div class="fcol"><h4>Company</h4><a href="about.html">About</a><a href="contact.html">Contact</a><a href="compliance.html">Compliance</a></div>' +
      '<div class="fcol"><h4>Legal</h4><a href="terms.html">Terms of Sale</a><a href="privacy.html">Privacy Policy</a><a href="shipping-returns.html">Shipping &amp; Returns</a></div>' +
      '</div>' +
      '<div class="footer-ruo"><strong>RESEARCH USE ONLY (RUO) NOTICE.</strong> All products sold by Halocompounds are intended for laboratory and research purposes only. They are not drugs, foods, cosmetics, dietary supplements, or medical devices, and are <strong>not intended for human or veterinary use</strong>, nor for any diagnostic, therapeutic, or clinical application. The statements on this website have not been evaluated by the FDA. By purchasing, the buyer affirms they are a qualified researcher and assumes full responsibility for the safe and lawful handling and use of these materials.</div>' +
      '<div class="footer-bottom"><span>© ' + new Date().getFullYear() + ' Halocompounds. All rights reserved.</span><span>For laboratory research use only.</span></div>' +
      '</div>';
    document.body.appendChild(footer);

    var overlay = document.createElement("div");
    overlay.className = "drawer-overlay"; overlay.id = "drawerOverlay";
    var drawer = document.createElement("aside");
    drawer.className = "drawer"; drawer.id = "cartDrawer";
    drawer.innerHTML =
      '<div class="drawer-head"><h3>Your cart</h3><button class="drawer-close" id="drawerClose" aria-label="Close">×</button></div>' +
      '<div class="drawer-body" id="drawerBody"></div>' +
      '<div class="drawer-foot" id="drawerFoot">' +
      '<div class="sub total"><span>Subtotal</span><span id="drawerSubtotal">$0.00</span></div>' +
      '<p class="note">Shipping &amp; taxes calculated at checkout. RUO acknowledgment required to complete an order.</p>' +
      '<a class="btn btn-primary btn-block" href="checkout.html">Proceed to checkout</a></div>';
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    $("#cartOpen").addEventListener("click", openDrawer);
    $("#drawerClose").addEventListener("click", closeDrawer);
    overlay.addEventListener("click", closeDrawer);
    var mt = $("#menuToggle"), mn = $("#mobileNav");
    if (mt) mt.addEventListener("click", function () { mn.style.display = mn.style.display === "block" ? "none" : "block"; });
  }

  /* ================= EXPOSE ================= */
  window.Halo = {
    products: function () { return window.HALO_PRODUCTS || []; },
    get: function (sku) { return (window.HALO_PRODUCTS || []).find(function (p) { return p.sku === sku; }); },
    addToCart: addToCart,
    removeFromCart: removeFromCart,
    setQty: setQty,
    getCart: getCart,
    saveCart: saveCart,
    subtotal: cartSubtotal,
    count: cartCount,
    money: money,
    vial: VIAL,
    logo: LOGO,
    openDrawer: openDrawer,
    clearCart: function () { localStorage.removeItem(CART_KEY); updateBadge(); renderDrawer(); }
  };

  document.addEventListener("DOMContentLoaded", function () {
    buildChrome();
    updateBadge();
    renderDrawer();
    if (leadOk()) {
      buildAgeGate();
    } else {
      buildEmailGate(function () { buildAgeGate(); });
    }
  });
})();
