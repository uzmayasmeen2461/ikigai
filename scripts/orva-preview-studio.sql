-- ORVA Preview Studio
-- Run once in Supabase SQL Editor after scripts/orva-social-commerce-mvp.sql.

create extension if not exists pgcrypto;

create table if not exists public.catalog_previews (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique,
    business_slug text not null unique,
    business_name text not null default 'My ORVA Store',
    tagline text,
    whatsapp_number text,
    accent_color text not null default '#1B4FD8',
    is_public boolean not null default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.catalog_previews enable row level security;

drop policy if exists "Clients manage own catalog preview" on public.catalog_previews;
create policy "Clients manage own catalog preview"
on public.catalog_previews for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.get_public_catalog_preview(preview_slug text)
returns jsonb
language sql
security definer
set search_path = public
as $$
    select jsonb_build_object(
        'business_slug', preview.business_slug,
        'business_name', preview.business_name,
        'tagline', preview.tagline,
        'whatsapp_number', preview.whatsapp_number,
        'accent_color', preview.accent_color,
        'products', coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id', products.id,
                    'name', coalesce(products.name, products.product_name),
                    'sku', coalesce(products.sku, products.product_code),
                    'category', products.category,
                    'price', products.price,
                    'stock', products.stock,
                    'status', products.status,
                    'description', coalesce(products.description, products.notes),
                    'image_url', coalesce(products.cleaned_image_url, products.image_url)
                )
                order by products.updated_at desc
            ) filter (where products.id is not null),
            '[]'::jsonb
        )
    )
    from public.catalog_previews as preview
    left join public.products as products
        on products.user_id = preview.user_id
        and products.status <> 'hidden'
    where preview.business_slug = preview_slug
      and preview.is_public = true
    group by preview.id;
$$;

revoke all on function public.get_public_catalog_preview(text) from public;
grant execute on function public.get_public_catalog_preview(text) to anon, authenticated;
