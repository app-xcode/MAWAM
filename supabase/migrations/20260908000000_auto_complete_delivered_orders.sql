create extension if not exists pg_cron;

alter table public.mawam_orders
  add column if not exists delivered_at timestamptz,
  add column if not exists auto_complete_at timestamptz;

create index if not exists idx_mawam_orders_auto_complete
  on public.mawam_orders (auto_complete_at)
  where auto_complete_at is not null
    and status not in ('completed', 'cancelled', 'canceled');

create or replace function public.mark_order_delivered_for_auto_complete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.biteship_status = 'delivered'
     and old.biteship_status is distinct from 'delivered' then
    update public.mawam_orders o
       set delivered_at = coalesce(o.delivered_at, now()),
           auto_complete_at = case
             when o.status in ('completed', 'cancelled', 'canceled') then o.auto_complete_at
             else coalesce(o.auto_complete_at, now() + interval '3 days')
           end,
           updated_at = now()
     where o.id = new.order_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_mark_order_delivered_for_auto_complete
  on public.mawam_pengiriman;

create trigger trg_mark_order_delivered_for_auto_complete
after update of biteship_status on public.mawam_pengiriman
for each row
when (new.biteship_status = 'delivered')
execute function public.mark_order_delivered_for_auto_complete();

create or replace function public.auto_complete_delivered_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.mawam_orders
     set status = 'completed',
         completed_time = coalesce(completed_time, now()),
         updated_at = now()
   where auto_complete_at is not null
     and auto_complete_at <= now()
     and delivered_at is not null
     and status not in ('completed', 'cancelled', 'canceled');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.auto_complete_delivered_orders() from public, anon, authenticated;
grant execute on function public.auto_complete_delivered_orders() to postgres;

do $$
begin
  if not exists (
    select 1 from cron.job
    where jobname = 'mawam-auto-complete-delivered-orders'
  ) then
    perform cron.schedule(
      'mawam-auto-complete-delivered-orders',
      '0 * * * *',
      $cron$select public.auto_complete_delivered_orders();$cron$
    );
  else
    perform cron.alter_job(
      (select jobid from cron.job where jobname = 'mawam-auto-complete-delivered-orders'),
      '0 * * * *',
      'select public.auto_complete_delivered_orders();'
    );
  end if;
end
$$;
