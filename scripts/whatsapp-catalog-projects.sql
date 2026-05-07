create table if not exists public.whatsapp_catalog_projects (
    id uuid primary key default gen_random_uuid(),
    client_name text,
    business_name text,
    business_category text,
    phone text,
    address text,
    support_email text,
    working_hours text,
    business_description text,
    logo_url text,
    notes text,
    shelf_images jsonb default '[]'::jsonb,
    products jsonb default '[]'::jsonb,
    generated_profile jsonb default '{}'::jsonb,
    checklist jsonb default '[]'::jsonb,
    status text default 'draft',
    template_type text,
    completion_score integer default 0,
    exported_at timestamptz,
    created_by uuid,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.whatsapp_catalog_projects
    add column if not exists shelf_images jsonb default '[]'::jsonb;

alter table public.whatsapp_catalog_projects
    add column if not exists status text default 'draft';

alter table public.whatsapp_catalog_projects
    add column if not exists template_type text;

alter table public.whatsapp_catalog_projects
    add column if not exists completion_score integer default 0;

alter table public.whatsapp_catalog_projects
    add column if not exists exported_at timestamptz;

alter table public.whatsapp_catalog_projects
    add column if not exists updated_at timestamptz default now();

alter table public.whatsapp_catalog_projects
    add column if not exists task_id uuid;

alter table public.whatsapp_catalog_projects
    add column if not exists client_id uuid;

alter table public.whatsapp_catalog_projects
    add column if not exists partner_id uuid;

alter table public.whatsapp_catalog_projects
    add column if not exists project_type text default 'client_task';

create index if not exists whatsapp_catalog_projects_created_by_idx
    on public.whatsapp_catalog_projects(created_by);

create index if not exists whatsapp_catalog_projects_created_at_idx
    on public.whatsapp_catalog_projects(created_at desc);

create index if not exists whatsapp_catalog_projects_updated_at_idx
    on public.whatsapp_catalog_projects(updated_at desc);

create index if not exists whatsapp_catalog_projects_task_id_idx
    on public.whatsapp_catalog_projects(task_id);

create index if not exists whatsapp_catalog_projects_partner_id_idx
    on public.whatsapp_catalog_projects(partner_id);

-- TODO: Add RLS policies so partners can only read/write projects where partner_id = auth.uid()
-- and task_id is present for client_task records.
