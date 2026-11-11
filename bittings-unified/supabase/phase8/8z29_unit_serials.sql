-- ============================================================================
-- Phase 8z29 (2026-11-10) — short serial numbers for serialized keys
-- ----------------------------------------------------------------------------
-- Owner: "use letters and numbers to make it a shorter character — 6 or 7 characters".
-- Every inventory_units row gets serial: 7 characters from 23456789ABCDEFGHJKMNPQRSTUVWXYZ (no 0/O, 1/I/L) —
-- 31^7 ≈ 27.5 billion codes, unique per shop (retry on the rare collision). Printed on the key's label (QR + text)
-- and accepted anywhere the long unit id was (scan / Scan-a-key box). The long id stays the internal key.
-- Rollback: drop trigger trg_unit_serial on inventory_units; drop function unit_serial_fill(); drop function new_unit_serial();
--           drop index inventory_units_serial_uq; alter table inventory_units drop column serial;
-- ============================================================================
alter table public.inventory_units add column if not exists serial text;

create or replace function public.new_unit_serial() returns text language plpgsql volatile as $function$
declare a text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; s text := ''; i int;
begin
  for i in 1..7 loop s := s || substr(a, 1 + floor(random() * length(a))::int, 1); end loop;
  return s;
end $function$;

create or replace function public.unit_serial_fill() returns trigger language plpgsql as $function$
declare tries int := 0;
begin
  if new.serial is null or btrim(new.serial) = '' then
    loop
      new.serial := public.new_unit_serial();
      exit when not exists (select 1 from inventory_units u where u.shop_id = new.shop_id and u.serial = new.serial);
      tries := tries + 1; if tries > 20 then raise exception 'could not make a unique serial'; end if;
    end loop;
  else
    new.serial := upper(btrim(new.serial));
  end if;
  return new;
end $function$;

drop trigger if exists trg_unit_serial on public.inventory_units;
create trigger trg_unit_serial before insert on public.inventory_units for each row execute function public.unit_serial_fill();

-- backfill the existing keys (one at a time so the uniqueness check sees each new code)
do $$ declare r record; v text; begin
  for r in select id, shop_id from inventory_units where serial is null order by acquired_at loop
    loop v := public.new_unit_serial(); exit when not exists (select 1 from inventory_units u where u.shop_id = r.shop_id and u.serial = v); end loop;
    update inventory_units set serial = v where id = r.id;
  end loop; end $$;

create unique index if not exists inventory_units_serial_uq on public.inventory_units (shop_id, serial);
