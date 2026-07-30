# PCSN Financial Assistance Portal

HIPAA-conscious intake and review portal built with Next.js, TypeScript, Tailwind, and Supabase.

## Included

- Public multi-step intake flow with conditional branches for manufacturer
  medication assistance, hospital financial assistance, or both
- Separate admin dashboard for authenticated reviewers
- Role checks via `admin_roles`
- Audit logging for admin views, edits, document downloads, and packet exports
- Patient packet PDF export
- Expanded application capture for representatives, prescribers, medication
  requests, hospital account details, detailed insurance, household members,
  income sources, and categorized supporting documents
- Supabase schema, RLS, storage bucket policy, and reusable UI components

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set Supabase credentials and generate a 32-byte AES key for `FILE_ENCRYPTION_KEY_BASE64`.
3. Apply `supabase/migrations/001_init.sql` to your Supabase project.
4. Create at least one Supabase Auth user, then insert that user into `admin_roles`.
5. Install dependencies with `npm install`.
6. Start the app with `npm run dev`.

## Security notes

- Public intake writes through a server route using the service role; public users never receive PHI-bearing query parameters.
- Uploaded files are encrypted with AES-256-GCM before storage and decrypted only for authorized admin downloads.
- Admin pages require authenticated Supabase users with an `admin_roles` row.
- Audit rows are written on admin view, edit, download, and PDF export operations.
- The implementation intentionally does not send email notifications, so no PHI can leak through email content.
