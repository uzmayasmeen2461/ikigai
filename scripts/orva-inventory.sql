-- ORVA Inventory + Billing MVP
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null,
    product_name text not null,
    category text,
    product_code text,
    price integer,
    stock integer default 0,
    status text default 'in_stock',
    notes text,
    image_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.products
    add column if not exists client_id uuid,
    add column if not exists product_name text,
    add column if not exists category text,
    add column if not exists product_code text,
    add column if not exists price integer,
    add column if not exists stock integer default 0,
    add column if not exists status text default 'in_stock',
    add column if not exists notes text,
    add column if not exists image_url text,
    add column if not exists cleaned_image_url text,
    add column if not exists is_featured boolean default false,
    add column if not exists created_at timestamptz default now(),
    add column if not exists updated_at timestamptz default now();

do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'products' and column_name = 'name'
    ) then
        update public.products
        set product_name = coalesce(product_name, name, 'Product')
        where product_name is null;

        alter table public.products alter column name drop not null;
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'products' and column_name = 'sku'
    ) then
        update public.products
        set product_code = coalesce(product_code, sku)
        where product_code is null;
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'products' and column_name = 'stock_quantity'
    ) then
        update public.products
        set stock = coalesce(stock, stock_quantity, 0)
        where stock is null;
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'products' and column_name = 'description'
    ) then
        update public.products
        set notes = coalesce(notes, description)
        where notes is null;
    end if;
end $$;

update public.products
set product_name = coalesce(product_name, 'Product')
where product_name is null;

alter table public.products alter column product_name set not null;

create table if not exists public.inventory_logs (
    id uuid primary key default gen_random_uuid(),
    product_id uuid,
    client_id uuid,
    action text,
    old_stock integer,
    new_stock integer,
    old_price integer,
    new_price integer,
    note text,
    created_at timestamptz default now()
);

alter table public.inventory_logs
    add column if not exists product_id uuid,
    add column if not exists client_id uuid,
    add column if not exists action text,
    add column if not exists old_stock integer,
    add column if not exists new_stock integer,
    add column if not exists old_price integer,
    add column if not exists new_price integer,
    add column if not exists note text,
    add column if not exists created_at timestamptz default now();

create table if not exists public.bills (
    id uuid primary key default gen_random_uuid(),
    client_id uuid,
    customer_name text,
    customer_phone text,
    total_amount integer,
    payment_status text default 'unpaid',
    bill_number text,
    created_at timestamptz default now()
);

create table if not exists public.bill_items (
    id uuid primary key default gen_random_uuid(),
    bill_id uuid,
    product_id uuid,
    product_name text,
    quantity integer,
    price integer,
    line_total integer
);

create table if not exists public.inventory_uploads (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null,
    upload_type text,
    file_url text,
    status text default 'uploaded',
    parsed_rows jsonb,
    errors jsonb,
    created_at timestamptz default now()
);

create table if not exists public.inventory_photo_batches (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null,
    task_id uuid,
    photos jsonb,
    status text default 'pending_conversion',
    created_at timestamptz default now()
);

create table if not exists public.inventory_conversion_items (
    id uuid primary key default gen_random_uuid(),
    task_id uuid,
    client_id uuid,
    partner_id uuid,
    source_image_url text,
    cropped_image_url text,
    product_name text,
    category text,
    product_code text,
    price integer,
    stock integer,
    notes text,
    status text default 'draft',
    created_at timestamptz default now()
);

