-- ORVA hybrid inventory-to-digital-presence workflow
-- Run once in Supabase SQL Editor after scripts/orva-social-commerce-mvp.sql.

create extension if not exists pgcrypto;

alter table public.users
    add column if not exists availability text default 'available';

create table if not exists public.update_tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    product_id uuid,
    channel text not null,
    task_type text not null,
    title text not null,
    description text,
    old_value jsonb,
    new_value jsonb,
    status text not null default 'pending',
    priority text not null default 'medium',
    assigned_to uuid,
    completed_by uuid,
    completion_note text,
    completed_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.product_change_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    product_id uuid not null,
    field_name text not null,
    old_value text,
    new_value text,
    created_at timestamptz default now()
);

alter table public.update_tasks
    add column if not exists completion_note text;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'update_tasks_product_id_fkey') then
        alter table public.update_tasks
            add constraint update_tasks_product_id_fkey
            foreign key (product_id) references public.products(id) on delete cascade;
    end if;

    if not exists (select 1 from pg_constraint where conname = 'product_change_logs_product_id_fkey') then
        alter table public.product_change_logs
            add constraint product_change_logs_product_id_fkey
            foreign key (product_id) references public.products(id) on delete cascade;
    end if;
end $$;

alter table public.update_tasks drop constraint if exists update_tasks_channel_check;
alter table public.update_tasks add constraint update_tasks_channel_check
    check (channel in ('whatsapp_catalog', 'instagram', 'facebook_page', 'online_store'));

alter table public.update_tasks drop constraint if exists update_tasks_type_check;
alter table public.update_tasks add constraint update_tasks_type_check
    check (task_type in ('stock_update', 'price_update', 'product_update', 'new_product_upload', 'out_of_stock_update', 'back_in_stock_update', 'social_post_required'));

alter table public.update_tasks drop constraint if exists update_tasks_status_check;
alter table public.update_tasks add constraint update_tasks_status_check
    check (status in ('pending', 'in_progress', 'completed', 'failed', 'cancelled'));

alter table public.update_tasks drop constraint if exists update_tasks_priority_check;
alter table public.update_tasks add constraint update_tasks_priority_check
    check (priority in ('low', 'medium', 'high'));

create index if not exists update_tasks_user_id_idx on public.update_tasks(user_id);
create index if not exists update_tasks_product_id_idx on public.update_tasks(product_id);
create index if not exists update_tasks_assigned_to_idx on public.update_tasks(assigned_to);
create index if not exists update_tasks_status_idx on public.update_tasks(status);
create index if not exists product_change_logs_product_id_idx on public.product_change_logs(product_id);

alter table public.update_tasks enable row level security;
alter table public.product_change_logs enable row level security;

create or replace function public.assign_orva_update_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.assigned_to is null then
        select users.id into new.assigned_to
        from public.users
        left join public.update_tasks existing
            on existing.assigned_to = users.id
            and existing.status in ('pending', 'in_progress')
        where lower(users.role) in ('worker', 'partner')
          and coalesce(users.availability, 'available') = 'available'
        group by users.id
        order by count(existing.id) asc, min(existing.created_at) nulls first
        limit 1;
    end if;
    return new;
end;
$$;

drop trigger if exists assign_orva_update_task on public.update_tasks;
create trigger assign_orva_update_task
before insert on public.update_tasks
for each row execute function public.assign_orva_update_task();

drop policy if exists "Clients read own update tasks" on public.update_tasks;
create policy "Clients read own update tasks"
on public.update_tasks for select to authenticated
using (user_id = auth.uid() or assigned_to = auth.uid());

drop policy if exists "Clients create own update tasks" on public.update_tasks;
create policy "Clients create own update tasks"
on public.update_tasks for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Owners and specialists update tasks" on public.update_tasks;
create policy "Owners and specialists update tasks"
on public.update_tasks for update to authenticated
using (user_id = auth.uid() or assigned_to = auth.uid())
with check (user_id = auth.uid() or assigned_to = auth.uid());

drop policy if exists "Admins manage update tasks" on public.update_tasks;
create policy "Admins manage update tasks"
on public.update_tasks for all to authenticated
using (exists (select 1 from public.users where users.id = auth.uid() and lower(users.role) = 'admin'))
with check (exists (select 1 from public.users where users.id = auth.uid() and lower(users.role) = 'admin'));

drop policy if exists "Specialists read products for assigned update tasks" on public.products;
create policy "Specialists read products for assigned update tasks"
on public.products for select to authenticated
using (
    exists (
        select 1 from public.update_tasks
        where update_tasks.product_id = products.id
          and update_tasks.assigned_to = auth.uid()
    )
);

drop policy if exists "Clients read own product change logs" on public.product_change_logs;
create policy "Clients read own product change logs"
on public.product_change_logs for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Clients create own product change logs" on public.product_change_logs;
create policy "Clients create own product change logs"
on public.product_change_logs for insert to authenticated
with check (user_id = auth.uid());
