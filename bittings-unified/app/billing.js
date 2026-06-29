/* ============================================================================
   app/billing.js — Stripe subscription billing (TEST MODE) client.
   TKS_TIER.startCheckout() defers here. Calls the `billing-checkout` edge
   function to open Stripe Checkout (subscription) for a tier, and `connect-onboard`
   to set up the shop's Connect account for the 1% revenue split. NO keys live in
   the client — the edge functions hold STRIPE_SECRET_KEY (test). Until the test
   keys + price ids are configured, calls surface a clear "not configured" notice.
   ========================================================================= */
(function () {
  function sb() { try { return window.TKS && TKS._sb && TKS._sb(); } catch (e) { return null; } }
  function note(m) { (window.uiAlert || window.alert)(m); }

  async function invoke(fn, body) {
    var c = sb();
    if (!c || !c.functions) { note('Billing needs a signed-in cloud session (Stripe test keys pending).'); return null; }
    try {
      var r = await c.functions.invoke(fn, { body: body || {} });
      if (r.error) { note('Billing error: ' + (r.error.message || r.error)); return null; }
      return r.data;
    } catch (e) { note('Billing is not configured yet (Stripe test keys + price ids pending): ' + (e && e.message || e)); return null; }
  }

  async function startCheckout(tier) {
    // owner only; opens Stripe Checkout (test) for the tier subscription
    var data = await invoke('billing-checkout', { tier: tier });
    if (data && data.url) { location.href = data.url; }          // Stripe-hosted Checkout (test mode)
    else if (data && data.error) { note(data.error); }
  }

  async function openPortal() {
    var data = await invoke('billing-portal', {});
    if (data && data.url) location.href = data.url;
  }

  async function connectOnboard() {
    // create/continue the shop's Stripe Connect (Express) account for the 1% split
    var data = await invoke('connect-onboard', {});
    if (data && data.url) location.href = data.url;
    else if (data && data.connected) note('Stripe Connect already set up for this shop.');
  }

  window.TKS_BILLING = { startCheckout: startCheckout, openPortal: openPortal, connectOnboard: connectOnboard };
})();
