-- Volunteer credential records are managed only by server-side admin routes.
-- Keep anon and authenticated roles unprivileged.
grant select, insert, update on table public.volunteer_credentials to service_role;

notify pgrst, 'reload schema';
