create table if not exists public.reels (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null,
    product_ids jsonb default '[]'::jsonb,
    selected_image_urls jsonb default '[]'::jsonb,
    basic_video_url text,
    enhanced_video_url text,
    template_name text,
    hook_text text,
    cta_text text,
    music_style text default 'soft',
    status text default 'draft',
    error_message text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamp default now(),
    updated_at timestamp default now()
);

alter table public.reels
    add column if not exists product_ids jsonb default '[]'::jsonb,
    add column if not exists selected_image_urls jsonb default '[]'::jsonb,
    add column if not exists basic_video_url text,
    add column if not exists enhanced_video_url text,
    add column if not exists template_name text,
    add column if not exists hook_text text,
    add column if not exists cta_text text,
    add column if not exists music_style text default 'soft',
    add column if not exists status text default 'draft',
    add column if not exists error_message text,
    add column if not exists metadata jsonb default '{}'::jsonb,
    add column if not exists updated_at timestamp default now();

alter table public.reels drop constraint if exists reels_status_check;
alter table public.reels add constraint reels_status_check
    check (status in ('draft', 'basic_generated', 'enhancing', 'enhanced', 'failed'));

create index if not exists idx_reels_client_id on public.reels(client_id);
create index if not exists idx_reels_status on public.reels(status);
create index if not exists idx_reels_updated_at on public.reels(updated_at desc);

create table if not exists public.reel_usage (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null,
    month text not null,
    basic_reels_count integer default 0,
    enhanced_reels_count integer default 0,
    created_at timestamp default now(),
    updated_at timestamp default now(),
    unique (client_id, month)
);

alter table public.reel_usage
    add column if not exists month text,
    add column if not exists basic_reels_count integer default 0,
    add column if not exists enhanced_reels_count integer default 0,
    add column if not exists updated_at timestamp default now();

create index if not exists idx_reel_usage_client_month on public.reel_usage(client_id, month);

alter table public.social_exports drop constraint if exists social_exports_channel_check;
alter table public.social_exports
    add constraint social_exports_channel_check
    check (channel in ('facebook_page', 'instagram', 'whatsapp_catalog', 'instagram_reel', 'facebook_reel', 'whatsapp_status'));

alter table public.social_exports drop constraint if exists social_exports_content_type_check;
alter table public.social_exports
    add constraint social_exports_content_type_check
    check (content_type in ('product', 'reel'));

alter table public.reels enable row level security;
alter table public.reel_usage enable row level security;

drop policy if exists "Clients manage own reels" on public.reels;
create policy "Clients manage own reels"
on public.reels
for all
using (auth.uid() = client_id)
with check (auth.uid() = client_id);

drop policy if exists "Clients read own reel usage" on public.reel_usage;
create policy "Clients read own reel usage"
on public.reel_usage
for select
using (auth.uid() = client_id);

drop policy if exists "Clients insert own reel usage" on public.reel_usage;
create policy "Clients insert own reel usage"
on public.reel_usage
for insert
with check (auth.uid() = client_id);

drop policy if exists "Clients update own reel usage" on public.reel_usage;
create policy "Clients update own reel usage"
on public.reel_usage
for update
using (auth.uid() = client_id)
with check (auth.uid() = client_id);
