alter type public.application_status add value if not exists 'renewal_needed';

alter table public.submissions
  add column if not exists assistance_type text,
  add column if not exists representative jsonb not null default '{}'::jsonb,
  add column if not exists medication_requested text,
  add column if not exists provider_npi text,
  add column if not exists provider_address_line_1 text,
  add column if not exists provider_address_line_2 text,
  add column if not exists provider_city text,
  add column if not exists provider_state text,
  add column if not exists provider_postal_code text,
  add column if not exists hospital_account_number text,
  add column if not exists guarantor_number text,
  add column if not exists insurance_details jsonb not null default '{}'::jsonb,
  add column if not exists monthly_income numeric(12,2),
  add column if not exists household_members jsonb not null default '[]'::jsonb,
  add column if not exists consent_contact_permission boolean;

alter table public.documents
  add column if not exists document_type text;

alter table public.submissions
  drop constraint if exists submissions_assistance_type_check,
  add constraint submissions_assistance_type_check
    check (assistance_type in ('manufacturer', 'hospital', 'both'));
