-- Cancellation notification flow.
-- Applied to Supabase project crzymkebjvqhqlvjhrwb.
-- Notifications are inserted server-side so recipient IDs cannot be spoofed by the client.

create or replace function public.request_order_cancellation(
  p_order_id uuid,
  p_reason text,
  p_refund_account_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_existing record;
  v_cancellation_id uuid;
  v_need_seller_approval boolean;
begin
  if auth.uid() is null then raise exception 'Anda harus login.'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Alasan pembatalan wajib diisi.'; end if;

  select o.id, o.buyer_id, o.seller_id, o.status, o.total, p.paid_at
  into v_order
  from public.mawam_orders o
  left join public.mawam_payments p on p.id = o.payment_id
  where o.id = p_order_id
  for update of o;

  if not found then raise exception 'Pesanan tidak ditemukan.'; end if;
  if v_order.buyer_id <> auth.uid() then raise exception 'Anda bukan pembeli pesanan ini.'; end if;
  if v_order.status not in ('paid', 'processed', 'settlement') then
    raise exception 'Pembatalan manual hanya dapat diajukan untuk pesanan yang sedang dikemas.';
  end if;

  if not exists (
    select 1 from public.mawam_refund_accounts
    where id = p_refund_account_id and user_id = auth.uid()
  ) then raise exception 'Rekening refund tidak valid.'; end if;

  select * into v_existing
  from public.mawam_order_cancellations
  where order_id = p_order_id
  for update;

  if found and v_existing.seller_decision <> 'cancelled' then
    raise exception 'Permintaan pembatalan untuk pesanan ini masih aktif.';
  end if;

  v_need_seller_approval := v_order.paid_at is null
    or now() > v_order.paid_at + interval '1 hour';

  if found then
    update public.mawam_order_cancellations
    set reason = trim(p_reason),
        original_order_status = v_order.status,
        requested_at = now(),
        seller_decision = case when v_need_seller_approval then 'pending' else 'not_required' end,
        seller_decision_at = case when v_need_seller_approval then null else now() end,
        seller_decision_by = null,
        seller_rejection_reason = null,
        refund_amount = v_order.total,
        refund_account_id = p_refund_account_id,
        refund_status = 'pending',
        refund_proof_path = null,
        admin_notes = null,
        processed_by = null,
        refund_processed_at = null
    where id = v_existing.id
    returning id into v_cancellation_id;
  else
    insert into public.mawam_order_cancellations (
      order_id, buyer_id, seller_id, original_order_status, reason,
      seller_decision, seller_decision_at, refund_amount, refund_account_id, refund_status
    ) values (
      v_order.id, v_order.buyer_id, v_order.seller_id, v_order.status, trim(p_reason),
      case when v_need_seller_approval then 'pending' else 'not_required' end,
      case when v_need_seller_approval then null else now() end,
      v_order.total, p_refund_account_id, 'pending'
    ) returning id into v_cancellation_id;
  end if;

  update public.mawam_orders
  set cancellation_status = case when v_need_seller_approval then 'requested' else 'refund_pending' end,
      cancellation_reason = trim(p_reason)
  where id = v_order.id;

  insert into public.notifikasi (user_id, type, title, message, data, dedupe_key)
  values (
    v_order.buyer_id,
    'order_cancelled',
    case when v_need_seller_approval then 'Pembatalan diajukan' else 'Pembatalan diterima' end,
    case when v_need_seller_approval
      then 'Permintaan pembatalan Anda sedang menunggu persetujuan penjual.'
      else 'Pembatalan Anda diterima dan menunggu proses refund admin.'
    end,
    jsonb_build_object('orderId', v_order.id, 'path', '/pesanan/pesanan'),
    'order_cancelled_buyer:' || v_order.id::text
  ) on conflict (user_id, dedupe_key) do nothing;

  if v_need_seller_approval and v_order.seller_id is not null then
    insert into public.notifikasi (user_id, type, title, message, data, dedupe_key)
    values (
      v_order.seller_id,
      'order_cancelled',
      'Permintaan pembatalan baru',
      'Ada permintaan pembatalan yang menunggu keputusan Anda.',
      jsonb_build_object('orderId', v_order.id, 'path', '/toko/penjualan'),
      'order_cancelled_seller:' || v_order.id::text
    ) on conflict (user_id, dedupe_key) do nothing;
  end if;

  return v_cancellation_id;
end;
$$;

create or replace function public.seller_decide_cancellation(
  p_cancellation_id uuid,
  p_decision text,
  p_rejection_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cancellation record;
  v_order record;
begin
  if auth.uid() is null then raise exception 'Anda harus login.'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Keputusan harus approved atau rejected.'; end if;

  select * into v_cancellation
  from public.mawam_order_cancellations
  where id = p_cancellation_id for update;
  if not found then raise exception 'Data pembatalan tidak ditemukan.'; end if;
  if v_cancellation.seller_id <> auth.uid() then raise exception 'Hanya penjual yang dapat memutuskan pembatalan.'; end if;
  if v_cancellation.seller_decision <> 'pending' then raise exception 'Pembatalan ini sudah diputuskan.'; end if;

  select id, status, cancellation_status into v_order
  from public.mawam_orders where id = v_cancellation.order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan.'; end if;
  if v_order.status not in ('paid', 'processed', 'settlement') then raise exception 'Pesanan sudah tidak berada pada status yang dapat dibatalkan.'; end if;
  if v_order.cancellation_status <> 'requested' then raise exception 'Permintaan pembatalan sudah tidak aktif.'; end if;
  if p_decision = 'rejected' and coalesce(trim(p_rejection_reason), '') = '' then raise exception 'Alasan penolakan wajib diisi.'; end if;

  update public.mawam_order_cancellations
  set seller_decision = p_decision,
      seller_decision_at = now(),
      seller_decision_by = auth.uid(),
      seller_rejection_reason = case when p_decision = 'rejected' then trim(p_rejection_reason) else null end
  where id = p_cancellation_id;

  update public.mawam_orders
  set cancellation_status = case when p_decision = 'approved' then 'refund_pending' else 'seller_rejected' end
  where id = v_cancellation.order_id;

  insert into public.notifikasi (user_id, type, title, message, data, dedupe_key)
  values (
    v_cancellation.buyer_id,
    'order_cancelled',
    case when p_decision = 'approved' then 'Pembatalan disetujui' else 'Pembatalan ditolak' end,
    case when p_decision = 'approved'
      then 'Permintaan pembatalan Anda telah disetujui. Refund akan diproses admin.'
      else 'Penjual menolak permintaan pembatalan Anda. Silakan cek alasan dari penjual.'
    end,
    jsonb_build_object(
      'orderId', v_cancellation.order_id,
      'path', '/pesanan/pesanan',
      'cancellationId', v_cancellation.id,
      'rejectionReason', case when p_decision = 'rejected' then trim(p_rejection_reason) else null end
    ),
    'cancellation_decision:' || v_cancellation.id::text || ':' || p_decision
  ) on conflict (user_id, dedupe_key) do nothing;
end;
$$;

create or replace function public.process_manual_refund(
  p_cancellation_id uuid,
  p_refund_status text,
  p_refund_proof_path text default null,
  p_admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cancellation record;
  v_order record;
  v_current_refund_status text;
begin
  if not public.is_mawam_admin() then raise exception 'Hanya admin yang dapat memproses refund.'; end if;
  if p_refund_status not in ('processing', 'completed', 'failed') then raise exception 'Status refund tidak valid.'; end if;

  select * into v_cancellation from public.mawam_order_cancellations where id = p_cancellation_id for update;
  if not found then raise exception 'Data refund tidak ditemukan.'; end if;
  if v_cancellation.seller_decision not in ('approved', 'not_required') then raise exception 'Refund belum disetujui penjual.'; end if;

  select id, status, cancellation_status into v_order from public.mawam_orders where id = v_cancellation.order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan.'; end if;

  v_current_refund_status := coalesce(v_cancellation.refund_status, 'pending');
  if v_order.status not in ('paid', 'processed', 'settlement') then
    if not (p_refund_status = 'completed' and v_order.status = 'cancelled') then raise exception 'Status pesanan tidak valid untuk proses refund.'; end if;
  end if;
  if v_current_refund_status = 'completed' then raise exception 'Refund untuk pembatalan ini sudah selesai dan tidak dapat diproses ulang.'; end if;
  if p_refund_status = 'processing' and v_current_refund_status not in ('pending', 'failed') then raise exception 'Refund tidak dapat masuk ke status processing dari status saat ini.'; end if;
  if p_refund_status = 'completed' and v_current_refund_status not in ('pending', 'processing') then raise exception 'Refund belum berada pada tahap yang dapat diselesaikan.'; end if;
  if p_refund_status = 'failed' and v_current_refund_status not in ('pending', 'processing') then raise exception 'Refund tidak dapat ditandai gagal dari status saat ini.'; end if;
  if p_refund_status = 'completed' and coalesce(trim(p_refund_proof_path), '') = '' then raise exception 'Bukti transfer refund wajib diunggah.'; end if;

  update public.mawam_order_cancellations
  set refund_status = p_refund_status,
      refund_proof_path = case when nullif(trim(p_refund_proof_path), '') is not null then trim(p_refund_proof_path) else refund_proof_path end,
      admin_notes = case when nullif(trim(p_admin_notes), '') is not null then trim(p_admin_notes) else admin_notes end,
      processed_by = auth.uid(),
      refund_processed_at = case when p_refund_status in ('completed', 'failed') then now() else null end
  where id = p_cancellation_id;

  update public.mawam_orders
  set cancellation_status = case
      when p_refund_status = 'processing' then 'refund_processing'
      when p_refund_status = 'completed' then 'refunded'
      when p_refund_status = 'failed' then 'refund_failed'
    end,
    status = case when p_refund_status = 'completed' then 'cancelled' else status end,
    cancelled_by = case when p_refund_status = 'completed' then 'buyer' else cancelled_by end
  where id = v_cancellation.order_id;

  insert into public.notifikasi (user_id, type, title, message, data, dedupe_key)
  values (
    v_cancellation.buyer_id,
    'order_cancelled',
    case p_refund_status
      when 'processing' then 'Refund sedang diproses'
      when 'completed' then 'Refund berhasil diproses'
      when 'failed' then 'Refund gagal diproses'
    end,
    case p_refund_status
      when 'processing' then 'Admin sedang memproses transfer refund ke rekening Anda.'
      when 'completed' then 'Dana refund telah ditransfer oleh admin.'
      when 'failed' then 'Transfer refund belum berhasil. Admin akan menindaklanjuti proses ini.'
    end,
    jsonb_build_object('orderId', v_cancellation.order_id, 'path', '/pesanan/pesanan', 'cancellationId', v_cancellation.id, 'refundStatus', p_refund_status),
    'refund_status:' || v_cancellation.id::text || ':' || p_refund_status
  ) on conflict (user_id, dedupe_key) do nothing;
end;
$$;

revoke all on function public.request_order_cancellation(uuid,text,uuid) from public;
revoke all on function public.seller_decide_cancellation(uuid,text,text) from public;
revoke all on function public.process_manual_refund(uuid,text,text,text) from public;
grant execute on function public.request_order_cancellation(uuid,text,uuid) to authenticated, service_role;
grant execute on function public.seller_decide_cancellation(uuid,text,text) to authenticated, service_role;
grant execute on function public.process_manual_refund(uuid,text,text,text) to authenticated, service_role;
