-- ORVA real-ready social connection storage
-- Run in Supabase SQL Editor.
-- Tokens are server-only. Do not add authenticated browser policies to this table.

create extension if not exists pgcrypto;

create table if not exists public.social_connections (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    channel text not null,
    provider text not null,
    external_account_id text,
    external_account_name text,
    access_token text,
    refresh_token text,
    token_expires_at timestamptz,
    status text default 'not_connected',
    metadata jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (user_id, channel)
);

create index if not exists social_connections_user_id_idx
on public.social_connections(user_id);

alter table public.social_connections enable row level security;

-- Keep browser users locked out. Server API routes use SUPABASE_SERVICE_ROLE_KEY.
drop policy if exists "Clients manage own social connections" on public.social_connections;
drop policy if exists "Clients read own social connections" on public.social_connections;
drop policy if exists "Clients insert own social connections" on public.social_connections;
drop policy if exists "Clients update own social connections" on public.social_connections;
drop policy if exists "Clients delete own social connections" on public.social_connections;

