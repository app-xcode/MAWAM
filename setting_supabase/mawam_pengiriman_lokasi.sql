-- Riwayat perpindahan paket antar drop point. Ini bukan live GPS kurir.
-- Jalankan setelah tabel mawam_orders dan mawam_pengiriman sudah tersedia.

alter table public.mawam_pengiriman
  add column if not exists petugas_id uuid references public.mawam_profile(id) on delete set null;

-- Pengiriman lama tetap dapat dikelola oleh penjualnya sampai petugas lain ditugaskan.
update public.mawam_pengiriman p
set petugas_id = o.seller_id
from public.mawam_orders o
where o.id = p.order_id and p.petugas_id is null;

create or replace function public.set_default_pengiriman_petugas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.petugas_id is null then
    select seller_id into new.petugas_id from public.mawam_orders where id = new.order_id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_default_pengiriman_petugas on public.mawam_pengiriman;
create trigger set_default_pengiriman_petugas
before insert on public.mawam_pengiriman
for each row execute function public.set_default_pengiriman_petugas();

create table if not exists public.mawam_pengiriman_lokasi (
  id uuid primary key default gen_random_uuid(),
  pengiriman_id uuid not null references public.mawam_pengiriman(id) on delete cascade,
  updated_by uuid not null references public.mawam_profile(id) on delete restrict,
  latitude double precision,
  longitude double precision,
  kota text not null,
  drop_point text not null,
  status text not null,
  catatan text,
  created_at timestamptz not null default now(),
  constraint mawam_pengiriman_lokasi_coordinates_check check (
    (latitude is null and longitude is null) or
    (latitude between -90 and 90 and longitude between -180 and 180)
  )
);

create index if not exists mawam_pengiriman_lokasi_pengiriman_created_idx
  on public.mawam_pengiriman_lokasi (pengiriman_id, created_at);

alter table public.mawam_pengiriman_lokasi enable row level security;

drop policy if exists "Buyer reads shipment for own order" on public.mawam_pengiriman;
create policy "Buyer reads shipment for own order"
on public.mawam_pengiriman for select to authenticated
using (exists (
  select 1 from public.mawam_orders o
  where o.id = order_id and o.buyer_id = auth.uid()
));

drop policy if exists "Assigned officer reads shipment" on public.mawam_pengiriman;
create policy "Assigned officer reads shipment"
on public.mawam_pengiriman for select to authenticated
using (petugas_id = auth.uid());

-- Pembeli dapat melihat riwayat pesanannya; petugas yang ditugaskan juga dapat membacanya.
drop policy if exists "Buyer and assigned officer read shipment history" on public.mawam_pengiriman_lokasi;
create policy "Buyer and assigned officer read shipment history"
on public.mawam_pengiriman_lokasi for select to authenticated
using (exists (
  select 1 from public.mawam_pengiriman p
  join public.mawam_orders o on o.id = p.order_id
  where p.id = pengiriman_id
    and (o.buyer_id = auth.uid() or p.petugas_id = auth.uid())
));

-- Only the assigned officer may change the current shipment status, and cannot reassign it.
drop policy if exists "Assigned officer updates shipment" on public.mawam_pengiriman;
create policy "Assigned officer updates shipment"
on public.mawam_pengiriman for update to authenticated
using (petugas_id = auth.uid())
with check (petugas_id = auth.uid());

-- One atomic, append-only update. Clients never supply updated_by.
create or replace function public.record_pengiriman_lokasi(
  p_pengiriman_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_kota text,
  p_drop_point text,
  p_status text,
  p_catatan text default null
)
returns public.mawam_pengiriman_lokasi
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.mawam_pengiriman_lokasi;
begin
  if auth.uid() is null then raise exception 'Harus masuk terlebih dahulu'; end if;
  if not exists (
    select 1 from public.mawam_pengiriman
    where id = p_pengiriman_id and petugas_id = auth.uid()
  ) then
    raise exception 'Anda bukan petugas yang ditugaskan pada pengiriman ini';
  end if;
  if coalesce(trim(p_kota), '') = '' or coalesce(trim(p_drop_point), '') = '' or coalesce(trim(p_status), '') = '' then
    raise exception 'Kota, drop point, dan status wajib diisi';
  end if;

  insert into public.mawam_pengiriman_lokasi
    (pengiriman_id, updated_by, latitude, longitude, kota, drop_point, status, catatan)
  values
    (p_pengiriman_id, auth.uid(), p_latitude, p_longitude, trim(p_kota), trim(p_drop_point), trim(p_status), nullif(trim(p_catatan), ''))
  returning * into result;

  update public.mawam_pengiriman set status = trim(p_status) where id = p_pengiriman_id;
  return result;
end;
$$;

revoke all on function public.record_pengiriman_lokasi(uuid, double precision, double precision, text, text, text, text) from public;
grant execute on function public.record_pengiriman_lokasi(uuid, double precision, double precision, text, text, text, text) to authenticated;

-- Needed once per project for postgres_changes subscriptions.
alter table public.mawam_pengiriman_lokasi replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.mawam_pengiriman_lokasi;
exception when duplicate_object then null;
end;
$$;