create table if not exists public.product_content_outputs (
    id uuid primary key default gen_random_uuid(),
    product_id uuid,
    client_id uuid,
    task_id uuid,
    whatsapp_title text,
    whatsapp_description text,
    instagram_caption text,
    instagram_hashtags text,
    facebook_title text,
    facebook_description text,
    facebook_category text,
    status text default 'draft',
    created_by uuid,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.product_upload_batches (
    id uuid primary key default gen_random_uuid(),
    client_id uuid,
    task_id uuid,
    upload_type text,
    inventory_file_url text,
    uploaded_images jsonb,
    matched_images jsonb,
    unmatched_images jsonb,
    status text default 'processing',
    created_at timestamptz default now()
);

alter table public.bills
    add column if not exists client_id uuid,
    add column if not exists customer_name text,
    add column if not exists customer_phone text,
    add column if not exists total_amount integer,
    add column if not exists payment_status text default 'unpaid',
    add column if not exists bill_number text,
    add column if not exists created_at timestamptz default now();

alter table public.bill_items
    add column if not exists bill_id uuid,
    add column if not exists product_id uuid,
    add column if not exists product_name text,
    add column if not exists quantity integer,
    add column if not exists price integer,
    add column if not exists line_total integer;

do $$
begin
    alter table public.products drop constraint if exists products_status_check;
    alter table public.products
        add constraint products_status_check
        check (status in ('draft', 'in_stock', 'low_stock', 'out_of_stock', 'hidden'))
        not valid;

    if not exists (
        select 1 from pg_constraint where conname = 'bills_payment_status_check'
    ) then
        alter table public.bills
            add constraint bills_payment_status_check
            check (payment_status in ('unpaid', 'paid', 'partial', 'cancelled'))
            not valid;
    end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

create index if not exists products_client_id_idx on public.products(client_id);
create index if not exists products_status_idx on public.products(status);
create index if not exists products_product_code_idx on public.products(product_code);
create index if not exists inventory_logs_product_id_idx on public.inventory_logs(product_id);
create index if not exists inventory_logs_client_id_idx on public.inventory_logs(client_id);
create index if not exists bills_client_id_idx on public.bills(client_id);
create index if not exists bills_bill_number_idx on public.bills(bill_number);
create index if not exists bill_items_bill_id_idx on public.bill_items(bill_id);
create index if not exists bill_items_product_id_idx on public.bill_items(product_id);
create index if not exists inventory_uploads_client_id_idx on public.inventory_uploads(client_id);
create index if not exists inventory_photo_batches_client_id_idx on public.inventory_photo_batches(client_id);
create index if not exists inventory_photo_batches_task_id_idx on public.inventory_photo_batches(task_id);
create index if not exists inventory_conversion_items_task_id_idx on public.inventory_conversion_items(task_id);
create index if not exists inventory_conversion_items_client_id_idx on public.inventory_conversion_items(client_id);
create index if not exists product_content_outputs_product_id_idx on public.product_content_outputs(product_id);
create index if not exists product_content_outputs_task_id_idx on public.product_content_outputs(task_id);
create index if not exists product_content_outputs_client_id_idx on public.product_content_outputs(client_id);
create index if not exists product_upload_batches_client_id_idx on public.product_upload_batches(client_id);
create index if not exists product_upload_batches_task_id_idx on public.product_upload_batches(task_id);

alter table public.tasks
    add column if not exists worker_id uuid,
    add column if not exists service_type text,
    add column if not exists payment_status text default 'pending',
    add column if not exists status text default 'pending',
    add column if not exists client_email text,
    add column if not exists client_name text,
    add column if not exists base_amount integer,
    add column if not exists gst_percent integer default 0,
    add column if not exists gst_amount integer,
    add column if not exists platform_fee integer,
    add column if not exists total_amount integer,
    add column if not exists assigned_at timestamptz,
    add column if not exists started_at timestamptz,
    add column if not exists submitted_at timestamptz,
    add column if not exists completed_at timestamptz,
    add column if not exists notes text;

alter table public.products enable row level security;
alter table public.inventory_logs enable row level security;
alter table public.bills enable row level security;
alter table public.bill_items enable row level security;
alter table public.inventory_uploads enable row level security;
alter table public.inventory_photo_batches enable row level security;
alter table public.inventory_conversion_items enable row level security;
alter table public.product_content_outputs enable row level security;
alter table public.product_upload_batches enable row level security;

do $$
begin
    if exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'tasks'
    ) then
        alter table public.tasks enable row level security;
    end if;
end $$;

drop policy if exists "Clients can read own products" on public.products;
create policy "Clients can read own products"
on public.products
for select
to authenticated
using (client_id = auth.uid());

