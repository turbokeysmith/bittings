/* ============================================================================
   app/billing.js — the shop's own Bittings subscription (Stripe) — client.
   TKS_TIER.startCheckout() defers here. Calls the `billing-checkout` edge
   function to open Stripe Checkout (subscription) for a tier, and `connect-onboard`
   to connect the shop's own Stripe account (card payouts + Bittings' plan-based fee). NO keys live in
   the client — the edge functions hold STRIPE_SECRET_KEY. Until the plans' price
   ids are set in the cloud, calls surface a clear "not set up yet" notice.
   ========================================================================= */
(function () {
  function sb() { try { return window.TKS && TKS._sb && TKS._sb(); } catch (e) { return null; } }
  function note(m) { (window.uiAlert || window.alert)(m); }

  // supabase-js wraps any non-2xx reply in a FunctionsHttpError whose .message is just
  // "Edge Function returned a non-2xx status code" — the server's real {error} text is in
  // .context (the Response). Pull it out so the owner sees "Billing not configured…" etc.
  async function serverError(err) {
    try { if (err && err.context && typeof err.context.json === 'function') { var j = await err.context.json(); if (j && (j.error || j.message)) return String(j.error || j.message); } } catch (e) {}
    return (err && err.message) || String(err);
  }
  async function invoke(fn, body) {
    var c = sb();
    if (!c || !c.functions) { note('Sign in to the cloud first, then try again.'); return null; }
    try {
      var r = await c.functions.invoke(fn, { body: body || {} });
      if (r.error) { note('Billing error: ' + (await serverError(r.error))); return null; }
      return r.data;
    } catch (e) { note('Could not reach billing just now. Check the connection and try again. (' + (e && e.message || e) + ')'); return null; }
  }

  async function startCheckout(tier) {
    // owner only; opens Stripe Checkout for the plan — or Stripe's billing portal when the shop already has a subscription (8z136)
    var data = await invoke('billing-checkout', { tier: tier });
    if (data && data.url) { location.href = data.url; }          // Stripe-hosted page
    else if (data && data.error) { note(data.error); }
  }

  // 8z136: what this shop would be offered — { plans:{lookup,starter,pro}, founder, founder_off, founder_months } or null. No alerts.
  async function offer() {
    var c = sb(); if (!c || !c.functions) return null;
    try { var r = await c.functions.invoke('billing-checkout', { body: { action: 'offer' } }); return r.error ? null : r.data; } catch (e) { return null; }
  }

  async function openPortal() {
    var data = await invoke('billing-portal', {});
    if (data && data.url) location.href = data.url;
  }

  async function connectOnboard() {
    // create/continue the shop's Stripe Connect (Express) account for the 1% split
    var data = await invoke('connect-onboard', {});
    if (data && data.url) { location.href = data.url; return; }
    if (data && data.connected) note('Your Stripe account is connected. Card payments are on.');
    else if (data && data.state === 'verifying') note('Stripe has your details and is checking them. This usually takes a minute or two. There is nothing else to fill in; this page updates on its own when it is done.');
    try { if (window.TKS_refreshPayoutStatus) TKS_refreshPayoutStatus(); } catch (e) {}
  }
  // Where the shop's Stripe connection stands, without redirecting or popping alerts:
  // { state: 'none' | 'needs_info' | 'verifying' | 'connected', needs: ['a photo of your ID', …] } or null.
  async function connectStatus() {
    var c = sb(); if (!c || !c.functions) return null;
    try { var r = await c.functions.invoke('connect-onboard', { body: { action: 'status' } }); return r.error ? null : r.data; } catch (e) { return null; }
  }

  // ---- Connect a Stripe account the shop ALREADY HAS (keeps its history) — connect-oauth ----
  async function oauthCall(body) {
    var c = sb(); if (!c || !c.functions) return { error: 'Sign in to the cloud first.' };
    try {
      var r = await c.functions.invoke('connect-oauth', { body: body });
      if (r.error) return { error: await serverError(r.error) };
      return r.data || {};
    } catch (e) { return { error: (e && e.message) || String(e) }; }
  }
  async function connectExistingAvailable() { var j = await oauthCall({ action: 'available' }); return !!(j && j.available); }
  async function connectExistingStart() {
    var j = await oauthCall({ action: 'start' });
    if (j && j.url) { location.href = j.url; return; }
    note((j && j.error) || 'Could not start the Stripe sign-in. Try again.');
  }
  // Called once when Stripe sends the owner back with ?code=…&state=…
  async function connectExistingFinish(code, state) { return oauthCall({ action: 'finish', code: code, state: state }); }

  window.TKS_BILLING = { connectExistingAvailable: connectExistingAvailable, connectExistingStart: connectExistingStart, connectExistingFinish: connectExistingFinish, startCheckout: startCheckout, offer: offer, openPortal: openPortal, connectOnboard: connectOnboard, connectStatus: connectStatus };
})();
