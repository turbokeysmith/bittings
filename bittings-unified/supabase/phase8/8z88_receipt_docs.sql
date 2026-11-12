-- 8z88 (owner, 2026-11-12): "On a D1 form … let me upload a copy of the license and proof of ownership … is there a
-- way to scan a QR code that takes me straight to that receipt and customer to upload the pictures, so we aren't just
-- adding them randomly. Also give me an option to upload from the PC."
--
-- Photos / scans that belong to ONE receipt (NASTF D1 paperwork: driver's licence, proof of ownership, plate,
-- odometer). One row per file, tied to the receipt id — and to a vehicle when the receipt has more than one — so a
-- picture can only ever be filed against a receipt, never loose.
--   * the files sit in a PRIVATE bucket (a driver's licence is personal paperwork): shop staff add and read files in
--     their own shop's folder; nothing is public, nothing is replaced or deleted from the app;
--   * rows are added by any staff member of the shop; "remove" is a manager's stamp (removed_at) — the row and the
--     file stay, so there is always a record of what was collected and by whom.

create table if not exists public.receipt_docs (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null default public.current_shop() references public.shops(id) on delete cascade,
  receipt_id  text not null,
  kind        text not null check (kind in ('license', 'ownership', 'plate', 'odometer', 'other')),
  veh_idx     integer not null default 0,          -- 0 = the first vehicle on the receipt
  path        text not null,                        -- bucket receipt-docs: <shop>/<receipt>/<time>-<kind>.jpg
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  removed_at  timestamptz,
  removed_by  uuid,
  constraint receipt_docs_ids check (length(receipt_id) between 1 and 120 and veh_idx between 0 and 20)
);
create index if not exists receipt_docs_receipt_idx on public.receipt_docs (shop_id, receipt_id);

alter table public.receipt_docs enable row level security;
drop policy if exists rd_sel on public.receipt_docs;
create policy rd_sel on public.receipt_docs for select to authenticated using (public.is_staff());
drop policy if exists rd_ins on public.receipt_docs;
create policy rd_ins on public.receipt_docs for insert to authenticated
  with check (public.is_staff() and created_by = auth.uid() and removed_at is null
              and split_part(path, '/', 1) = public.current_shop()::text);
drop policy if exists rd_tenant on public.receipt_docs;
create policy rd_tenant on public.receipt_docs as restrictive for all to authenticated
  using (shop_id = public.current_shop()) with check (shop_id = public.current_shop());
revoke all on public.receipt_docs from anon, public;
grant select, insert on public.receipt_docs to authenticated;
grant all on public.receipt_docs to service_role;

create or replace function public.receipt_doc_remove(p_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_n int;
begin
  if not public.is_manager() then raise exception 'only a manager/owner can remove a document'; end if;
  update receipt_docs set removed_at = now(), removed_by = auth.uid() where id = p_id and shop_id = public.current_shop() and removed_at is null;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'document not found'; end if;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), public.current_staff_role(), 'receipt_doc_removed', 'receipt_docs', p_id::text, '{}'::jsonb, public.current_shop());
  return jsonb_build_object('ok', true);
end $function$;
revoke all on function public.receipt_doc_remove(uuid) from public, anon;
grant execute on function public.receipt_doc_remove(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipt-docs', 'receipt-docs', false, 8388608, array['image/webp','image/jpeg','image/png','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 8388608, allowed_mime_types = array['image/webp','image/jpeg','image/png','application/pdf'];

drop policy if exists "receipt docs: shop staff add" on storage.objects;
drop policy if exists "receipt docs: shop staff read" on storage.objects;
create policy "receipt docs: shop staff add" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipt-docs' and (storage.foldername(name))[1] = public.current_shop()::text and public.is_staff());
create policy "receipt docs: shop staff read" on storage.objects for select to authenticated
  using (bucket_id = 'receipt-docs' and (storage.foldername(name))[1] = public.current_shop()::text and public.is_staff());

notify pgrst, 'reload schema';
