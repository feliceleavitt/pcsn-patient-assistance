-- Draft removal is performed by server routes after checking patient ownership.
-- No browser role receives a new privilege.
grant delete on table public.intake_drafts to service_role;
notify pgrst, 'reload schema';
