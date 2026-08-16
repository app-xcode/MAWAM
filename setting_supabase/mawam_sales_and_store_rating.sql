-- Jalankan file ini di Supabase SQL Editor setelah mawam_product_reviews.sql.
--
-- Satu sumber kebenaran untuk penjualan adalah mawam_order_items pada pesanan
-- yang sudah dibayar/diproses/dikirim/selesai. Trigger di bawah memastikan
-- stok dan kolom terjual berubah satu kali saja ketika status pesanan berubah.

alter table public.mawam_orders
  add column if not exists inventory_accounted_at timestamptz;

create or replace function public.sync_mawam_order_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  is_counted_status boolean := new.status in ('paid', 'processed', 'settlement', 'shipped', 'completed');
  was_counted_status boolean := old.status in ('paid', 'processed', 'settlement', 'shipped', 'completed');
begin
  -- Status yang sama-sama termasuk transaksi terjual tidak boleh mengubah
  -- stok/terjual lagi (misalnya paid -> processed -> shipped -> completed).
  if is_counted_status = was_counted_status then
    return new;
  end if;

  -- Kunci seluruh produk pesanan lebih dulu dan validasi stok sebelum ada
  -- pembaruan. Ini mencegah stok minus dan pembelian bersamaan yang melampaui
  -- stok tersedia.
  if is_counted_status then
    perform 1
    from public.mawam_produk p
    join public.mawam_order_items oi on oi.produk_id = p.id
    where oi.order_id = new.id
    order by p.id
    for update of p;

    if exists (
      select 1
      from public.mawam_order_items oi
      join public.mawam_produk p on p.id = oi.produk_id
      where oi.order_id = new.id
        and coalesce(p.stok, 0) < oi.qty
    ) then
      raise exception 'Stok produk tidak mencukupi untuk pesanan %', new.invoice
        using errcode = 'P0001';
    end if;

    for item in
      select produk_id, sum(qty)::bigint as qty
      from public.mawam_order_items
      where order_id = new.id
      group by produk_id
    loop
      update public.mawam_produk
      set stok = stok - item.qty,
          terjual = coalesce(terjual, 0) + item.qty
      where id = item.produk_id;
    end loop;

    new.inventory_accounted_at := coalesce(new.inventory_accounted_at, now());
  else
    -- Pesanan yang sudah terhitung lalu dibatalkan mengembalikan stok dan
    -- membatalkan angka terjualnya. Nilai terjual tidak pernah negatif.
    for item in
      select produk_id, sum(qty)::bigint as qty
      from public.mawam_order_items
      where order_id = new.id
      group by produk_id
    loop
      update public.mawam_produk
      set stok = coalesce(stok, 0) + item.qty,
          terjual = greatest(coalesce(terjual, 0) - item.qty, 0)
      where id = item.produk_id;
    end loop;

    new.inventory_accounted_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_mawam_order_inventory on public.mawam_orders;
create trigger sync_mawam_order_inventory
before update of status on public.mawam_orders
for each row
when (old.status is distinct from new.status)
execute function public.sync_mawam_order_inventory();

-- Rating toko adalah rata-rata seluruh rating ulasan produk yang dimiliki toko.
-- Trigger insert/update/delete menjaga nilai mawam_toko.rating_toko selalu
-- sesuai, termasuk ketika pembeli mengubah atau menghapus ulasannya.
create or replace function public.sync_mawam_store_rating(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
begin
  select toko_id into v_store_id
  from public.mawam_produk
  where id = p_product_id;

  if v_store_id is null then
    return;
  end if;

  update public.mawam_toko toko
  set rating_toko = coalesce((
    select round(avg(review.rating)::numeric, 2)
    from public.mawam_product_reviews review
    join public.mawam_produk produk on produk.id = review.product_id
    where produk.toko_id = v_store_id
  ), 0)
  where toko.id = v_store_id;
end;
$$;

create or replace function public.sync_mawam_store_rating_from_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'INSERT' then
    perform public.sync_mawam_store_rating(old.product_id);
  end if;

  if tg_op <> 'DELETE' then
    perform public.sync_mawam_store_rating(new.product_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_mawam_store_rating_from_review on public.mawam_product_reviews;
create trigger sync_mawam_store_rating_from_review
after insert or update of rating, product_id or delete on public.mawam_product_reviews
for each row execute function public.sync_mawam_store_rating_from_review();

-- Sinkronkan angka terjual untuk data pesanan lama. Stok tidak dibackfill
-- otomatis karena stok yang tersimpan saat ini tidak menyimpan stok awal;
-- trigger di atas akan menangani setiap penjualan baru secara akurat.
update public.mawam_produk produk
set terjual = coalesce((
  select sum(item.qty)
  from public.mawam_order_items item
  join public.mawam_orders pesanan on pesanan.id = item.order_id
  where item.produk_id = produk.id
    and pesanan.status in ('paid', 'processed', 'settlement', 'shipped', 'completed')
), 0);

-- Sinkronkan rating toko untuk ulasan yang sudah ada.
update public.mawam_toko toko
set rating_toko = coalesce((
  select round(avg(review.rating)::numeric, 2)
  from public.mawam_product_reviews review
  join public.mawam_produk produk on produk.id = review.product_id
  where produk.toko_id = toko.id
), 0);
