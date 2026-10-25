-- Server-side audit events must not be writable by browser roles.
grant insert on table public.audit_logs to service_role;

notify pgrst, 'reload schema';
