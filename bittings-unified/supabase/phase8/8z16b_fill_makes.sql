-- Phase 8z16b (2026-11-10) — data: put the make in front of "Fits" for 23 Turbo Keysmith keys whose name had no
-- readable make (MicroBiz shorthand / key codes only). Old values are kept in audit_log (action 'fill_make').
-- Left for the count picker (not sure): Y170-PT ID46, H128-PT HITAG, Metal Key, BAF IYZ 2008-2019, 17-25 SUV 5BTN.
with m(id, mk) as (values
  ('imp_0175','Hyundai'), ('mb_0003','Hyundai'), ('mb_0006','Hyundai'), ('mb_0005','Kia'), ('mb_0021','Kia'), ('mb_0022','Kia'),
  ('mb_0020','Honda'), ('mb_0024','Toyota; Lexus'), ('mb_0037','Jeep'), ('mb_0044','Chevrolet; GMC'), ('mb_0077','Lexus'),
  ('mb_0087','Toyota'), ('mb_0088','Toyota'), ('mb_0098','Toyota'), ('mb_0100','Toyota'), ('mb_0101','Toyota'), ('mb_0102','Toyota'),
  ('mb_0092','Ford'), ('mb_0095','Ford'), ('mb_0106','Ford'), ('mb_0118','Genesis'), ('mb_0155','Chrysler; Dodge; Jeep')),
old as (select i.id, i.fitment, m.mk from inventory i join m on m.id = i.id
         where i.shop_id = '7a1754e6-e2f1-40eb-9c03-9d9a1e891bce' and i.deleted_at is null),
log as (insert into audit_log(user_id, role, action, entity_type, entity_id, shop_id, detail)
         select null, 'system', 'fill_make', 'inventory', id, '7a1754e6-e2f1-40eb-9c03-9d9a1e891bce', jsonb_build_object('fits_before', fitment, 'make_added', mk) from old returning 1),
upd as (update inventory i set fitment = case when coalesce(btrim(o.fitment),'') = '' then o.mk else o.mk || '; ' || o.fitment end, updated_at = now()
          from old o where i.id = o.id and i.shop_id = '7a1754e6-e2f1-40eb-9c03-9d9a1e891bce' returning i.id)
select (select count(*) from upd) updated, (select count(*) from log) logged;
