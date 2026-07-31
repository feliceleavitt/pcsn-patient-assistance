alter table public.patients
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists patients_user_id_idx
  on public.patients(user_id);
