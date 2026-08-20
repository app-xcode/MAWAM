-- Jalankan sekali di Supabase SQL Editor.
-- Mendukung urutan dan pencarian pada halaman daftar produk.
create extension if not exists pg_trgm;

create index if not exists idx_mawam_produk_created_at
  on public.mawam_produk (created_at desc, id desc);

create index if not exists idx_mawam_produk_view
  on public.mawam_produk (view desc, id desc);

create index if not exists idx_mawam_produk_terjual
  on public.mawam_produk (terjual desc, id desc);

create index if not exists idx_mawam_produk_harga
  on public.mawam_produk (harga asc, id desc);

create index if not exists idx_mawam_produk_nama_trgm
  on public.mawam_produk using gin (nama_produk gin_trgm_ops);

create index if not exists idx_mawam_produk_deskripsi_trgm
  on public.mawam_produk using gin (deskripsi gin_trgm_ops);