drop policy if exists "Clients can create own inventory conversion tasks" on public.tasks;
create policy "Clients can create own inventory conversion tasks"
on public.tasks
for insert
to authenticated
with check (client_id = auth.uid());

drop policy if exists "Clients can read own tasks" on public.tasks;
create policy "Clients can read own tasks"
on public.tasks
for select
to authenticated
using (client_id = auth.uid());

drop policy if exists "Partners can read assigned tasks" on public.tasks;
create policy "Partners can read assigned tasks"
on public.tasks
for select
to authenticated
using (worker_id = auth.uid());

drop policy if exists "Partners can update assigned paid inventory conversion tasks" on public.tasks;
create policy "Partners can update assigned paid inventory conversion tasks"
on public.tasks
for update
to authenticated
using (
    worker_id = auth.uid()
    and payment_status = 'paid'
    and service_type = 'inventory_photo_conversion'
)
with check (
    worker_id = auth.uid()
    and payment_status = 'paid'
    and service_type = 'inventory_photo_conversion'
);

drop policy if exists "Admins can manage all tasks" on public.tasks;
create policy "Admins can manage all tasks"
on public.tasks
for all
to authenticated
using (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
)
with check (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
);

drop policy if exists "Clients can insert own products" on public.products;
create policy "Clients can insert own products"
on public.products
for insert
to authenticated
with check (client_id = auth.uid());

drop policy if exists "Clients can update own products" on public.products;
create policy "Clients can update own products"
on public.products
for update
to authenticated
using (client_id = auth.uid())
with check (client_id = auth.uid());

drop policy if exists "Clients can delete own products" on public.products;
create policy "Clients can delete own products"
on public.products
for delete
to authenticated
using (client_id = auth.uid());

drop policy if exists "Clients can read own inventory logs" on public.inventory_logs;
create policy "Clients can read own inventory logs"
on public.inventory_logs
for select
to authenticated
using (client_id = auth.uid());

drop policy if exists "Clients can insert own inventory logs" on public.inventory_logs;
create policy "Clients can insert own inventory logs"
on public.inventory_logs
for insert
to authenticated
with check (client_id = auth.uid());

drop policy if exists "Clients can read own bills" on public.bills;
create policy "Clients can read own bills"
on public.bills
for select
to authenticated
using (client_id = auth.uid());

drop policy if exists "Clients can insert own bills" on public.bills;
create policy "Clients can insert own bills"
on public.bills
for insert
to authenticated
with check (client_id = auth.uid());

drop policy if exists "Clients can read own bill items" on public.bill_items;
create policy "Clients can read own bill items"
on public.bill_items
for select
to authenticated
using (
    exists (
        select 1
        from public.bills
        where bills.id = bill_items.bill_id
        and bills.client_id = auth.uid()
    )
);

drop policy if exists "Clients can insert own bill items" on public.bill_items;
create policy "Clients can insert own bill items"
on public.bill_items
for insert
to authenticated
with check (
    exists (
        select 1
        from public.bills
        where bills.id = bill_items.bill_id
        and bills.client_id = auth.uid()
    )
);

drop policy if exists "Clients can manage own inventory uploads" on public.inventory_uploads;
create policy "Clients can manage own inventory uploads"
on public.inventory_uploads
for all
to authenticated
using (client_id = auth.uid())
with check (client_id = auth.uid());

drop policy if exists "Clients can manage own photo batches" on public.inventory_photo_batches;
create policy "Clients can manage own photo batches"
on public.inventory_photo_batches
for all
to authenticated
using (client_id = auth.uid())
with check (client_id = auth.uid());

drop policy if exists "Clients can read own conversion items" on public.inventory_conversion_items;
create policy "Clients can read own conversion items"
on public.inventory_conversion_items
for select
to authenticated
using (client_id = auth.uid());

drop policy if exists "Admins can manage all products" on public.products;
create policy "Admins can manage all products"
on public.products
for all
to authenticated
using (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
)
with check (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
);

