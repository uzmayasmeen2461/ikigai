-- ORVA Inventory Intelligence
-- Run this in Supabase SQL editor.

alter table public.products
    add column if not exists stock_quantity integer,
    add column if not exists low_stock_threshold integer default 5,
    add column if not exists last_promoted_at timestamp with time zone,
    add column if not exists promotion_count integer default 0,
    add column if not exists last_updated_at timestamp with time zone,
    add column if not exists is_active boolean default true,
    add column if not exists intelligence_score integer,
    add column if not exists intelligence_reason text;

create table if not exists public.inventory_recommendations (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null,
    product_id uuid references public.products(id) on delete cascade,
    recommendation_type text not null check (recommendation_type in (
        'low_stock',
        'not_promoted',
        'missing_image',
        'missing_description',
        'ready_to_promote',
        'dead_stock',
        'price_missing'
    )),
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
    title text not null,
    description text,
    action_label text,
    status text not null default 'open' check (status in ('open', 'dismissed', 'completed')),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create unique index if not exists inventory_recommendations_unique_open
    on public.inventory_recommendations (client_id, product_id, recommendation_type)
    where status = 'open';

create or replace function public.set_inventory_recommendations_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists inventory_recommendations_updated_at on public.inventory_recommendations;
create trigger inventory_recommendations_updated_at
before update on public.inventory_recommendations
for each row execute function public.set_inventory_recommendations_updated_at();

alter table public.inventory_recommendations enable row level security;

drop policy if exists "Clients can read own inventory recommendations" on public.inventory_recommendations;
create policy "Clients can read own inventory recommendations"
on public.inventory_recommendations for select
using (auth.uid() = client_id);

drop policy if exists "Clients can update own inventory recommendations" on public.inventory_recommendations;
create policy "Clients can update own inventory recommendations"
on public.inventory_recommendations for update
using (auth.uid() = client_id)
with check (auth.uid() = client_id);

drop policy if exists "Clients can insert own inventory recommendations" on public.inventory_recommendations;
create policy "Clients can insert own inventory recommendations"
on public.inventory_recommendations for insert
with check (auth.uid() = client_id);
