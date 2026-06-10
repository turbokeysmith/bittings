/* ============================================================================
   Turbo Keysmith — cloud connection config (staff app)
   ----------------------------------------------------------------------------
   These are the SAME Supabase project URL + publishable (anon) key already in
   cloud-test.html. The anon key is meant to be public — every request is still
   gated by Row Level Security (authenticated users only), so exposing it here
   is safe.

   The staff app reads this and AUTO-CONNECTS *only when an employee is signed
   in* (Supabase session present). If anything is missing — not signed in, a
   table not created yet, offline — it silently falls back to localStorage.
   Per-table: a table that hasn't been created (run app_tables_setup.sql) just
   stays local until it exists.

   To force everything back to local for testing, set AUTO_CONNECT: false.
   ============================================================================ */
window.TKS_CLOUD = {
  AUTO_CONNECT: true,
  url: 'https://gcshuhlksjznksspbigl.supabase.co',
  anonKey: 'sb_publishable_ZAbJ-2SEResLrdsLvbgh1A_puY6vDL0'
};

/* ----------------------------------------------------------------------------
   Owner controls (staff scheduler)
   QUICK_FORM_PIN unlocks the per-booking "Quick form" bypass in scheduler.html
   — a one-off plain form that skips the guided coaching steps for a SINGLE
   booking. The next booking goes back to the forced guided flow automatically.

   • Set it to whatever digits you want (e.g. '4071'). CHANGE THE DEFAULT BELOW.
   • Set it to '' (empty) to disable the bypass entirely (guided-only).
   • Note: this is a client-side convenience gate, not bank-grade security — the
     value is visible to anyone who can read the page source. It's an owner-only
     shortcut until the real owner login replaces it (the scheduler's
     requestOwnerAccess() is the single swap point for that upgrade).
   ---------------------------------------------------------------------------- */
window.TKS_OWNER = {
  QUICK_FORM_PIN: '1234'   // <-- CHANGE THIS to your own PIN
};
