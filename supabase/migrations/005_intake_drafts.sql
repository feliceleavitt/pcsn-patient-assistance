create table if not exists public.intake_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.intake_drafts enable row level security;

drop policy if exists "patients can manage own intake draft" on public.intake_drafts;
create policy "patients can manage own intake draft"
  on public.intake_drafts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists intake_drafts_set_updated_at on public.intake_drafts;
create trigger intake_drafts_set_updated_at
  before update on public.intake_drafts
  for each row execute function public.set_updated_at();
