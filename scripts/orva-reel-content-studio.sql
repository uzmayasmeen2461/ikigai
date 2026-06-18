-- ORVA Reel Content Studio
-- Run this in Supabase SQL editor before testing Reel uploads/publishing.

alter table public.products
    add column if not exists reel_video_url text,
    add column if not exists reel_thumbnail_url text,
    add column if not exists reel_hook text,
    add column if not exists reel_caption text,
    add column if not exists reel_hashtags text,
    add column if not exists reel_cta text,
    add column if not exists reel_status text default 'not_created';

create table if not exists public.social_exports (
    id uuid primary key default gen_random_uuid(),
    user_id uuid,
    client_id uuid,
    product_id uuid,
    channel text not null,
    content_type text default 'post',
    status text default 'draft',
    external_post_id text,
    error_message text,
    created_at timestamp with time zone default now()
);

alter table public.social_exports
    add column if not exists user_id uuid,
    add column if not exists client_id uuid,
    add column if not exists product_id uuid,
    add column if not exists channel text,
    add column if not exists content_type text default 'post',
    add column if not exists status text default 'draft',
    add column if not exists external_post_id text,
    add column if not exists error_message text,
    add column if not exists created_at timestamp with time zone default now();

alter table public.social_exports alter column product_id drop not null;

create index if not exists idx_social_exports_client_id on public.social_exports(client_id);
create index if not exists idx_social_exports_product_id on public.social_exports(product_id);
create index if not exists idx_social_exports_channel on public.social_exports(channel);
create index if not exists idx_social_exports_created_at on public.social_exports(created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'product-videos',
    'product-videos',
    true,
    209715200,
    array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
set
    public = true,
    file_size_limit = 209715200,
    allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm'];

alter table public.social_exports drop constraint if exists social_exports_channel_check;
alter table public.social_exports
    add constraint social_exports_channel_check
    check (channel in ('facebook', 'facebook_page', 'instagram', 'whatsapp', 'whatsapp_catalog', 'instagram_reel', 'facebook_reel', 'whatsapp_status'));

alter table public.social_exports drop constraint if exists social_exports_content_type_check;
alter table public.social_exports
    add constraint social_exports_content_type_check
    check (content_type in ('post', 'catalog', 'reel', 'status'));

alter table public.social_exports drop constraint if exists social_exports_status_check;
alter table public.social_exports
    add constraint social_exports_status_check
    check (status in ('draft', 'published', 'failed'));
