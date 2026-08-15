Database

mawam_profile
- id (uuid, dari auth.users)
- nama
- role ('petani','distributor')
- no_hp
- alamat
- avatar_url
- created_at
- updated_at

mawam_toko
- id
- user_id (petani)
- nama_toko
- deskripsi
- alamat_toko
- gambar_toko
- rating_avg
- total_review
- created_at
- updated_at

mawam_produk
- id
- toko_id
- nama_produk
- harga
- stok
- satuan ('kg','karung','ton')
- berat_per_unit
- deskripsi
- gambar_produk
- created_at
- updated_at

mawam_produk_images
- id
- produk_id
- url
- deskripsi
- created_at
- updated_at

mawam_transaksi
- id
- distributor_id
- total_harga
- status (
  'pending',
  'menunggu_pembayaran',
  'dibayar',
  'diproses',
  'dikirim',
  'selesai',
  'dibatalkan'
)
- alamat_pengiriman
- hash_blockchain (nullable dulu)
- created_at
- updated_at

mawam_order_items
- id
- transaksi_id
- produk_id
- jumlah
- harga
- subtotal

mawam_pembayaran
- id
- transaksi_id
- metode
- status ('pending','success','failed')
- snap_token
- payment_url
- created_at
- updated_at

mawam_pengiriman
- id
- transaksi_id
- kurir
- resi
- status ('diproses','dikirim','sampai')


mawam_rating
- id
- toko_id
- user_id
- nilai (1-5)
- komentar
- created_at
- updated_at


mawam_notifikasi
- id
- user_id
- judul
- pesan
- status_baca
- created_at
- updated_at




------------- sql

-- 1. TABLE
create table public.mawam_profile (
  id uuid primary key references auth.users(id) on delete cascade,

  nama text not null,
  role text check (role in ('petani','distributor')) not null,

  no_hp text,
  alamat text,
  avatar_url text,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. FUNCTION auto update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 3. TRIGGER
create trigger set_updated_at
before update on public.mawam_profile
for each row
execute function update_updated_at_column();


% RLS

alter table public.mawam_profile enable row level security;

create policy "Users can view own profile"
on public.mawam_profile
for select
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.mawam_profile
for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.mawam_profile
for update
using (auth.uid() = id);


% AUTO Insert jika Regist


create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.mawam_profile (id, nama, role)
  values (new.id, '', 'distributor');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


% toko

-- 1. TABLE
create table public.mawam_toko (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.mawam_profile(id) on delete cascade,

  nama_toko text not null,
  deskripsi text,
  alamat_toko text,
  gambar_toko text,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. INDEX (biar cepat)
create index idx_toko_user_id on public.mawam_toko(user_id);

-- 3. FUNCTION updated_at (pakai yang sama, tidak perlu buat ulang kalau sudah ada)
-- skip kalau sudah dibuat sebelumnya

-- 4. TRIGGER
create trigger set_updated_at_toko
before update on public.mawam_toko
for each row
execute function update_updated_at_column();

% RLS

alter table public.mawam_toko enable row level security;

-- semua user bisa lihat toko
create policy "Anyone can view toko"
on public.mawam_toko
for select
using (true);

-- hanya pemilik bisa insert
create policy "User can insert own toko"
on public.mawam_toko
for insert
with check (auth.uid() = user_id);

-- hanya pemilik bisa update
create policy "User can update own toko"
on public.mawam_toko
for update
using (auth.uid() = user_id);

-- hanya pemilik bisa delete
create policy "User can delete own toko"
on public.mawam_toko
for delete
using (auth.uid() = user_id);


% Produk



-- 1. TABLE
create table public.mawam_produk (
  id uuid primary key default gen_random_uuid(),

  toko_id uuid not null references public.mawam_toko(id) on delete cascade,

  nama_produk text not null,
  harga numeric(12,2) not null,
  stok numeric(12,2) not null default 0,

  satuan text check (satuan in ('kg','karung','ton')) not null,
  berat_per_unit numeric(10,2), -- opsional (misal 1 karung = 50kg)

  deskripsi text,
  gambar_produk text, -- gambar utama

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. INDEX
create index idx_produk_toko_id on public.mawam_produk(toko_id);

-- 3. TRIGGER updated_at
create trigger set_updated_at_produk
before update on public.mawam_produk
for each row
execute function update_updated_at_column();


create table public.mawam_produk_images (
  id uuid primary key default gen_random_uuid(),
  produk_id uuid references public.mawam_produk(id) on delete cascade,

  url text not null,
  deskripsi text,

  created_at timestamp with time zone default now()
);

create index idx_produk_images_produk_id on public.mawam_produk_images(produk_id);


alter table public.mawam_produk enable row level security;

-- semua orang bisa lihat produk
create policy "Anyone can view produk"
on public.mawam_produk
for select
using (true);

-- hanya pemilik toko bisa insert
create policy "User can insert own produk"
on public.mawam_produk
for insert
with check (
  exists (
    select 1 from public.mawam_toko
    where mawam_toko.id = toko_id
    and mawam_toko.user_id = auth.uid()
  )
);

-- hanya pemilik toko bisa update
create policy "User can update own produk"
on public.mawam_produk
for update
using (
  exists (
    select 1 from public.mawam_toko
    where mawam_toko.id = toko_id
    and mawam_toko.user_id = auth.uid()
  )
);

-- hanya pemilik toko bisa delete
create policy "User can delete own produk"
on public.mawam_produk
for delete
using (
  exists (
    select 1 from public.mawam_toko
    where mawam_toko.id = toko_id
    and mawam_toko.user_id = auth.uid()
  )
);

alter table public.mawam_produk_images enable row level security;
create policy "Anyone can view produk images"
on public.mawam_produk_images
for select
using (true);
create policy "User can insert own produk images"
on public.mawam_produk_images
for insert
with check (
  exists (
    select 1
    from public.mawam_produk p
    join public.mawam_toko t on t.id = p.toko_id
    where p.id = produk_id
    and t.user_id = auth.uid()
  )
);

create policy "User can update own produk images"
on public.mawam_produk_images
for update
using (
  exists (
    select 1
    from public.mawam_produk p
    join public.mawam_toko t on t.id = p.toko_id
    where p.id = produk_id
    and t.user_id = auth.uid()
  )
);

create policy "User can delete own produk images"
on public.mawam_produk_images
for delete
using (
  exists (
    select 1
    from public.mawam_produk p
    join public.mawam_toko t on t.id = p.toko_id
    where p.id = produk_id
    and t.user_id = auth.uid()
  )
);

% update
create trigger set_updated_at_produk_images
before update on public.mawam_produk_images
for each row
execute function update_updated_at_column();


% Khusus akun auth

- uid
- display name
- email
- phone 
- providers
- provider type
- create at
- last sign in at