create extension if not exists "pgcrypto";

create type public.application_status as enum (
  'submitted',
  'under_review',
  'missing_documents',
  'approved',
  'denied',
  'renewal_needed'
);

create type public.admin_role as enum ('admin', 'reviewer');

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  date_of_birth date not null,
  phone text not null,
  email text not null,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  assistance_type text not null check (assistance_type in ('manufacturer', 'hospital', 'both')),
  representative jsonb not null default '{}'::jsonb,
  cancer_type text not null,
  diagnosis_date date not null,
  treatment_plan text not null,
  treatment_start_date date,
  medication_requested text,
  clinic_name text not null,
  provider_name text not null,
  provider_npi text not null,
  provider_phone text not null,
  provider_fax text,
  provider_address_line_1 text not null,
  provider_address_line_2 text,
  provider_city text not null,
  provider_state text not null,
  provider_postal_code text not null,
  hospital_account_number text,
  guarantor_number text,
  has_insurance boolean not null,
  insurance_details jsonb not null default '{}'::jsonb,
  monthly_income numeric(12,2) not null,
  annual_income numeric(12,2) not null,
  household_size integer not null check (household_size > 0),
  employment_status text not null,
  household_members jsonb not null default '[]'::jsonb,
  consent_release boolean not null check (consent_release = true),
  consent_contact_permission boolean not null check (consent_contact_permission = true),
  signature text not null,
  signed_at timestamptz not null,
  status public.application_status not null default 'submitted',
  missing_documents text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  original_filename text not null,
  document_type text not null,
  storage_path text not null unique,
  mime_type text not null,
  byte_size integer not null,
  encryption_iv text not null,
  encryption_tag text not null,
  uploaded_at timestamptz not null default now()
);

create table public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.admin_role not null,
  created_at timestamptz not null default now()
);

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  note text not null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  action text not null,
  submission_id uuid references public.submissions(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger submissions_set_updated_at
before update on public.submissions
for each row execute function public.set_updated_at();

alter table public.patients enable row level security;
alter table public.submissions enable row level security;
alter table public.documents enable row level security;
alter table public.admin_roles enable row level security;
alter table public.admin_notes enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_roles
    where user_id = auth.uid()
  );
$$;

create policy "admins can read patients"
on public.patients for select
using (public.is_admin());

create policy "admins can read submissions"
on public.submissions for select
using (public.is_admin());

create policy "admins can update submissions"
on public.submissions for update
using (public.is_admin())
with check (public.is_admin());

create policy "admins can read documents"
on public.documents for select
using (public.is_admin());

create policy "admins can read roles"
on public.admin_roles for select
using (user_id = auth.uid() or public.is_admin());

create policy "admins can manage notes"
on public.admin_notes for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins can read audit logs"
on public.audit_logs for select
using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('encrypted-documents', 'encrypted-documents', false)
on conflict (id) do nothing;

create policy "admins can read encrypted storage"
on storage.objects for select
using (bucket_id = 'encrypted-documents' and public.is_admin());
