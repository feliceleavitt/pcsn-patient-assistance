-- A single-use, short-lived password setup capability for staging volunteers.
-- The application route that calls this function is unavailable outside Vercel Preview.
create table if not exists public.staging_volunteer_password_setup_tokens (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.staging_volunteer_password_setup_tokens enable row level security;

revoke all on table public.staging_volunteer_password_setup_tokens from public, anon, authenticated;
grant select, insert, update, delete on table public.staging_volunteer_password_setup_tokens to service_role;

create or replace function public.complete_staging_volunteer_password_setup(
  p_token_hash text,
  p_password_hash text,
  p_password_salt text
) returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  setup_user_id uuid;
  setup_email text;
begin
  -- Claiming the token first makes this a compare-and-swap operation: exactly
  -- one request can set a password, even if a browser submits twice.
  update public.staging_volunteer_password_setup_tokens
    set consumed_at = now()
    where token_hash = p_token_hash
      and consumed_at is null
      and expires_at > now()
    returning user_id into setup_user_id;

  if setup_user_id is null then
    return false;
  end if;

  select u.email into setup_email
    from auth.users u
    join public.admin_roles ar on ar.user_id = u.id and ar.role = 'admin'
    where u.id = setup_user_id
    limit 1;

  if setup_email is null then
    return false;
  end if;

  insert into public.volunteer_credentials (
    email, password_hash, password_salt, must_change_password
  ) values (
    lower(setup_email), p_password_hash, p_password_salt, false
  ) on conflict (email) do update set
    password_hash = excluded.password_hash,
    password_salt = excluded.password_salt,
    must_change_password = false;

  return true;
end;
$$;

revoke all on function public.complete_staging_volunteer_password_setup(text, text, text) from public, anon, authenticated;
grant execute on function public.complete_staging_volunteer_password_setup(text, text, text) to service_role;

notify pgrst, 'reload schema';
