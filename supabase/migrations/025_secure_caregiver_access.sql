-- Caregiver relationships are explicit, revocable, and never exposed directly
-- to browser database roles. Application routes enforce patient ownership and
-- caregiver membership before using service_role.

create table if not exists public.caregiver_invitations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  invited_email text not null,
  token_hash text not null unique,
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by_user_id uuid references auth.users(id),
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users(id)
);

create index if not exists caregiver_invitations_patient_id_idx
  on public.caregiver_invitations(patient_id);

create table if not exists public.caregiver_access (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  caregiver_user_id uuid not null references auth.users(id) on delete cascade,
  granted_by_user_id uuid not null references auth.users(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users(id),
  unique (patient_id, caregiver_user_id)
);

create index if not exists caregiver_access_caregiver_user_id_idx
  on public.caregiver_access(caregiver_user_id) where revoked_at is null;

alter table public.caregiver_invitations enable row level security;
alter table public.caregiver_access enable row level security;
revoke all on public.caregiver_invitations from anon, authenticated;
revoke all on public.caregiver_access from anon, authenticated;
grant select, insert, update on public.caregiver_invitations to service_role;
grant select, insert, update on public.caregiver_access to service_role;
