create table if not exists public.program_cases (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  program_id text not null,
  route_id text,
  route_action_type text,
  match_state text,
  verification_status text,
  provider_required boolean,
  source_url text,
  match_rationale jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (submission_id, program_id)
);
alter table public.program_cases enable row level security;
revoke all on public.program_cases from anon, authenticated;
