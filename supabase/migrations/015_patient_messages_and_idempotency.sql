-- STAGING ONLY, REVIEW REQUIRED. This migration has not been applied anywhere.
-- Browser roles never receive table or function privileges; authenticated server
-- routes use service_role only after validating their patient/volunteer session.
create table public.patient_messages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  sender_kind text not null check (sender_kind in ('patient', 'volunteer')),
  sender_user_id uuid references auth.users(id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index patient_messages_submission_created_idx on public.patient_messages(submission_id, created_at);
alter table public.patient_messages enable row level security;
revoke all on public.patient_messages from public, anon, authenticated;
grant select, insert on public.patient_messages to service_role;

create function public.pcsn_assert_message_submission_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.submissions s join public.patients p on p.id=s.patient_id where s.id=new.submission_id and p.user_id=new.patient_user_id) then
    raise exception 'Patient does not own submission' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger patient_messages_require_submission_owner
before insert or update of submission_id, patient_user_id on public.patient_messages
for each row execute function public.pcsn_assert_message_submission_owner();

create table public.submission_operations (
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  request_fingerprint text not null check (length(request_fingerprint) = 64),
  state text not null check (state in ('processing', 'completed')),
  lease_token uuid,
  lease_expires_at timestamptz,
  submission_id uuid unique references public.submissions(id) on delete restrict,
  attempts integer not null default 1 check (attempts > 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (patient_user_id, idempotency_key),
  check ((state='processing' and lease_token is not null and lease_expires_at is not null and submission_id is null and completed_at is null) or (state='completed' and lease_token is null and lease_expires_at is null and submission_id is not null and completed_at is not null))
);
create index submission_operations_processing_lease_idx on public.submission_operations(lease_expires_at) where state='processing';
alter table public.submission_operations enable row level security;
revoke all on public.submission_operations from public, anon, authenticated;
grant select, insert, update, delete on public.submission_operations to service_role;

create function public.pcsn_claim_submission_operation(p_user uuid,p_key uuid,p_fingerprint text,p_lease_seconds integer default 120)
returns table(outcome text, lease_token uuid, submission_id uuid)
language plpgsql security definer set search_path=public as $$
declare op public.submission_operations%rowtype; next_token uuid;
begin
  if p_lease_seconds < 30 or p_lease_seconds > 600 then raise exception 'Invalid lease'; end if;
  insert into public.submission_operations(patient_user_id,idempotency_key,request_fingerprint,state,lease_token,lease_expires_at)
  values(p_user,p_key,p_fingerprint,'processing',gen_random_uuid(),now()+make_interval(secs=>p_lease_seconds)) on conflict do nothing returning * into op;
  if found then return query select 'claimed',op.lease_token,null::uuid; return; end if;
  select * into op from public.submission_operations where patient_user_id=p_user and idempotency_key=p_key for update;
  if op.request_fingerprint <> p_fingerprint then return query select 'conflict',null::uuid,null::uuid; return; end if;
  if op.state='completed' then return query select 'completed',null::uuid,op.submission_id; return; end if;
  if op.lease_expires_at > now() then return query select 'processing',null::uuid,null::uuid; return; end if;
  next_token:=gen_random_uuid();
  update public.submission_operations set lease_token=next_token,lease_expires_at=now()+make_interval(secs=>p_lease_seconds),attempts=attempts+1 where patient_user_id=p_user and idempotency_key=p_key;
  return query select 'claimed',next_token,null::uuid;
end;
$$;
create function public.pcsn_complete_submission_operation(p_user uuid,p_key uuid,p_token uuid,p_submission uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  update public.submission_operations set state='completed',lease_token=null,lease_expires_at=null,submission_id=p_submission,completed_at=now() where patient_user_id=p_user and idempotency_key=p_key and state='processing' and lease_token=p_token and lease_expires_at>now();
  return found;
end;
$$;
create function public.pcsn_release_submission_operation(p_user uuid,p_key uuid,p_token uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  delete from public.submission_operations where patient_user_id=p_user and idempotency_key=p_key and state='processing' and lease_token=p_token;
  return found;
end;
$$;
revoke all on function public.pcsn_claim_submission_operation(uuid,uuid,text,integer),public.pcsn_complete_submission_operation(uuid,uuid,uuid,uuid),public.pcsn_release_submission_operation(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.pcsn_claim_submission_operation(uuid,uuid,text,integer),public.pcsn_complete_submission_operation(uuid,uuid,uuid,uuid),public.pcsn_release_submission_operation(uuid,uuid,uuid) to service_role;

-- Creates the relational intake record and completes the matching lease in one
-- transaction. Object storage is intentionally outside this function.
create function public.pcsn_finalize_submission_operation(p_user uuid,p_key uuid,p_token uuid,p_patient jsonb,p_submission jsonb)
returns table(patient_id uuid, submission_id uuid)
language plpgsql security definer set search_path=public as $$
declare p public.patients%rowtype; s public.submissions%rowtype;
begin
  perform 1 from public.submission_operations where patient_user_id=p_user and idempotency_key=p_key and state='processing' and lease_token=p_token and lease_expires_at>now() for update;
  if not found then raise exception 'Submission operation lease is no longer valid' using errcode='40001'; end if;
  insert into public.patients(first_name,last_name,date_of_birth,phone,email,address_line_1,address_line_2,city,state,postal_code,user_id)
  values(p_patient->>'firstName',p_patient->>'lastName',(p_patient->>'dateOfBirth')::date,p_patient->>'phone',p_patient->>'email',p_patient->>'addressLine1',nullif(p_patient->>'addressLine2',''),p_patient->>'city',p_patient->>'state',p_patient->>'postalCode',p_user) returning * into p;
  insert into public.submissions(patient_id,assistance_type,representative,cancer_type,diagnosis_date,treatment_plan,medication_requested,clinic_name,provider_name,provider_npi,provider_phone,provider_address_line_1,provider_city,provider_state,provider_postal_code,has_insurance,insurance_details,monthly_income,annual_income,household_size,employment_status,household_members,consent_release,consent_contact_permission,signature,signed_at)
  values(p.id,p_submission->>'assistanceType',coalesce(p_submission->'representative','{}'),p_submission->>'cancerType',(p_submission->>'diagnosisDate')::date,p_submission->>'treatmentPlan',nullif(p_submission->>'medicationRequested',''),p_submission->>'clinicName',p_submission->>'providerName',coalesce(p_submission->>'providerNpi',''),coalesce(p_submission->>'providerPhone',''),coalesce(p_submission->>'providerAddressLine1',''),coalesce(p_submission->>'providerCity',''),coalesce(p_submission->>'providerState',''),coalesce(p_submission->>'providerPostalCode',''),coalesce((p_submission->>'hasInsurance')::boolean,false),coalesce(p_submission->'insuranceDetails','{}'),(p_submission->>'monthlyIncome')::numeric,(p_submission->>'annualIncome')::numeric,(p_submission->>'householdSize')::integer,p_submission->>'employmentStatus',coalesce(p_submission->'householdMembers','[]'),true,true,p_submission->>'signature',(p_submission->>'signedAt')::timestamptz) returning * into s;
  if not public.pcsn_complete_submission_operation(p_user,p_key,p_token,s.id) then raise exception 'Submission operation completion failed' using errcode='40001'; end if;
  return query select p.id,s.id;
end;
$$;
revoke all on function public.pcsn_finalize_submission_operation(uuid,uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.pcsn_finalize_submission_operation(uuid,uuid,uuid,jsonb,jsonb) to service_role;
