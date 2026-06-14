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
   Manager controls (staff scheduler)
   NOTE: the code keys below are still named TKS_OWNER / OWNER_EMAILS for
   back-compat (they're referenced across the app), but they mean "MANAGER".
   Best practice now is to give each manager their OWN PIN in Setup → Access;
   the shared QUICK_FORM_PIN here is just an optional extra fallback.

   QUICK_FORM_PIN unlocks the per-booking "Quick form" bypass in scheduler.html
   — a one-off plain form that skips the guided coaching steps for a SINGLE
   booking. The next booking goes back to the forced guided flow automatically.

   • Set it to whatever digits you want (e.g. '4071'). CHANGE THE DEFAULT BELOW.
   • Set it to '' (empty) to disable this shared fallback (use personal PINs only).
   • Note: this is a client-side convenience gate, not bank-grade security — the
     value is visible to anyone who can read the page source. It's a manager-only
     shortcut until the real manager login replaces it (the scheduler's
     requestOwnerAccess() is the single swap point for that upgrade).
   ---------------------------------------------------------------------------- */
window.TKS_OWNER = {
  // Who counts as a MANAGER. A signed-in user whose email is in this list gets
  // manager-only powers (e.g. the scheduler Quick form) WITHOUT a PIN. A regular
  // employee's login does NOT — so their account can't unlock manager-only things.
  OWNER_EMAILS: ['samer@turbokeysmith.com'],

  // SHARED fallback PIN for the manager-only quick forms (scheduler Quick booking
  // AND the Receipts "Quick invoice") when NOBODY is signed in (local/offline).
  // Prefer per-manager PINs in Setup → Access; this is an optional extra that also
  // works. When a manager is signed in, no PIN is needed; a signed-in employee is
  // always denied. Set to '' to disable this shared fallback.
  QUICK_FORM_PIN: '1234',   // <-- CHANGE THIS to your own PIN

  // Master ON/OFF switch for the Receipts "Quick invoice" form (the fast,
  // all-on-one-screen alternative to the guided chat). Set to false to turn it
  // off for EVERYONE (trainees and owner) — Receipts becomes guided-chat-only.
  QUICK_INVOICE_ENABLED: true,

  // When true, Receipts opens the Quick invoice form AUTOMATICALLY for the
  // signed-in OWNER (skip the "what are you creating?" chat). Cancelling the
  // form drops you back into the chat. Only affects the owner when signed in;
  // trainees and signed-out users still get the chat. Set to false to always
  // start with the chat choice.
  QUICK_INVOICE_DEFAULT: true
};
