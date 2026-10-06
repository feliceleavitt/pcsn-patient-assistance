-- Intake writes are performed by the server-only service role. Do not grant
-- these privileges to anon or authenticated; their access remains governed by
-- the existing RLS policies and application session checks.
grant select, insert, update, delete on table
  public.patients,
  public.submissions,
  public.documents
to service_role;

notify pgrst, 'reload schema';
