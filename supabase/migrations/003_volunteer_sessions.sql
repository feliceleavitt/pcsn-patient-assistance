alter table public.admin_notes
  drop constraint if exists admin_notes_author_id_fkey,
  alter column author_id type text using author_id::text;

alter table public.audit_logs
  drop constraint if exists audit_logs_actor_id_fkey,
  alter column actor_id type text using actor_id::text;
