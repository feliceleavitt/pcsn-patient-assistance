-- Install and seed in staging first. No patient tables are changed.
create table public.pcsn_catalog_revisions (
 id text primary key,
 parent_id text references public.pcsn_catalog_revisions(id),
 action text not null check (action in ('draft','publish','restore')),
 entries jsonb not null check (jsonb_typeof(entries)='array'),
 actor text not null,
 created_at timestamptz not null default now(),
 note text not null check(length(trim(note))>0)
);
create table public.pcsn_catalog_head (
 singleton boolean primary key default true check(singleton),
 head text references public.pcsn_catalog_revisions(id),
 published text references public.pcsn_catalog_revisions(id)
);
insert into public.pcsn_catalog_head(singleton) values(true);
alter table public.pcsn_catalog_revisions enable row level security;
alter table public.pcsn_catalog_head enable row level security;
-- No browser role receives access to drafts, history or mutations.
revoke all on public.pcsn_catalog_revisions,public.pcsn_catalog_head from anon,authenticated;
create function public.pcsn_catalog_immutable() returns trigger language plpgsql as $$
begin raise exception 'Catalog history is immutable'; end $$;
create trigger pcsn_catalog_no_rewrite before update or delete on public.pcsn_catalog_revisions for each row execute function public.pcsn_catalog_immutable();
create function public.pcsn_catalog_read() returns jsonb language sql security definer set search_path=public as $$
 select jsonb_build_object('head',h.head,'published',h.published,'revisions',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id) from pcsn_catalog_revisions r),'[]'::jsonb)) from pcsn_catalog_head h where singleton;
$$;
create function public.pcsn_catalog_published() returns jsonb language sql security definer set search_path=public as $$
 select jsonb_build_object('version',r.id,'entries',r.entries) from pcsn_catalog_head h join pcsn_catalog_revisions r on r.id=h.published and r.action='publish' where h.singleton;
$$;
create function public.pcsn_catalog_commit(p_expected text,p_id text,p_entries jsonb,p_action text,p_actor text,p_note text) returns void language plpgsql security definer set search_path=public as $$
declare current_head text;
begin
 select head into current_head from pcsn_catalog_head where singleton for update;
 if current_head is distinct from p_expected then raise exception 'Concurrent catalog change' using errcode='40001'; end if;
 insert into pcsn_catalog_revisions(id,parent_id,entries,action,actor,note) values(p_id,current_head,p_entries,p_action,p_actor,p_note);
 update pcsn_catalog_head set head=p_id,published=case when p_action='publish' then p_id else published end where singleton;
end $$;
revoke all on function public.pcsn_catalog_read(),public.pcsn_catalog_published(),public.pcsn_catalog_commit(text,text,jsonb,text,text,text) from public,anon,authenticated;
grant execute on function public.pcsn_catalog_read(),public.pcsn_catalog_published(),public.pcsn_catalog_commit(text,text,jsonb,text,text,text) to service_role;
