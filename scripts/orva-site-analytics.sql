create table if not exists public.site_visits (
    id uuid primary key default gen_random_uuid(),
    session_id text,
    user_id uuid,
    path text not null,
    title text,
    referrer text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    device_type text,
    browser text,
    user_agent text,
    ip_hash text,
    visited_at timestamptz default now(),
    created_at timestamptz default now()
);

create index if not exists site_visits_visited_at_idx on public.site_visits(visited_at desc);
create index if not exists site_visits_path_idx on public.site_visits(path);
create index if not exists site_visits_session_idx on public.site_visits(session_id);

alter table public.site_visits enable row level security;

drop policy if exists "Service role can manage site visits" on public.site_visits;
create policy "Service role can manage site visits"
on public.site_visits
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
