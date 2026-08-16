-- Jalankan seluruh SQL ini di Supabase SQL Editor.
-- Setiap produk di satu pesanan hanya dapat dinilai sekali oleh pembelinya,
-- dengan maksimal tiga foto ulasan.

create table if not exists public.mawam_product_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.mawam_orders(id) on delete cascade,
  order_item_id uuid not null references public.mawam_order_items(id) on delete cascade,
  product_id uuid not null references public.mawam_produk(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  review text check (char_length(review) <= 500),
  image_url text,
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_id, order_item_id)
);

-- Baris ini diperlukan bila tabel dibuat memakai SQL versi sebelumnya (satu foto).
alter table public.mawam_product_reviews add column if not exists image_urls text[] not null default '{}';
update public.mawam_product_reviews
set image_urls = array[image_url]
where image_url is not null and coalesce(array_length(image_urls, 1), 0) = 0;

alter table public.mawam_product_reviews
drop constraint if exists mawam_product_reviews_max_three_images;
alter table public.mawam_product_reviews
add constraint mawam_product_reviews_max_three_images
check (coalesce(array_length(image_urls, 1), 0) <= 3);

create index if not exists mawam_product_reviews_product_id_idx on public.mawam_product_reviews(product_id);
create index if not exists mawam_product_reviews_order_id_idx on public.mawam_product_reviews(order_id);

-- View aman yang hanya membuka nama dan avatar reviewer (bukan nomor HP/alamat).
create or replace view public.mawam_reviewers as
select id, nama, avatar_url
from public.mawam_profile;
grant select on public.mawam_reviewers to anon, authenticated;

create or replace function public.set_mawam_product_review_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_mawam_product_review_updated_at on public.mawam_product_reviews;
create trigger set_mawam_product_review_updated_at
before update on public.mawam_product_reviews
for each row execute function public.set_mawam_product_review_updated_at();

alter table public.mawam_product_reviews enable row level security;

drop policy if exists "Pembeli melihat penilaiannya sendiri" on public.mawam_product_reviews;
drop policy if exists "Ulasan produk dapat dibaca publik" on public.mawam_product_reviews;
create policy "Ulasan produk dapat dibaca publik"
on public.mawam_product_reviews for select to anon, authenticated
using (true);

drop policy if exists "Pembeli menambah penilaian pesanan selesai" on public.mawam_product_reviews;
create policy "Pembeli menambah penilaian pesanan selesai"
on public.mawam_product_reviews for insert to authenticated
with check (
  buyer_id = auth.uid()
  and exists (
    select 1 from public.mawam_orders o
    join public.mawam_order_items oi on oi.order_id = o.id
    where o.id = order_id
      and oi.id = order_item_id
      and oi.produk_id = product_id
      and o.buyer_id = auth.uid()
      and o.status = 'completed'
  )
);

drop policy if exists "Pembeli mengubah penilaiannya sendiri" on public.mawam_product_reviews;
create policy "Pembeli mengubah penilaiannya sendiri"
on public.mawam_product_reviews for update to authenticated
using (buyer_id = auth.uid())
with check (
  buyer_id = auth.uid()
  and exists (
    select 1 from public.mawam_orders o
    join public.mawam_order_items oi on oi.order_id = o.id
    where o.id = order_id
      and oi.id = order_item_id
      and oi.produk_id = product_id
      and o.buyer_id = auth.uid()
      and o.status = 'completed'
  )
);

-- Foto ulasan disimpan dalam bucket "mawam" yang sudah digunakan aplikasi.
-- Jalankan bagian ini bila bucket tersebut belum mengizinkan upload folder reviews/.
drop policy if exists "Pembeli upload foto penilaian" on storage.objects;
create policy "Pembeli upload foto penilaian"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'mawam'
  and (storage.foldername(name))[1] = 'reviews'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Pembeli hapus foto penilaian sendiri" on storage.objects;
create policy "Pembeli hapus foto penilaian sendiri"
on storage.objects for delete to authenticated
using (
  bucket_id = 'mawam'
  and (storage.foldername(name))[1] = 'reviews'
  and (storage.foldername(name))[2] = auth.uid()::text
);
