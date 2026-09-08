create or replace function public.auto_cancel_expired_payment_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.mawam_orders o
  set
    status = 'cancelled',
    cancellation_reason = 'Pembayaran kedaluwarsa dan pesanan dibatalkan otomatis oleh sistem.',
    cancelled_by = 'system',
    cancellation_status = 'none',
    updated_at = now()
  from public.mawam_payments p
  where o.payment_id = p.id
    and p.expired_at is not null
    and p.expired_at <= now()
    and coalesce(lower(p.status), '') not in ('paid', 'settlement', 'success', 'capture')
    and o.status not in ('completed', 'cancelled', 'canceled', 'shipped', 'delivered', 'processed');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.auto_cancel_expired_payment_orders() from public;
grant execute on function public.auto_cancel_expired_payment_orders() to service_role;

select cron.schedule(
  'mawam-auto-cancel-expired-payments',
  '15 * * * *',
  $$select public.auto_cancel_expired_payment_orders();$$
)
where not exists (
  select 1 from cron.job where jobname = 'mawam-auto-cancel-expired-payments'
);
