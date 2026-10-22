grant select, insert, update on table public.intake_drafts to service_role;
notify pgrst, 'reload schema';
