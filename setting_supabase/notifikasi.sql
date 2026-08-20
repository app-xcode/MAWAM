-- Migration: create notifikasi and notification_tokens tables
-- Run this on your Supabase database (SQL editor or migration tool)

-- Enable pgcrypto for gen_random_uuid if not available
create extension if not exists "pgcrypto";

-- Table: notifikasi
create table if not exists public.notifikasi (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    type text not null,
    title text not null,
    message text,
    data jsonb,
    is_read boolean default false not null,
    dedupe_key text,
    created_at timestamptz default now() not null
);

create index if not exists idx_notifikasi_user_created_at on public.notifikasi (user_id, created_at desc);

-- Prevent duplicate notifications for same dedupe_key per user
create unique index if not exists ux_notifikasi_user_dedupe on public.notifikasi (user_id, dedupe_key) where dedupe_key is not null;

-- Row Level Security: only allow users to access their own notifications
alter table public.notifikasi enable row level security;

create policy "notifikasi_select_insert_update" on public.notifikasi
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);


-- Table: notification_tokens
create table if not exists public.notification_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    token text not null,
    platform text,
    is_active boolean default true not null,
    last_seen timestamptz,
    created_at timestamptz default now() not null
);

create unique index if not exists ux_notification_tokens_user_token on public.notification_tokens (user_id, token);
create index if not exists idx_notification_tokens_user on public.notification_tokens (user_id);

alter table public.notification_tokens enable row level security;

create policy "notification_tokens_manage_own" on public.notification_tokens
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Notes:
-- 1) Service/backend should use the Supabase service_role key when sending FCM and when performing cross-user operations.
-- 2) Keep server credentials (Firebase server key, Supabase service role) out of frontend code.
