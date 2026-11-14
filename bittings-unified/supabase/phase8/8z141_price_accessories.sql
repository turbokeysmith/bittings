-- ============================================================================
-- Phase 8 · 8z141 — accessories in the automatic price rules
-- (owner, 2026-11-13: "also include accessories in the automated pricing please")
-- ----------------------------------------------------------------------------
-- The database copy of the rule (8z139) learns the 'accessory' kind — the same change as
-- autoPriceFor() in index.html:
--   • anything whose category starts with "Accessories" is an accessory, whatever its name says
--     (before, an accessory with "prox" in its name was treated as a smart key);
--   • its numbers are accMarkupPct / accMin / accMax and its own rounding accRoundTo
--     (blank = the keys' rounding);
--   • accMarkupPct left blank = accessories are NOT priced by the rules (priced by hand).
-- tools/qa/price-rule-sql-check.js compares the two copies.
-- Apply:  npx supabase@3.0.0 db query --remote --yes --file bittings-unified/supabase/phase8/8z141_price_accessories.sql
-- ============================================================================

create or replace function public.key_price_kind(p_category text, p_name text)
returns text language sql immutable set search_path to 'public' as $$
  with s as (select coalesce(p_category, '') as cat, coalesce(p_name, '') as nm),
       t as (select cat, nm, case when position('/' in cat) > 0 then btrim(substr(cat, position('/' in cat) + 1)) else '' end as sub from s)
  select case
           when cat ~* '^accessor' then 'accessory'           -- 8z141: filed under Accessories → an accessory, whatever the name says
           when nm ~* '(peps|prox|proximity|prx)' or sub = 'Smart Key' then 'smart'
           when cat !~* '^keys/' then null                    -- not a key: never priced by the rules
           when sub ~* '^remote' then 'remote'
           when sub ~* '^transponder' then 'transponder'
           else 'other'
         end
    from t;
$$;

create or replace function public.auto_price_calc(a jsonb, p_cost numeric, p_category text, p_name text)
returns integer language plpgsql immutable set search_path to 'public' as $$
declare
  kind text := public.key_price_kind(p_category, p_name);
  pct numeric; mn numeric; mx numeric; step numeric; price numeric; floor_ numeric;
begin
  if kind is null or p_cost is null or p_cost <= 0 then return null; end if;
  -- a shop that never saved its rules uses the app's defaults (app/store.js)
  a := '{"on":true,"stdMarkupPct":150,"smartMarkupPct":200,"roundTo":5,"stdMin":25,"smartMin":75}'::jsonb
       || coalesce(case when jsonb_typeof(a) = 'object' then a end, '{}'::jsonb);
  if (a->'on') is distinct from 'true'::jsonb then return null; end if;

  step := greatest(0, coalesce(public._jnum(a, 'roundTo'), 0));
  if kind = 'accessory' then
    pct := public._jnum(a, 'accMarkupPct');
    if pct is null then return null; end if;             -- no percentage typed = accessories are priced by hand
    mn  := public._jnum(a, 'accMin');
    mx  := public._jnum(a, 'accMax');
    step := greatest(0, coalesce(public._jnum(a, 'accRoundTo'), step));
  else
    pct := public._jnum(a, case kind when 'smart' then 'smartMarkupPct' when 'remote' then 'remoteMarkupPct' when 'transponder' then 'transponderMarkupPct' else 'stdMarkupPct' end);
    mn  := public._jnum(a, case kind when 'smart' then 'smartMin'       when 'remote' then 'remoteMin'       when 'transponder' then 'transponderMin'       else 'stdMin' end);
    mx  := public._jnum(a, case kind when 'smart' then 'smartMax'       when 'remote' then 'remoteMax'       when 'transponder' then 'transponderMax'       else 'stdMax' end);
    if kind <> 'smart' then                              -- blank = the "other keys" numbers (the highest price has no fall-back: blank = none)
      pct := coalesce(pct, public._jnum(a, 'stdMarkupPct'));
      mn  := coalesce(mn,  public._jnum(a, 'stdMin'));
    end if;
  end if;
  pct := greatest(0, coalesce(pct, 0));
  mn  := greatest(0, coalesce(mn, 0));

  price := p_cost * (1 + pct / 100);
  if step > 0 then price := ceil((price - 0.000000001) / step) * step; end if;
  if price < mn then price := mn; end if;
  -- a highest price — but never under what the item cost
  if mx is not null and mx > 0 and price > mx then
    floor_ := p_cost; if step > 0 then floor_ := ceil((p_cost - 0.000000001) / step) * step; end if;
    price := greatest(mx, floor_);
  end if;
  return round(price * 100)::integer;
end;
$$;
