create table if not exists public.catalog_feeds (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null,
    feed_token text not null unique,
    status text default 'active',
    last_accessed_at timestamp,
    created_at timestamp default now(),
    updated_at timestamp default now()
);

alter table public.catalog_feeds
    add column if not exists feed_token text,
    add column if not exists status text default 'active',
    add column if not exists last_accessed_at timestamp,
    add column if not exists updated_at timestamp default now();

alter table public.catalog_feeds drop constraint if exists catalog_feeds_status_check;
alter table public.catalog_feeds
    add constraint catalog_feeds_status_check
    check (status in ('active', 'paused', 'revoked'));

create unique index if not exists idx_catalog_feeds_client_id on public.catalog_feeds(client_id);
create unique index if not exists idx_catalog_feeds_feed_token on public.catalog_feeds(feed_token);

alter table public.catalog_feeds enable row level security;

drop policy if exists "Clients read own catalog feeds" on public.catalog_feeds;
create policy "Clients read own catalog feeds"
on public.catalog_feeds
for select
using (auth.uid() = client_id);

drop policy if exists "Clients insert own catalog feeds" on public.catalog_feeds;
create policy "Clients insert own catalog feeds"
on public.catalog_feeds
for insert
with check (auth.uid() = client_id);

drop policy if exists "Clients update own catalog feeds" on public.catalog_feeds;
create policy "Clients update own catalog feeds"
on public.catalog_feeds
for update
using (auth.uid() = client_id)
with check (auth.uid() = client_id);
