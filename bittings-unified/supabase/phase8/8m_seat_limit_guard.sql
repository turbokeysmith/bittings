-- ============================================================================
-- Phase 8 · 8m — Seat limit enforced in the DATABASE (owner-approved, 2026-11-08)
-- ----------------------------------------------------------------------------
-- Companion to the staff-invite edge function (which answers
--   402 { error:"SEAT_LIMIT", used, allowed, tier, message }
-- when a shop has used every seat). The edge function is the first line; this
-- BEFORE trigger on public.staff is the second, so a race between two invites
-- or a direct insert cannot exceed the entitlement either. `staff` is the source
-- of truth — trg_staff_member (AFTER) mirrors it into shop_members, so guarding
-- staff guards shop_members too.
--
-- Rule (same arithmetic as public.seat_usage()):
--   a staff row that BECOMES active (INSERT active, or inactive → active) for a
--   non-owner role is refused when
--     count(other active staff in the shop) >= seats_included + seats_addon
--   of the shop's subscriptions row.
-- Never blocked: owner rows (create_shop / owner re-activation), rows that are
-- already active (name/role/van edits), de-activations, shops with NO
-- subscriptions row (no known entitlement — mirrors seat_usage() → allowed null).
-- Live shops today: 2/5 and 4/5 seats, both Pro → no behaviour change.
--
-- Error: ERROR 42501  SEAT_LIMIT: this shop is using 2 of 2 seats (starter plan) — upgrade your plan or add a seat
--
-- Rollback:
--   drop trigger if exists trg_staff_seat_limit on public.staff;
--   drop function if exists public.staff_seat_guard();
-- Apply: npx supabase@3.0.0 db query --remote --yes -f bittings-unified/supabase/phase8/8m_seat_limit_guard.sql
-- ============================================================================

create or replace function public.staff_seat_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_allowed int; v_used int; v_tier text;
begin
  -- only a row that BECOMES active for a non-owner is a new seat
  if not coalesce(new.active, false) then return new; end if;
  if tg_op = 'UPDATE' and coalesce(old.active, false)
     and old.shop_id is not distinct from new.shop_id then return new; end if;
  if new.role = 'owner' or new.shop_id is null then return new; end if;

  select s.tier, s.seats_included + s.seats_addon into v_tier, v_allowed
    from public.subscriptions s where s.shop_id = new.shop_id
    order by s.updated_at desc limit 1;
  if v_allowed is null then return new; end if;   -- no subscription row → no known entitlement

  select count(*) into v_used from public.staff st
    where st.shop_id = new.shop_id and st.active
      and st.user_id is distinct from new.user_id;   -- exclude the row being written
  if v_used >= v_allowed then
    raise exception 'SEAT_LIMIT: this shop is using % of % seats (% plan) — upgrade your plan or add a seat',
      v_used, v_allowed, v_tier using errcode = '42501';
  end if;
  return new;
end $$;

revoke all on function public.staff_seat_guard() from public;

drop trigger if exists trg_staff_seat_limit on public.staff;
create trigger trg_staff_seat_limit
  before insert or update of active, shop_id, role on public.staff
  for each row execute function public.staff_seat_guard();
