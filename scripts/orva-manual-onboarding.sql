-- ORVA onboarding, package selection, admin approval, and subscription activation.
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  price_amount integer not null default 0,
  billing_cycle text not null default 'yearly' check (billing_cycle in ('yearly', 'monthly', 'one_time')),
  description text,
  features jsonb default '[]'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.client_applications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  business_name text,
  owner_name text,
  phone text,
  email text,
  selected_flow text not null check (selected_flow in ('inventory_ready', 'photo_to_inventory')),
  selected_package_id uuid references public.packages(id),
  wants_managed_service boolean default false,
  estimated_product_count integer,
  existing_channels jsonb default '[]'::jsonb,
  notes text,
  status text default 'submitted' check (status in ('draft', 'submitted', 'approved', 'activated', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  activated_email text,
  activated_phone text,
  package_id uuid references public.packages(id),
  application_id uuid references public.client_applications(id),
  status text default 'inactive' check (status in ('inactive', 'active', 'expired', 'cancelled')),
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

alter table public.subscriptions
add column if not exists activated_email text;

alter table public.subscriptions
add column if not exists activated_phone text;

create or replace function public.orva_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_client_applications_updated_at on public.client_applications;
create trigger set_client_applications_updated_at
before update on public.client_applications
for each row execute function public.orva_set_updated_at();

insert into public.packages (name, slug, price_amount, billing_cycle, description, features, is_active)
values
(
  'ORVA Inventory Ready',
  'inventory-ready',
  5999,
  'yearly',
  'For businesses that already have inventory list',
  '["Upload inventory list","Upload product images","AI image-to-product matching","Product list creation","Instagram post preview","WhatsApp catalog preview","Facebook/Instagram/WhatsApp export options"]'::jsonb,
  true
),
(
  'ORVA Photo-to-Inventory',
  'photo-to-inventory',
  7999,
  'yearly',
  'For businesses with only product photos and prices',
  '["Upload product photos","Add price for each image","AI-generated product title","AI-generated description","Product list creation","Instagram post preview","WhatsApp catalog preview","Facebook/Instagram/WhatsApp export options"]'::jsonb,
  true
),
(
  'Managed Social Maintenance',
  'managed-social-maintenance',
  4999,
  'monthly',
  'For clients who need worker help every month',
  '["Product updates","Catalog updates","Social media content support","Worker-assisted maintenance"]'::jsonb,
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  price_amount = excluded.price_amount,
  billing_cycle = excluded.billing_cycle,
  description = excluded.description,
  features = excluded.features,
  is_active = excluded.is_active;

create index if not exists client_applications_client_id_idx on public.client_applications(client_id);
create index if not exists client_applications_status_idx on public.client_applications(status);
create index if not exists subscriptions_client_status_idx on public.subscriptions(client_id, status);

alter table public.packages enable row level security;
alter table public.client_applications enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "Anyone can read active packages" on public.packages;
create policy "Anyone can read active packages"
on public.packages
for select
to authenticated
using (is_active = true);

drop policy if exists "Clients read own applications" on public.client_applications;
create policy "Clients read own applications"
on public.client_applications
for select
to authenticated
using (client_id = auth.uid());

drop policy if exists "Clients create own applications" on public.client_applications;
create policy "Clients create own applications"
on public.client_applications
for insert
to authenticated
with check (client_id = auth.uid());

drop policy if exists "Clients read own subscriptions" on public.subscriptions;
create policy "Clients read own subscriptions"
on public.subscriptions
for select
to authenticated
using (client_id = auth.uid());

-- Admin operations are performed through server routes using SUPABASE_SERVICE_ROLE_KEY.
