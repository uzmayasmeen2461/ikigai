-- IKIGAI payment fields for Supabase tasks table.
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
    add column if not exists paid_at timestamptz;

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
create index if not exists payments_task_id_idx on public.payments(task_id);
create index if not exists payments_razorpay_order_id_idx on public.payments(razorpay_order_id);
