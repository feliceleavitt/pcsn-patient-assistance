-- Private encrypted uploads may exist before a submission. No patient facts in object names.
create table public.intake_draft_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_filename text not null,
  document_type text not null check (document_type not like 'internal_record:%'),
  storage_path text not null unique,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 10485760),
  encryption_iv text not null,
  encryption_tag text not null,
  uploaded_at timestamptz not null default now()
);
alter table public.intake_draft_documents enable row level security;
revoke all on public.intake_draft_documents from anon, authenticated;
grant all on public.intake_draft_documents to service_role;

-- Transfer metadata atomically; encrypted bytes stay in their private object.
create function public.pcsn_attach_draft_documents(p_user uuid, p_submission uuid, p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from submissions s join patients p on p.id=s.patient_id where s.id=p_submission and p.user_id=p_user) then
    raise exception 'Submission ownership mismatch';
  end if;
  perform id from intake_draft_documents where id=any(p_ids) and user_id=p_user for update;
  if (select count(*) from intake_draft_documents where id=any(p_ids) and user_id=p_user) <> cardinality(p_ids) then
    raise exception 'Draft documents changed; reload before submitting';
  end if;
  insert into documents (id,submission_id,original_filename,document_type,storage_path,mime_type,byte_size,encryption_iv,encryption_tag,uploaded_at)
    select id,p_submission,original_filename,document_type,storage_path,mime_type,byte_size,encryption_iv,encryption_tag,uploaded_at from intake_draft_documents where id=any(p_ids) and user_id=p_user;
  delete from intake_draft_documents where id=any(p_ids) and user_id=p_user;
end;
$$;
revoke all on function public.pcsn_attach_draft_documents(uuid,uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.pcsn_attach_draft_documents(uuid,uuid,uuid[]) to service_role;
