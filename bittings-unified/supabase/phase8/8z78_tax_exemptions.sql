-- 8z78 (owner, 2026-11-12): "We need to get tax exempt as an option, with whatever we will need to allow someone to be
-- tax exempt and for us to be compliant."
--
-- Oklahoma (OAC 710:65-7-6): a seller is only relieved of the tax on an exempt sale when it holds the purchaser's
-- documentation, taken in good faith and in its possession within 90 days of the sale. What the documentation is
-- depends on who is buying:
--   * resale (710:65-7-8)          — written certification: name, address, type of business, sales tax permit number,
--                                    signature;
--   * exempt organisations (7-15)  — copy of the Tax Commission letter or card + a signed statement that the purchase
--                                    is made by the entity, with the entity's funds, not by the individual;
--   * 100% disabled veterans (7-17)— copy of the exemption card, or the name, address and exemption number;
--   * agricultural (7-11)          — copy of the agricultural exemption permit card;
--   * manufacturers (7-9)          — copy of the manufacturer's permit, or name, address and permit number.
-- Per exempt sale the seller records the customer's name and address, what the sale was, the date and the amount
-- (710:65-3-33) — that is the receipt itself, which carries a snapshot of the certificate it relied on.
--
-- This table is the "certificate on file", one row per customer per exemption. Nothing is ever deleted: a certificate
-- that is withdrawn is stamped revoked_at, so a past sale can always be traced to the paper it relied on.
-- The card-payment functions are NOT touched: they already read the tax rate saved on the receipt (0 when exempt).

create table if not exists public.tax_exemptions (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null default public.current_shop() references public.shops(id) on delete cascade,
  customer_id     uuid,                          -- customers.id when known (no FK: a customer may be merged or re-created)
  customer_name   text not null,                 -- how the customer is named in the app (used to find the certificate again)
  customer_phone  text not null default '',      -- digits only
  kind            text not null check (kind in ('resale','entity','veteran','agricultural','manufacturer','other')),
  holder_name     text not null,                 -- name on the permit / letter / card
  holder_address  text not null default '',
  business_type   text not null default '',      -- resale: "type of business"
  permit_number   text not null default '',      -- permit / exemption number; 'Letter' for a letter-only entity
  expires_on      date,
  doc_path        text,                          -- photo of the permit / letter / card (bucket exemption-docs)
  doc_added_at    timestamptz,
  statement       text not null default '',      -- the certification the signer agreed to
  signature       text,                          -- PNG data URL of the signature
  signer_name     text not null default '',
  signed_at       timestamptz,
  verified_at     timestamptz,                   -- a manager looked the permit up (OkTAP)
  verified_by     uuid,
  note            text not null default '',
  created_by      uuid default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  revoked_at      timestamptz,
  revoked_by      uuid,
  constraint tax_exemptions_sig_size check (signature is null or length(signature) < 400000),
  constraint tax_exemptions_names check (length(trim(customer_name)) > 0 and length(trim(holder_name)) > 0)
);
create index if not exists tax_exemptions_shop_idx on public.tax_exemptions (shop_id, revoked_at);

alter table public.tax_exemptions enable row level security;
drop policy if exists tx_sel on public.tax_exemptions;
create policy tx_sel on public.tax_exemptions for select to authenticated using (public.is_staff());
drop policy if exists tx_ins on public.tax_exemptions;
create policy tx_ins on public.tax_exemptions for insert to authenticated
  with check (public.is_staff() and created_by = auth.uid() and revoked_at is null and verified_at is null);
drop policy if exists tx_tenant on public.tax_exemptions;
create policy tx_tenant on public.tax_exemptions as restrictive for all to authenticated
  using (shop_id = public.current_shop()) with check (shop_id = public.current_shop());
revoke all on public.tax_exemptions from anon, public;
grant select, insert on public.tax_exemptions to authenticated;   -- changes after that: the functions below
grant all on public.tax_exemptions to service_role;

-- attach / replace the photo of the document (any staff member: the technician in the field takes the picture)
create or replace function public.tax_exemption_set_doc(p_id uuid, p_path text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_shop uuid := public.current_shop(); v_n int;
begin
  if not public.is_staff() then raise exception 'not staff'; end if;
  if coalesce(p_path, '') = '' or split_part(p_path, '/', 1) <> v_shop::text then
    raise exception 'the document must be in this shop''s folder'; end if;
  update tax_exemptions set doc_path = p_path, doc_added_at = now(), updated_at = now()
   where id = p_id and shop_id = v_shop and revoked_at is null;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'exemption not found'; end if;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), public.current_staff_role(), 'tax_exemption_doc', 'tax_exemptions', p_id::text, jsonb_build_object('path', p_path), v_shop);
  return jsonb_build_object('ok', true);
end $function$;

-- manager / owner: mark "permit looked up and valid", or withdraw the certificate
create or replace function public.tax_exemption_review(p_id uuid, p_action text, p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_shop uuid := public.current_shop(); v_n int;
begin
  if not public.is_manager() then raise exception 'only a manager/owner can review a tax exemption'; end if;
  if p_action = 'verify' then
    update tax_exemptions set verified_at = now(), verified_by = auth.uid(), updated_at = now(),
           note = case when coalesce(p_note, '') <> '' then p_note else note end
     where id = p_id and shop_id = v_shop and revoked_at is null;
  elsif p_action = 'unverify' then
    update tax_exemptions set verified_at = null, verified_by = null, updated_at = now()
     where id = p_id and shop_id = v_shop and revoked_at is null;
  elsif p_action = 'revoke' then
    update tax_exemptions set revoked_at = now(), revoked_by = auth.uid(), updated_at = now(),
           note = case when coalesce(p_note, '') <> '' then p_note else note end
     where id = p_id and shop_id = v_shop and revoked_at is null;
  else
    raise exception 'unknown action';
  end if;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'exemption not found'; end if;
  insert into audit_log(user_id, role, action, entity_type, entity_id, detail, shop_id)
    values (auth.uid(), public.current_staff_role(), 'tax_exemption_' || p_action, 'tax_exemptions', p_id::text,
            jsonb_build_object('note', coalesce(p_note, '')), v_shop);
  return jsonb_build_object('ok', true);
end $function$;

revoke all on function public.tax_exemption_set_doc(uuid, text) from public, anon;
revoke all on function public.tax_exemption_review(uuid, text, text) from public, anon;
grant execute on function public.tax_exemption_set_doc(uuid, text) to authenticated;
grant execute on function public.tax_exemption_review(uuid, text, text) to authenticated;

-- the photos: a PRIVATE bucket (a permit or a veteran's card is personal paperwork). Shop staff add and read files in
-- their own shop's folder; nobody replaces or deletes one from the app.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exemption-docs', 'exemption-docs', false, 6291456, array['image/webp','image/jpeg','image/png','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 6291456, allowed_mime_types = array['image/webp','image/jpeg','image/png','application/pdf'];

drop policy if exists "exemption docs: shop staff add" on storage.objects;
drop policy if exists "exemption docs: shop staff read" on storage.objects;
create policy "exemption docs: shop staff add" on storage.objects for insert to authenticated
  with check (bucket_id = 'exemption-docs' and (storage.foldername(name))[1] = public.current_shop()::text and public.is_staff());
create policy "exemption docs: shop staff read" on storage.objects for select to authenticated
  using (bucket_id = 'exemption-docs' and (storage.foldername(name))[1] = public.current_shop()::text and public.is_staff());

notify pgrst, 'reload schema';
