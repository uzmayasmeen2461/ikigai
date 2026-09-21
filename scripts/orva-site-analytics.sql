create table if not exists public.site_visits (
    id uuid primary key default gen_random_uuid(),
    event_type text default 'page_view',
    session_id text,
    user_id uuid,
    user_email text,
    user_role text,
    path text not null,
    title text,
    referrer text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    device_type text,
    browser text,
    app_context text,
    language text,
    screen_width integer,
    screen_height integer,
    user_agent text,
    ip_hash text,
    visited_at timestamptz default now(),
    created_at timestamptz default now()
);

alter table public.site_visits add column if not exists event_type text default 'page_view';
alter table public.site_visits add column if not exists user_id uuid;
alter table public.site_visits add column if not exists user_email text;
alter table public.site_visits add column if not exists user_role text;
alter table public.site_visits add column if not exists app_context text;
alter table public.site_visits add column if not exists language text;
alter table public.site_visits add column if not exists screen_width integer;
alter table public.site_visits add column if not exists screen_height integer;

create index if not exists site_visits_visited_at_idx on public.site_visits(visited_at desc);
create index if not exists site_visits_path_idx on public.site_visits(path);
create index if not exists site_visits_session_idx on public.site_visits(session_id);
create index if not exists site_visits_user_id_idx on public.site_visits(user_id);
create index if not exists site_visits_event_type_idx on public.site_visits(event_type);

alter table public.site_visits enable row level security;

drop policy if exists "Service role can manage site visits" on public.site_visits;
create policy "Service role can manage site visits"
on public.site_visits
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
