-- Prepared for a separate reviewed rollout; not automatically applied.
create table public.program_cases (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.submissions(id),
 program_id text not null,
 catalog_version text not null,
 program_name text not null,
 status text not null check(status in ('preparing','awaiting_documents','submitted','approved','denied','follow_up_due','declined','completed')),
 assigned_to text not null default '',
 priority text not null default 'normal' check(priority in ('normal','urgent')),
 next_action text not null default '',
 missing_documents text not null default '',
 follow_up_date date, last_contact_date date, submitted_date date, benefits_end_date date,
 updated_by text not null,
 revision integer not null default 1,
 updated_at timestamptz not null default now(),
 unique(submission_id, program_id)
);
create table public.program_case_history (
 id uuid primary key default gen_random_uuid(),
 case_id uuid not null references public.program_cases(id),
 changed_at timestamptz not null default now(),
 snapshot jsonb not null
);
alter table public.program_cases enable row level security;
alter table public.program_case_history enable row level security;
revoke all on public.program_cases, public.program_case_history from anon, authenticated;
grant all on public.program_cases, public.program_case_history to service_role;
create function public.pcsn_program_case_history() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if TG_OP = 'UPDATE' then new.revision := old.revision + 1; end if;
 new.updated_at := now();
 return new;
end $$;
create trigger program_case_version before update on public.program_cases for each row execute function public.pcsn_program_case_history();
create function public.pcsn_program_case_record() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.program_case_history(case_id,snapshot) values(new.id,to_jsonb(new));
 return new;
end $$;
create trigger program_case_record after insert or update on public.program_cases for each row execute function public.pcsn_program_case_record();
revoke all on function public.pcsn_program_case_history(), public.pcsn_program_case_record() from public,anon,authenticated;
