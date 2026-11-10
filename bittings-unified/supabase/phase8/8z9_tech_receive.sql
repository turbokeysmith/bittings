-- 8z9 (2026-11-09): technicians can receive new stock into the shop (owner: "just have techs be able to receive stock").
-- Rewrites the role check inside inv_receive and unit_receive in place (rest of each function unchanged).
-- Rollback: run the same block with the two replace() arguments swapped.
do $$
declare f text; d text;
begin
  foreach f in array array['public.inv_receive(text,integer)', 'public.unit_receive(text,text,integer,text,text,integer)'] loop
    d := pg_get_functiondef(f::regprocedure);
    if position($q$('owner','manager','front_desk')$q$ in d) = 0 then raise exception 'role list not found in %', f; end if;
    d := replace(d, $q$('owner','manager','front_desk')$q$, $q$('owner','manager','front_desk','technician')$q$);
    d := replace(d, 'receive requires front desk, manager, or owner', 'receive requires staff (technician, front desk, manager or owner)');
    execute d;
  end loop;
end $$;
