-- ============================================================================
-- Phase 8z24 (2026-11-10) — technicians can't see the shop's sales
-- ----------------------------------------------------------------------------
-- Owner: "why is Jayden able to see total sales? He's not a manager."
-- Before: payment_transactions + receipts were readable by EVERY staff member (is_staff()).
--   • payment_transactions: read = owner / manager / front desk only. (Technicians never read the ledger;
--     card flows go through the edge functions with the service key.)
--   • receipts (+ receipts_safe, which is security_invoker): a technician only reads HIS receipts — the ones
--     he created (new created_by column) or where he is the technician (by id, e-mail or name).
--     Owner / manager / front desk unchanged.
-- Rollback: restore policies pt_select (is_staff()) and rc_select (is_staff() and (deleted_at is null or is_manager()));
--           drop function public.receipt_is_mine(jsonb, uuid); alter table public.receipts drop column created_by;
-- ============================================================================
alter table public.receipts add column if not exists created_by uuid default auth.uid();

create or replace function public.receipt_is_mine(p_data jsonb, p_created_by uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select auth.uid() is not null and (
         p_created_by = auth.uid()
      or nullif(p_data->>'technicianId','') = auth.uid()::text
      or lower(nullif(btrim(p_data->>'technician'),'')) = lower(coalesce(auth.jwt()->>'email',''))
      or lower(nullif(btrim(p_data->>'technician'),'')) = (select lower(s.name) from staff s where s.user_id = auth.uid() and s.shop_id = public.current_shop() limit 1)
  );
$function$;
revoke execute on function public.receipt_is_mine(jsonb, uuid) from public, anon;
grant  execute on function public.receipt_is_mine(jsonb, uuid) to authenticated;

drop policy if exists pt_select on public.payment_transactions;
create policy pt_select on public.payment_transactions for select
  using (public.is_staff() and coalesce(public.current_staff_role(),'') in ('owner','manager','front_desk'));

drop policy if exists rc_select on public.receipts;
create policy rc_select on public.receipts for select
  using (public.is_staff() and (deleted_at is null or public.is_manager())
         and (coalesce(public.current_staff_role(),'') <> 'technician' or public.receipt_is_mine(data, created_by)));
