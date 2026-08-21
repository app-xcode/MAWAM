-- Menandai pesanan sebagai selesai oleh pembeli setelah pesanan dikirim.
-- Jalankan setelah tabel mawam_orders dan notifikasi tersedia.

create or replace function public.complete_order(p_order_id uuid)
returns public.mawam_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.mawam_orders;
begin
  if auth.uid() is null then
    raise exception 'Harus masuk terlebih dahulu';
  end if;

  update public.mawam_orders
  set status = 'completed',
      completed_time = coalesce(completed_time, now())
  where id = p_order_id
    and buyer_id = auth.uid()
    and status = 'shipped'
  returning * into result;

  if not found then
    raise exception 'Pesanan tidak ditemukan atau belum berstatus shipped';
  end if;

  -- Notifikasi dibuat di backend karena pembeli tidak boleh menulis
  -- notifikasi milik penjual melalui policy RLS.
  insert into public.notifikasi (user_id, type, title, message, data, dedupe_key)
  values (
    result.seller_id,
    'order_updated',
    'Pesanan selesai',
    'Pembeli sudah menerima pesanan dan menandainya selesai.',
    jsonb_build_object('orderId', result.id, 'path', '/toko/penjualan'),
    'seller_order_completed:' || result.id::text
  )
  on conflict do nothing;

  return result;
end;
$$;

revoke all on function public.complete_order(uuid) from public;
grant execute on function public.complete_order(uuid) to authenticated;
