create table if not exists public.volunteer_credentials (
  email text primary key,
  password_hash text not null,
  password_salt text not null,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.volunteer_credentials enable row level security;

drop policy if exists "service role manages volunteer credentials" on public.volunteer_credentials;
create policy "service role manages volunteer credentials"
  on public.volunteer_credentials
  for all
  using (false)
  with check (false);

drop trigger if exists volunteer_credentials_set_updated_at on public.volunteer_credentials;
create trigger volunteer_credentials_set_updated_at
  before update on public.volunteer_credentials
  for each row execute function public.set_updated_at();
