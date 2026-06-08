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
