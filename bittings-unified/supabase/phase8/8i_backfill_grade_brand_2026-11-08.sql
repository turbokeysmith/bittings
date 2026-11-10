-- ============================================================================
-- 8i — one-time backfill of inventory.grade / inventory.brand for the owner's shop
-- (2026-11-08). Requires 8i_inventory_grade_brand.sql first.
-- ----------------------------------------------------------------------------
-- Rule (owner): "… AM" = Aftermarket, "… OEM" = OEM New, "… REF / REFURB / RC" =
-- OEM Refurbished; "all that say UNIV IKEY are Autel universals". Markers are
-- matched as whole tokens of SKU + name (so "CAMRY" never matches AM). Rows with
-- no marker are left blank → they show under "Keys — unsorted" in the app until
-- the owner picks a category on the part form. Accessories / Services untouched.
-- Only touches rows whose grade is still blank, so it is safe to re-run.
--
-- Rollback (everything was blank before this ran):
--   update public.inventory set grade = '', brand = ''
--    where shop_id = '7a1754e6-e2f1-40eb-9c03-9d9a1e891bce';
-- ============================================================================

with t as (
  select id,
         regexp_split_to_array(upper(coalesce(sku,'') || ' ' || coalesce(name,'')), '[^A-Z0-9]+') as tok
    from public.inventory
   where shop_id = '7a1754e6-e2f1-40eb-9c03-9d9a1e891bce'
     and grade = ''
     and not (category ilike 'Accessories/%' or category ilike 'Services/%')
)
update public.inventory i
   set grade = case
                 when 'UNIV' = any(t.tok) or 'IKEY' = any(t.tok) or 'UNIVERSAL' = any(t.tok) then 'Universal'
                 when 'REF' = any(t.tok) or 'REFURB' = any(t.tok) or 'REFURBISHED' = any(t.tok) or 'RECON' = any(t.tok) or 'RC' = any(t.tok) then 'OEM Refurbished'
                 when 'OEM' = any(t.tok) then 'OEM New'
                 when 'AM' = any(t.tok) or 'AFTERMARKET' = any(t.tok) then 'Aftermarket'
                 else ''
               end,
       brand = case when 'IKEY' = any(t.tok) or ('UNIV' = any(t.tok) and 'AUT' = any(t.tok)) then 'Autel' else i.brand end,
       updated_at = now()
  from t
 where i.id = t.id
   and (('UNIV' = any(t.tok) or 'IKEY' = any(t.tok) or 'UNIVERSAL' = any(t.tok))
     or 'REF' = any(t.tok) or 'REFURB' = any(t.tok) or 'REFURBISHED' = any(t.tok) or 'RECON' = any(t.tok) or 'RC' = any(t.tok)
     or 'OEM' = any(t.tok) or 'AM' = any(t.tok) or 'AFTERMARKET' = any(t.tok));

-- Follow-up (same day): the one Universal row the token rule could not brand — XH-XKTO22EN "UNIVERSAL WIRED RHK FOR VVDI K" is an Xhorse VVDI remote.
update public.inventory set brand = 'Xhorse', updated_at = now()
 where shop_id = '7a1754e6-e2f1-40eb-9c03-9d9a1e891bce' and sku = 'XH-XKTO22EN AM' and grade = 'Universal' and brand = '';
