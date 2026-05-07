-- ikigaidigital payment fields for Supabase tasks table.
-- Run this in the Supabase SQL editor before enabling Razorpay payments.

alter table public.tasks
    add column if not exists base_amount integer,
    add column if not exists gst_percent integer default 18,
    add column if not exists gst_amount integer,
    add column if not exists platform_fee integer,
    add column if not exists total_amount integer,
    add column if not exists payment_status text default 'pending',
    add column if not exists payment_order_id text,
    add column if not exists payment_id text,
    add column if not exists invoice_number text,
    add column if not exists invoice_url text,
    add column if not exists client_email text,
    add column if not exists client_name text,
    add column if not exists client_business_name text,
    add column if not exists client_phone text,
    add column if not exists products_count integer,
    add column if not exists requirement_notes text,
    add column if not exists assets_note text,
    add column if not exists paid_at timestamptz,
    add column if not exists assigned_at timestamptz,
    add column if not exists started_at timestamptz,
    add column if not exists submitted_at timestamptz,
    add column if not exists completed_at timestamptz,
    add column if not exists due_at timestamptz,
    add column if not exists sla_status text default 'on_time',
    add column if not exists automation_status text,
    add column if not exists assignment_mode text,
    add column if not exists delivery_output text,
    add column if not exists review_checklist jsonb default '{}'::jsonb,
    add column if not exists revision_note text,
    add column if not exists revision_requested_at timestamptz,
    add column if not exists client_approved_at timestamptz,
    add column if not exists dispute_status text,
    add column if not exists admin_resolution_note text,
    add column if not exists client_complaint text;

alter table public.users
    add column if not exists availability text default 'available',
    add column if not exists skills text[] default '{}'::text[],
    add column if not exists service_skills text[] default '{}'::text[],
    add column if not exists last_assigned_at timestamptz,
    add column if not exists completion_rate numeric default 1;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'tasks_payment_status_check'
    ) then
        alter table public.tasks
            add constraint tasks_payment_status_check
            check (payment_status in ('pending', 'paid', 'failed', 'refunded'))
            not valid;
    end if;
end $$;

create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    task_id text,
    razorpay_order_id text,
    razorpay_payment_id text,
    invoice_number text,
    invoice_url text,
    base_amount integer,
    amount integer,
    gst_amount integer,
    platform_fee integer,
    total_amount integer,
    status text default 'pending',
    failure_reason text,
    created_at timestamptz default now()
);

alter table public.payments
    add column if not exists invoice_number text,
    add column if not exists invoice_url text,
    add column if not exists base_amount integer,
    add column if not exists failure_reason text;

create index if not exists tasks_payment_status_idx on public.tasks(payment_status);
create index if not exists tasks_payment_order_id_idx on public.tasks(payment_order_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_worker_id_idx on public.tasks(worker_id);
create index if not exists tasks_due_at_idx on public.tasks(due_at);
create index if not exists payments_task_id_idx on public.payments(task_id);
create index if not exists payments_razorpay_order_id_idx on public.payments(razorpay_order_id);

create table if not exists public.partner_payouts (
    id uuid primary key default gen_random_uuid(),
    task_id text not null,
    partner_id uuid,
    payout_amount integer default 0,
    platform_margin integer default 0,
    status text default 'pending',
    approved_at timestamptz,
    paid_at timestamptz,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.partner_payouts
    add column if not exists task_id text,
    add column if not exists partner_id uuid,
    add column if not exists payout_amount integer default 0,
    add column if not exists platform_margin integer default 0,
    add column if not exists status text default 'pending',
    add column if not exists approved_at timestamptz,
    add column if not exists paid_at timestamptz,
    add column if not exists notes text,
    add column if not exists updated_at timestamptz default now();

create index if not exists partner_payouts_task_id_idx on public.partner_payouts(task_id);
create index if not exists partner_payouts_partner_id_idx on public.partner_payouts(partner_id);
create index if not exists partner_payouts_status_idx on public.partner_payouts(status);

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid,
    role text,
    task_id text,
    type text default 'info',
    title text not null,
    message text,
    read_at timestamptz,
    created_at timestamptz default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_role_idx on public.notifications(role);
create index if not exists notifications_task_id_idx on public.notifications(task_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

create table if not exists public.analytics_events (
    id uuid primary key default gen_random_uuid(),
    task_id text,
    event_type text not null,
    actor_id uuid,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

create index if not exists analytics_events_type_idx on public.analytics_events(event_type);
create index if not exists analytics_events_task_id_idx on public.analytics_events(task_id);

create table if not exists public.trainings (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    category text default 'general',
    link text not null,
    created_at timestamptz default now()
);

insert into public.trainings (title, category, link)
select 'WhatsApp Catalog Setup Basics', 'whatsapp', 'https://business.whatsapp.com/products/catalog'
where not exists (
    select 1 from public.trainings where title = 'WhatsApp Catalog Setup Basics'
);

insert into public.trainings (title, category, link)
select 'Instagram Business Profile Checklist', 'instagram', 'https://business.instagram.com/getting-started'
where not exists (
    select 1 from public.trainings where title = 'Instagram Business Profile Checklist'
);
