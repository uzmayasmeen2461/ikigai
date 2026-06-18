-- ORVA Facebook Page single-product export tracking
-- Run in Supabase SQL Editor. Tokens remain in social_connections and are never browser-readable.

create extension if not exists pgcrypto;

create table if not exists public.social_exports (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    product_id uuid not null references public.products(id) on delete cascade,
    channel text not null,
    status text not null default 'draft' check (status in ('draft', 'published', 'failed')),
    external_post_id text,
    error_message text,
    created_at timestamptz default now()
);

alter table public.social_exports drop constraint if exists social_exports_channel_check;
alter table public.social_exports add constraint social_exports_channel_check
    check (channel in ('facebook', 'facebook_page', 'instagram', 'whatsapp', 'whatsapp_catalog', 'instagram_reel', 'facebook_reel', 'whatsapp_status'));

create index if not exists social_exports_user_id_idx on public.social_exports(user_id);
create index if not exists social_exports_product_id_idx on public.social_exports(product_id);

alter table public.social_exports alter column product_id drop not null;

alter table public.social_exports enable row level security;

-- Publishing routes use SUPABASE_SERVICE_ROLE_KEY. Browser clients cannot access export records directly.
drop policy if exists "Clients manage own social exports" on public.social_exports;
drop policy if exists "Clients read own social exports" on public.social_exports;
drop policy if exists "Clients insert own social exports" on public.social_exports;
drop policy if exists "Clients update own social exports" on public.social_exports;
drop policy if exists "Clients delete own social exports" on public.social_exports;
