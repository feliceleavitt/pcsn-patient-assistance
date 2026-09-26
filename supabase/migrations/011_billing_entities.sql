alter table public.submissions
  add column if not exists billing_entities jsonb not null default '[]'::jsonb;
