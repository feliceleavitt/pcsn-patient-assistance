alter table public.submissions
  add column if not exists treatment_facilities jsonb not null default '[]'::jsonb;
