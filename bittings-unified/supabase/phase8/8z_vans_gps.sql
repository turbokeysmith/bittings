-- 8z (2026-11-09): GPS tracker on each van — which tracking company, and the device's serial / IMEI.
-- Groundwork for live van locations (owner is testing VitalGlow GPS, which offers an API). Additive only.
alter table public.vans add column if not exists gps_provider  text;
alter table public.vans add column if not exists gps_device_id text;   -- serial number / IMEI printed on the tracker
comment on column public.vans.gps_device_id is 'GPS tracker serial number / IMEI (8z)';
-- rollback: alter table public.vans drop column if exists gps_device_id, drop column if exists gps_provider;
