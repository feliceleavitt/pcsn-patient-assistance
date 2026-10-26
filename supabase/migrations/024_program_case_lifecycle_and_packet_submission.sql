-- Persistent, volunteer-only case management fields. Browser roles retain no
-- direct privileges; all access remains through authenticated server routes.

alter table public.assistance_packets
  add column if not exists submitted_at timestamptz;

-- Older submitted packets did not have a dedicated event timestamp. Preserve
-- their best available historical timestamp rather than rewriting packet data.
update public.assistance_packets
set submitted_at = updated_at
where status = 'submitted'
  and submitted_at is null;

alter table public.program_cases
  add column if not exists assigned_to text,
  add column if not exists application_deadline date,
  add column if not exists submitted_at timestamptz,
  add column if not exists follow_up_at date,
  add column if not exists reminder_status text not null default 'not_set',
  add column if not exists application_status text not null default 'draft',
  add column if not exists decision_details text,
  add column if not exists decision_at timestamptz,
  add column if not exists internal_notes text not null default '',
  add column if not exists updated_at timestamptz not null default now();

alter table public.program_cases
  drop constraint if exists program_cases_reminder_status_check,
  add constraint program_cases_reminder_status_check
    check (reminder_status in ('not_set', 'scheduled', 'completed', 'dismissed')),
  drop constraint if exists program_cases_application_status_check,
  add constraint program_cases_application_status_check
    check (application_status in ('draft', 'preparing', 'submitted', 'pending_decision', 'approved', 'denied', 'closed')),
  drop constraint if exists program_cases_decision_date_check,
  add constraint program_cases_decision_date_check
    check (decision_at is null or application_status in ('approved', 'denied'));

drop trigger if exists program_cases_set_updated_at on public.program_cases;
create trigger program_cases_set_updated_at
before update on public.program_cases
for each row execute function public.set_updated_at();

-- `service_role` is used only by routes that perform their own session and
-- ownership/role checks. No anon or authenticated grant is added here.
grant update on table public.program_cases to service_role;
