-- ORVA inventory-to-social-commerce MVP
-- Run once in Supabase SQL Editor after the existing ORVA inventory migration.

create extension if not exists pgcrypto;

alter table public.products
    add column if not exists user_id uuid,
    add column if not exists name text,
    add column if not exists sku text,
    add column if not exists description text;

update public.products
set
    user_id = coalesce(user_id, client_id),
    client_id = coalesce(client_id, user_id),
    name = coalesce(name, product_name, 'Product'),
    product_name = coalesce(product_name, name, 'Product'),
    sku = coalesce(sku, product_code),
    product_code = coalesce(product_code, sku),
    description = coalesce(description, notes),
    notes = coalesce(notes, description);

create or replace function public.sync_orva_product_compatibility_fields()
returns trigger
language plpgsql
as $$
begin
    new.user_id := coalesce(new.user_id, new.client_id);
    new.client_id := coalesce(new.client_id, new.user_id);
    new.name := coalesce(new.name, new.product_name, 'Product');
    new.product_name := coalesce(new.product_name, new.name, 'Product');
    new.sku := coalesce(new.sku, new.product_code);
    new.product_code := coalesce(new.product_code, new.sku);
    new.description := coalesce(new.description, new.notes);
    new.notes := coalesce(new.notes, new.description);
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists sync_orva_product_compatibility_fields on public.products;
create trigger sync_orva_product_compatibility_fields
before insert or update on public.products
for each row execute function public.sync_orva_product_compatibility_fields();

create table if not exists public.channel_connections (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    channel text not null,
    status text not null default 'not_connected',
    external_account_name text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (user_id, channel)
);

create table if not exists public.sync_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    product_id uuid,
    channel text not null,
    status text not null default 'pending',
    external_id text,
    error_message text,
    last_synced_at timestamptz,
    created_at timestamptz default now()
);

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'sync_logs_product_id_fkey'
    ) then
        alter table public.sync_logs
            add constraint sync_logs_product_id_fkey
            foreign key (product_id) references public.products(id) on delete set null;
    end if;
end $$;

create index if not exists products_user_id_idx on public.products(user_id);
create index if not exists channel_connections_user_id_idx on public.channel_connections(user_id);
create index if not exists sync_logs_user_id_idx on public.sync_logs(user_id);
create index if not exists sync_logs_product_id_idx on public.sync_logs(product_id);

alter table public.products enable row level security;
alter table public.channel_connections enable row level security;
alter table public.sync_logs enable row level security;

drop policy if exists "MVP clients can read own products" on public.products;
create policy "MVP clients can read own products"
on public.products for select to authenticated
using (user_id = auth.uid());

drop policy if exists "MVP clients can insert own products" on public.products;
create policy "MVP clients can insert own products"
on public.products for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "MVP clients can update own products" on public.products;
create policy "MVP clients can update own products"
on public.products for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "MVP clients can delete own products" on public.products;
create policy "MVP clients can delete own products"
on public.products for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Clients manage own channel connections" on public.channel_connections;
create policy "Clients manage own channel connections"
on public.channel_connections for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Clients manage own sync logs" on public.sync_logs;
create policy "Clients manage own sync logs"
on public.sync_logs for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

