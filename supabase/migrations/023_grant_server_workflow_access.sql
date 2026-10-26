-- These tables are accessed only through authenticated server routes. Browser
-- roles remain excluded by their RLS policies and explicit revocations.
grant select, insert, update on table public.assistance_packets to service_role;
grant select, insert on table public.program_cases to service_role;
