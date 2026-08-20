-- Manual-payment support. Run this migration in the Supabase SQL editor before
-- enabling the new checkout options.

alter table public.mawam_payments
  add column if not exists verification_status text not null default 'menunggu_pembayaran',
  add column if not exists verification_updated_at timestamptz;

alter table public.mawam_payments
  drop constraint if exists mawam_payments_verification_status_check;

alter table public.mawam_payments
  add constraint mawam_payments_verification_status_check
  check (verification_status in (
    'menunggu_pembayaran',
    'bukti_diupload',
    'verifikasi_ai',
    'menunggu_verifikasi_admin',
    'dikonfirmasi',
    'ditolak'
  ));

create table if not exists public.mawam_payment_proofs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.mawam_payments(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  file_size integer not null check (file_size > 0 and file_size <= 5242880),
  status text not null default 'bukti_diupload'
    check (status in ('bukti_diupload', 'verifikasi_ai', 'menunggu_verifikasi_admin', 'dikonfirmasi', 'ditolak')),
  ai_verdict text check (ai_verdict in ('valid', 'tidak_valid', 'perlu_pemeriksaan_manual')),
  ai_confidence numeric(5,4) check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1)),
  ai_reason text,
  ai_raw jsonb,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mawam_payment_proofs_payment_id_idx on public.mawam_payment_proofs(payment_id);
create index if not exists mawam_payment_proofs_buyer_id_idx on public.mawam_payment_proofs(buyer_id);

-- A buyer may submit at most three proofs for one payment. This trigger is
-- server-side so the limit cannot be bypassed by a modified client.
create or replace function public.enforce_mawam_payment_proof_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.payment_id::text, 0));
  if (
    select count(*)
    from public.mawam_payment_proofs
    where payment_id = new.payment_id
  ) >= 3 then
    raise exception 'Maksimal upload bukti pembayaran adalah 3 kali.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_mawam_payment_proof_limit on public.mawam_payment_proofs;
create trigger enforce_mawam_payment_proof_limit
before insert on public.mawam_payment_proofs
for each row execute function public.enforce_mawam_payment_proof_limit();

drop trigger if exists set_updated_at_mawam_payment_proofs on public.mawam_payment_proofs;
create trigger set_updated_at_mawam_payment_proofs
before update on public.mawam_payment_proofs
for each row execute function public.update_updated_at_column();

alter table public.mawam_payment_proofs enable row level security;

drop policy if exists "Buyer can read own payment proofs" on public.mawam_payment_proofs;
create policy "Buyer can read own payment proofs"
on public.mawam_payment_proofs for select
using (buyer_id = auth.uid());

-- The buyer may register an uploaded proof, but cannot set an AI/admin result.
drop policy if exists "Buyer can insert own payment proof" on public.mawam_payment_proofs;
create policy "Buyer can insert own payment proof"
on public.mawam_payment_proofs for insert
with check (
  buyer_id = auth.uid()
  and status = 'bukti_diupload'
  and ai_verdict is null
  and ai_confidence is null
  and ai_reason is null
  and exists (
    select 1 from public.mawam_payments payment
    where payment.id = payment_id and payment.buyer_id = auth.uid()
  )
);

-- Proofs are immutable to clients. Only the service-role Edge Function/admin
-- may write AI results or final review decisions.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Buyer uploads own payment proof" on storage.objects;
create policy "Buyer uploads own payment proof"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Buyer reads own payment proof" on storage.objects;
create policy "Buyer reads own payment proof"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);