drop policy if exists "Admins can read all inventory logs" on public.inventory_logs;
drop policy if exists "Admins can manage all inventory logs" on public.inventory_logs;
create policy "Admins can manage all inventory logs"
on public.inventory_logs
for all
to authenticated
using (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
)
with check (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
);

drop policy if exists "Admins can manage inventory uploads" on public.inventory_uploads;
create policy "Admins can manage inventory uploads"
on public.inventory_uploads
for all
to authenticated
using (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
)
with check (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
);

drop policy if exists "Admins can manage photo batches" on public.inventory_photo_batches;
create policy "Admins can manage photo batches"
on public.inventory_photo_batches
for all
to authenticated
using (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
)
with check (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
);

drop policy if exists "Admins can manage conversion items" on public.inventory_conversion_items;
create policy "Admins can manage conversion items"
on public.inventory_conversion_items
for all
to authenticated
using (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
)
with check (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
);

drop policy if exists "Partners can read assigned photo batches" on public.inventory_photo_batches;
create policy "Partners can read assigned photo batches"
on public.inventory_photo_batches
for select
to authenticated
using (
    exists (
        select 1 from public.tasks
        where tasks.id = inventory_photo_batches.task_id
        and tasks.worker_id = auth.uid()
        and tasks.payment_status = 'paid'
        and tasks.service_type = 'inventory_photo_conversion'
    )
);

drop policy if exists "Partners can manage assigned conversion items" on public.inventory_conversion_items;
create policy "Partners can manage assigned conversion items"
on public.inventory_conversion_items
for all
to authenticated
using (
    exists (
        select 1 from public.tasks
        where tasks.id = inventory_conversion_items.task_id
        and tasks.worker_id = auth.uid()
        and tasks.payment_status = 'paid'
        and tasks.service_type = 'inventory_photo_conversion'
    )
)
with check (
    exists (
        select 1 from public.tasks
        where tasks.id = inventory_conversion_items.task_id
        and tasks.worker_id = auth.uid()
        and tasks.payment_status = 'paid'
        and tasks.service_type = 'inventory_photo_conversion'
    )
);

drop policy if exists "Clients can manage own product upload batches" on public.product_upload_batches;
create policy "Clients can manage own product upload batches"
on public.product_upload_batches
for all
to authenticated
using (client_id = auth.uid())
with check (client_id = auth.uid());

drop policy if exists "Clients can read own product content outputs" on public.product_content_outputs;
create policy "Clients can read own product content outputs"
on public.product_content_outputs
for select
to authenticated
using (client_id = auth.uid());

drop policy if exists "Admins can manage product upload batches" on public.product_upload_batches;
create policy "Admins can manage product upload batches"
on public.product_upload_batches
for all
to authenticated
using (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
)
with check (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
);

drop policy if exists "Admins can manage product content outputs" on public.product_content_outputs;
create policy "Admins can manage product content outputs"
on public.product_content_outputs
for all
to authenticated
using (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
)
with check (
    exists (
        select 1 from public.users
        where users.id = auth.uid()
        and lower(users.role) = 'admin'
    )
);

drop policy if exists "Partners can read assigned product upload batches" on public.product_upload_batches;
create policy "Partners can read assigned product upload batches"
on public.product_upload_batches
for select
to authenticated
using (
    exists (
        select 1 from public.tasks
        where tasks.id = product_upload_batches.task_id
        and tasks.worker_id = auth.uid()
        and tasks.payment_status = 'paid'
    )
);

drop policy if exists "Partners can manage assigned product content outputs" on public.product_content_outputs;
create policy "Partners can manage assigned product content outputs"
on public.product_content_outputs
for all
to authenticated
using (
    exists (
        select 1 from public.tasks
        where tasks.id = product_content_outputs.task_id
        and tasks.worker_id = auth.uid()
        and tasks.payment_status = 'paid'
    )
)
with check (
    exists (
        select 1 from public.tasks
        where tasks.id = product_content_outputs.task_id
        and tasks.worker_id = auth.uid()
        and tasks.payment_status = 'paid'
    )
);
