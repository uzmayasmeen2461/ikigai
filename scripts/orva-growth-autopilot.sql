create table if not exists public.growth_autopilot_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    product_id uuid,
    channel text not null default 'instagram',
    content_type text not null default 'post',
    title text not null,
    template_name text,
    caption text,
    hashtags text,
    offer_text text,
    scheduled_for timestamptz,
    status text not null default 'draft',
    approval_required boolean not null default true,
    approved_at timestamptz,
    published_at timestamptz,
    external_post_id text,
    error_message text,
    product_snapshot jsonb default '{}'::jsonb,
    campaign_type text not null default 'weekly',
    schedule_frequency text not null default 'weekly',
    posting_mode text not null default 'approval_first',
    automation_paused boolean not null default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.growth_autopilot_items
    add column if not exists product_id uuid,
    add column if not exists content_type text not null default 'post',
    add column if not exists template_name text,
    add column if not exists caption text,
    add column if not exists hashtags text,
    add column if not exists offer_text text,
    add column if not exists scheduled_for timestamptz,
    add column if not exists approval_required boolean not null default true,
    add column if not exists approved_at timestamptz,
    add column if not exists published_at timestamptz,
    add column if not exists external_post_id text,
    add column if not exists error_message text,
    add column if not exists product_snapshot jsonb default '{}'::jsonb,
    add column if not exists campaign_type text not null default 'weekly',
    add column if not exists schedule_frequency text not null default 'weekly',
    add column if not exists posting_mode text not null default 'approval_first',
    add column if not exists automation_paused boolean not null default false,
    add column if not exists updated_at timestamptz default now();

alter table public.growth_autopilot_items drop constraint if exists growth_autopilot_items_channel_check;
alter table public.growth_autopilot_items add constraint growth_autopilot_items_channel_check
    check (channel in ('instagram', 'facebook_page', 'whatsapp_catalog', 'whatsapp_message'));

alter table public.growth_autopilot_items drop constraint if exists growth_autopilot_items_content_type_check;
alter table public.growth_autopilot_items add constraint growth_autopilot_items_content_type_check
    check (content_type in ('post', 'reel', 'catalog', 'message', 'ad_draft'));

alter table public.growth_autopilot_items drop constraint if exists growth_autopilot_items_status_check;
alter table public.growth_autopilot_items add constraint growth_autopilot_items_status_check
    check (status in ('draft', 'scheduled', 'approved', 'published', 'failed', 'cancelled'));

alter table public.growth_autopilot_items drop constraint if exists growth_autopilot_items_campaign_type_check;
alter table public.growth_autopilot_items add constraint growth_autopilot_items_campaign_type_check
    check (campaign_type in ('weekly', 'hourly_campaign'));

alter table public.growth_autopilot_items drop constraint if exists growth_autopilot_items_schedule_frequency_check;
alter table public.growth_autopilot_items add constraint growth_autopilot_items_schedule_frequency_check
    check (schedule_frequency in ('weekly', 'hourly'));

alter table public.growth_autopilot_items drop constraint if exists growth_autopilot_items_posting_mode_check;
alter table public.growth_autopilot_items add constraint growth_autopilot_items_posting_mode_check
    check (posting_mode in ('approval_first', 'auto_post'));

create index if not exists growth_autopilot_items_user_id_idx
    on public.growth_autopilot_items(user_id);

create index if not exists growth_autopilot_items_status_idx
    on public.growth_autopilot_items(status);

create index if not exists growth_autopilot_items_scheduled_for_idx
    on public.growth_autopilot_items(scheduled_for);

create index if not exists growth_autopilot_items_auto_due_idx
    on public.growth_autopilot_items(posting_mode, automation_paused, status, scheduled_for);

create or replace function public.set_growth_autopilot_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists growth_autopilot_items_updated_at on public.growth_autopilot_items;
create trigger growth_autopilot_items_updated_at
before update on public.growth_autopilot_items
for each row
execute function public.set_growth_autopilot_updated_at();

alter table public.growth_autopilot_items enable row level security;

drop policy if exists "Clients can read own growth autopilot" on public.growth_autopilot_items;
create policy "Clients can read own growth autopilot"
on public.growth_autopilot_items
for select
using (auth.uid() = user_id);

drop policy if exists "Clients can create own growth autopilot" on public.growth_autopilot_items;
create policy "Clients can create own growth autopilot"
on public.growth_autopilot_items
for insert
with check (auth.uid() = user_id);

drop policy if exists "Clients can update own growth autopilot" on public.growth_autopilot_items;
create policy "Clients can update own growth autopilot"
on public.growth_autopilot_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
