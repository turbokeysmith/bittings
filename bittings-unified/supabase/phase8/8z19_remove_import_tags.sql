-- Phase 8z19 (2026-11-10) — owner: "remove all import tags". Strips the bookkeeping markers
-- (import:INV-2026-07-02, import:MB-2026-11-09) from inventory notes; real text is kept.
-- Backup of every touched row: phase8/8z19_import_tags_backup.json (id + old notes).
with upd as (
  update inventory
     set notes = nullif(btrim(regexp_replace(regexp_replace(notes, '[ \t]*import:\S*[ \t]*', '', 'g'), '\n{3,}', E'\n\n', 'g'), E' \n\t'), ''),
         updated_at = now()
   where shop_id = '7a1754e6-e2f1-40eb-9c03-9d9a1e891bce' and notes ~ 'import:'
  returning id)
select count(*) cleaned from upd;
