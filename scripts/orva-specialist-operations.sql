-- ORVA specialist operations workflow.
-- Run this in Supabase SQL Editor to enable admin-created setup tasks,
-- specialist progress updates, manual payout tracking, and payment confirmation.

create extension if not exists pgcrypto;

alter table public.users
    add column if not exists availability text default 'available',
    add column if not exists upi_id text;

create table if not exists public.update_tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid,
    product_id uuid,
    channel text not null default 'online_store',
    task_type text not null default 'product_update',
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

alter table public.update_tasks
    add column if not exists client_name text,
    add column if not exists client_business_name text,
    add column if not exists client_email text,
    add column if not exists client_phone text,
    add column if not exists instructions text,
    add column if not exists specialist_notes text,
    add column if not exists admin_notes text,
    add column if not exists assigned_at timestamptz,
    add column if not exists started_at timestamptz,
    add column if not exists payout_amount integer default 0,
    add column if not exists payout_status text default 'not_generated',
    add column if not exists payout_reference text,
    add column if not exists payout_generated_at timestamptz,
    add column if not exists payout_paid_at timestamptz,
    add column if not exists payout_confirmed_at timestamptz,
    add column if not exists payout_confirmed_by uuid;

drop trigger if exists assign_orva_update_task on public.update_tasks;
drop function if exists public.assign_orva_update_task();

alter table public.update_tasks drop constraint if exists update_tasks_channel_check;
alter table public.update_tasks add constraint update_tasks_channel_check
    check (channel in ('whatsapp_catalog', 'instagram', 'facebook_page', 'online_store', 'whatsapp_business', 'facebook_setup', 'instagram_setup', 'general_setup'));

alter table public.update_tasks drop constraint if exists update_tasks_type_check;
alter table public.update_tasks add constraint update_tasks_type_check
    check (task_type in ('stock_update', 'price_update', 'product_update', 'new_product_upload', 'out_of_stock_update', 'back_in_stock_update', 'social_post_required', 'create_facebook_page', 'create_instagram_page', 'setup_whatsapp_business', 'catalog_setup', 'account_setup', 'manual_client_support'));

alter table public.update_tasks drop constraint if exists update_tasks_status_check;
alter table public.update_tasks add constraint update_tasks_status_check
    check (status in ('pending', 'assigned', 'started', 'in_progress', 'completed', 'payout_generated', 'payout_paid', 'payment_confirmed', 'closed', 'failed', 'cancelled'));

alter table public.update_tasks drop constraint if exists update_tasks_priority_check;
alter table public.update_tasks add constraint update_tasks_priority_check
    check (priority in ('low', 'medium', 'high', 'urgent'));

alter table public.update_tasks drop constraint if exists update_tasks_payout_status_check;
alter table public.update_tasks add constraint update_tasks_payout_status_check
    check (payout_status in ('not_generated', 'pending_admin_payment', 'paid_by_admin', 'confirmed_by_worker'));

create table if not exists public.task_activity_logs (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null,
    actor_id uuid,
    actor_role text,
    action text not null,
    from_status text,
    to_status text,
    note text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'task_activity_logs_task_id_fkey') then
        alter table public.task_activity_logs
            add constraint task_activity_logs_task_id_fkey
            foreign key (task_id) references public.update_tasks(id) on delete cascade;
    end if;
end $$;

create table if not exists public.partner_payouts (
    id uuid primary key default gen_random_uuid(),
    task_id text not null,
    partner_id uuid,
    payout_amount integer default 0,
    platform_margin integer default 0,
    payout_method text default 'upi',
    payout_reference text,
    status text default 'pending',
    approved_at timestamptz,
    paid_at timestamptz,
    confirmed_at timestamptz,
    confirmed_by uuid,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.partner_payouts
    add column if not exists payout_method text default 'upi',
    add column if not exists payout_reference text,
    add column if not exists confirmed_at timestamptz,
    add column if not exists confirmed_by uuid,
    add column if not exists updated_at timestamptz default now();

create index if not exists update_tasks_user_id_idx on public.update_tasks(user_id);
create index if not exists update_tasks_assigned_to_idx on public.update_tasks(assigned_to);
create index if not exists update_tasks_status_idx on public.update_tasks(status);
create index if not exists update_tasks_payout_status_idx on public.update_tasks(payout_status);
create index if not exists task_activity_logs_task_id_idx on public.task_activity_logs(task_id);
create index if not exists partner_payouts_task_id_idx on public.partner_payouts(task_id);
create index if not exists partner_payouts_partner_id_idx on public.partner_payouts(partner_id);

alter table public.update_tasks enable row level security;
alter table public.task_activity_logs enable row level security;
alter table public.partner_payouts enable row level security;

drop policy if exists "Clients read own update tasks" on public.update_tasks;
create policy "Clients read own update tasks"
on public.update_tasks for select to authenticated
using (user_id = auth.uid() or assigned_to = auth.uid() or exists (select 1 from public.users where users.id = auth.uid() and lower(users.role) = 'admin'));

drop policy if exists "Owners and specialists update tasks" on public.update_tasks;
create policy "Owners and specialists update tasks"
on public.update_tasks for update to authenticated
using (user_id = auth.uid() or assigned_to = auth.uid() or exists (select 1 from public.users where users.id = auth.uid() and lower(users.role) = 'admin'))
with check (user_id = auth.uid() or assigned_to = auth.uid() or exists (select 1 from public.users where users.id = auth.uid() and lower(users.role) = 'admin'));

drop policy if exists "Admins create update tasks" on public.update_tasks;
drop policy if exists "Clients create own update tasks" on public.update_tasks;
create policy "Clients create own update tasks"
on public.update_tasks for insert to authenticated
with check (user_id = auth.uid());

create policy "Admins create update tasks"
on public.update_tasks for insert to authenticated
with check (exists (select 1 from public.users where users.id = auth.uid() and lower(users.role) = 'admin'));

drop policy if exists "Users read visible task logs" on public.task_activity_logs;
create policy "Users read visible task logs"
on public.task_activity_logs for select to authenticated
using (
    exists (
        select 1 from public.update_tasks
        where update_tasks.id = task_activity_logs.task_id
          and (update_tasks.user_id = auth.uid() or update_tasks.assigned_to = auth.uid() or exists (select 1 from public.users where users.id = auth.uid() and lower(users.role) = 'admin'))
    )
);

drop policy if exists "Admins manage payout records" on public.partner_payouts;
create policy "Admins manage payout records"
on public.partner_payouts for all to authenticated
using (exists (select 1 from public.users where users.id = auth.uid() and lower(users.role) = 'admin') or partner_id = auth.uid())
with check (exists (select 1 from public.users where users.id = auth.uid() and lower(users.role) = 'admin') or partner_id = auth.uid());
