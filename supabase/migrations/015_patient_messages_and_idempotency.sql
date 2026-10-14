-- STAGING REVIEW REQUIRED: do not apply until approved.
-- Server routes use the service role after authenticating the acting patient or volunteer.
create table public.patient_messages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  sender_kind text not null check (sender_kind in ('patient', 'volunteer')),
  sender_user_id uuid references auth.users(id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index patient_messages_submission_created_idx on public.patient_messages(submission_id, created_at);
alter table public.patient_messages enable row level security;
revoke all on public.patient_messages from anon, authenticated;
grant select, insert on public.patient_messages to service_role;

create table public.submission_idempotency (
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  submission_id uuid references public.submissions(id) on delete set null,
  request_fingerprint text not null,
  state text not null check (state in ('processing', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (patient_user_id, idempotency_key)
);
revoke all on public.submission_idempotency from anon, authenticated;
grant select, insert, update, delete on public.submission_idempotency to service_role;
