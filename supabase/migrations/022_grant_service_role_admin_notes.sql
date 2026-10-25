-- Internal volunteer notes are read and written only by server-side admin routes.
-- Browser-facing roles retain no direct table privileges.
grant select, insert on table public.admin_notes to service_role;

notify pgrst, 'reload schema';
