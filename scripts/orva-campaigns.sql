create table if not exists public.campaigns (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null,
    name text not null,
    campaign_type text not null default 'weekly',
    goal text not null default 'mixed',
    status text not null default 'draft',
    start_date date,
    end_date date,
    posting_window_start text default '10:00',
    posting_window_end text default '20:00',
    approval_mode text not null default 'ask_before_posting',
    selected_platforms jsonb default '[]'::jsonb,
    settings jsonb default '{}'::jsonb,
    health_score integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.campaign_items (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references public.campaigns(id) on delete cascade,
    client_id uuid not null,
    product_id uuid,
    content_type text not null,
    platforms jsonb default '[]'::jsonb,
    scheduled_at timestamptz,
    status text not null default 'draft',
    generated_title text,
    generated_caption text,
    generated_hashtags text,
    generated_cta text,
    media_url text,
    external_post_id text,
    error_message text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.campaign_item_logs (
    id uuid primary key default gen_random_uuid(),
    campaign_item_id uuid not null references public.campaign_items(id) on delete cascade,
    action text not null,
    actor_id uuid,
    actor_role text,
    note text,
    created_at timestamptz default now()
);

create table if not exists public.campaign_usage (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null,
    month text not null,
    campaigns_generated_count integer default 0,
    posts_generated_count integer default 0,
    posts_published_count integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(client_id, month)
);

alter table public.campaigns
    add column if not exists health_score integer default 0,
    add column if not exists updated_at timestamptz default now();

alter table public.campaign_items
    add column if not exists error_message text,
    add column if not exists updated_at timestamptz default now();

alter table public.campaigns drop constraint if exists campaigns_campaign_type_check;
alter table public.campaigns add constraint campaigns_campaign_type_check
    check (campaign_type in ('hourly', 'weekly', 'monthly'));

alter table public.campaigns drop constraint if exists campaigns_goal_check;
alter table public.campaigns add constraint campaigns_goal_check
    check (goal in ('best_sellers', 'new_arrivals', 'clear_old_stock', 'festival', 'weekend_sale', 'brand_awareness', 'mixed'));

alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns add constraint campaigns_status_check
    check (status in ('draft', 'generated', 'approved', 'scheduled', 'active', 'paused', 'completed', 'failed'));

alter table public.campaigns drop constraint if exists campaigns_approval_mode_check;
alter table public.campaigns add constraint campaigns_approval_mode_check
    check (approval_mode in ('ask_before_posting', 'auto_post_approved'));

alter table public.campaign_items drop constraint if exists campaign_items_content_type_check;
alter table public.campaign_items add constraint campaign_items_content_type_check
    check (content_type in ('instagram_post', 'instagram_story', 'instagram_reel', 'facebook_post', 'facebook_story', 'facebook_reel', 'whatsapp_catalog', 'whatsapp_status'));

alter table public.campaign_items drop constraint if exists campaign_items_status_check;
alter table public.campaign_items add constraint campaign_items_status_check
    check (status in ('draft', 'approved', 'scheduled', 'published', 'failed', 'removed'));

create index if not exists campaigns_client_id_idx on public.campaigns(client_id);
create index if not exists campaigns_status_idx on public.campaigns(status);
create index if not exists campaign_items_campaign_id_idx on public.campaign_items(campaign_id);
create index if not exists campaign_items_client_id_idx on public.campaign_items(client_id);
create index if not exists campaign_items_due_idx on public.campaign_items(status, scheduled_at);

create or replace function public.set_campaign_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists campaigns_updated_at on public.campaigns;
create trigger campaigns_updated_at
before update on public.campaigns
for each row execute function public.set_campaign_updated_at();

drop trigger if exists campaign_items_updated_at on public.campaign_items;
create trigger campaign_items_updated_at
before update on public.campaign_items
for each row execute function public.set_campaign_updated_at();

alter table public.campaigns enable row level security;
alter table public.campaign_items enable row level security;
alter table public.campaign_item_logs enable row level security;
alter table public.campaign_usage enable row level security;

drop policy if exists "Clients can read own campaigns" on public.campaigns;
create policy "Clients can read own campaigns" on public.campaigns for select using (auth.uid() = client_id);
drop policy if exists "Clients can create own campaigns" on public.campaigns;
create policy "Clients can create own campaigns" on public.campaigns for insert with check (auth.uid() = client_id);
drop policy if exists "Clients can update own campaigns" on public.campaigns;
create policy "Clients can update own campaigns" on public.campaigns for update using (auth.uid() = client_id) with check (auth.uid() = client_id);
drop policy if exists "Clients can delete own campaigns" on public.campaigns;
create policy "Clients can delete own campaigns" on public.campaigns for delete using (auth.uid() = client_id);

drop policy if exists "Clients can read own campaign items" on public.campaign_items;
create policy "Clients can read own campaign items" on public.campaign_items for select using (auth.uid() = client_id);
drop policy if exists "Clients can create own campaign items" on public.campaign_items;
create policy "Clients can create own campaign items" on public.campaign_items for insert with check (auth.uid() = client_id);
drop policy if exists "Clients can update own campaign items" on public.campaign_items;
create policy "Clients can update own campaign items" on public.campaign_items for update using (auth.uid() = client_id) with check (auth.uid() = client_id);
drop policy if exists "Clients can delete own campaign items" on public.campaign_items;
create policy "Clients can delete own campaign items" on public.campaign_items for delete using (auth.uid() = client_id);

drop policy if exists "Clients can read own campaign logs" on public.campaign_item_logs;
create policy "Clients can read own campaign logs" on public.campaign_item_logs
    for select using (
        exists (
            select 1 from public.campaign_items
            where campaign_items.id = campaign_item_logs.campaign_item_id
            and campaign_items.client_id = auth.uid()
        )
    );
drop policy if exists "Clients can delete own campaign logs" on public.campaign_item_logs;
create policy "Clients can delete own campaign logs"
    on public.campaign_item_logs for delete using (
        exists (
            select 1 from public.campaign_items
            where campaign_items.id = campaign_item_logs.campaign_item_id
            and campaign_items.client_id = auth.uid()
        )
    );

drop policy if exists "Clients can read own campaign usage" on public.campaign_usage;
create policy "Clients can read own campaign usage" on public.campaign_usage for select using (auth.uid() = client_id);
