alter table public.audit_logs
  alter column actor_id drop not null,
  add column if not exists actor_identifier text;

alter table public.admin_notes
  alter column author_id drop not null,
  add column if not exists author_identifier text;

create table if not exists public.assistance_packets (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  program_name text not null,
  program_type text not null check (program_type in ('hospital', 'manufacturer', 'foundation', 'other')),
  program_url text,
  program_phone text,
  status text not null default 'draft' check (
    status in (
      'draft',
      'signature_requested',
      'signed',
      'fax_ready',
      'faxed',
      'submitted',
      'cancelled'
    )
  ),
  created_by uuid references auth.users(id),
  created_by_identifier text,
  signature_requested_at timestamptz,
  signature_requested_by uuid references auth.users(id),
  signature_requested_by_identifier text,
  patient_signature text,
  patient_signed_at timestamptz,
  patient_signature_ip text,
  patient_signature_user_agent text,
  fax_number text,
  faxed_at timestamptz,
  fax_confirmation text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assistance_packets enable row level security;

drop policy if exists "admins can manage assistance packets" on public.assistance_packets;
create policy "admins can manage assistance packets"
on public.assistance_packets for all
using (public.is_admin())
with check (public.is_admin());

create index if not exists assistance_packets_submission_id_idx
  on public.assistance_packets(submission_id);

drop trigger if exists assistance_packets_set_updated_at on public.assistance_packets;
create trigger assistance_packets_set_updated_at
before update on public.assistance_packets
for each row execute function public.set_updated_at();
