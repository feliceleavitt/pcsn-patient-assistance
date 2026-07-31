# PCSN Financial Assistance Portal

HIPAA-conscious intake and review portal built with Next.js, TypeScript, Tailwind, and Supabase.

## Included

- Public multi-step intake flow with conditional branches for manufacturer
  medication assistance, hospital financial assistance, or both
- Separate volunteer dashboard for approved reviewers
- Patient account creation and sign-in for returning to upload missing
  documents or update contact information
- Volunteer access restricted to the configured allowlist, with Supabase Auth
  still available as a fallback for those same emails
- Audit logging for admin views, edits, document downloads, and packet exports
- No-PHI email notifications for new submissions
- Patient packet PDF export
- Expanded application capture for representatives, prescribers, medication
  requests, hospital account details, detailed insurance, household members,
  income sources, and categorized supporting documents
- Supabase schema, RLS, storage bucket policy, and reusable UI components

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set Supabase credentials and generate a 32-byte AES key for `FILE_ENCRYPTION_KEY_BASE64`.
3. Set `ADMIN_SESSION_SECRET` to a long random value.
4. Set `VOLUNTEER_SHARED_PASSWORD` in your environment manager. Do not commit it.
5. Apply all SQL files in `supabase/migrations/` to your Supabase project in order.
6. To send notifications, set `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`, and `NEXT_PUBLIC_APP_URL`.
7. Install dependencies with `npm install`.
8. Start the app with `npm run dev`.

## Security notes

- Public intake writes through a server route using the service role; public users never receive PHI-bearing query parameters.
- Uploaded files are encrypted with AES-256-GCM before storage and decrypted only for authorized admin downloads.
- Volunteer pages require a signed session for an approved email address. Supabase
  Auth users are accepted only when the email is on the same approved list and
  the user has an `admin_roles` row.
- Patient profiles are linked to applications submitted while the patient is
  signed in. Existing unlinked applications are not automatically claimed by
  email address.
- Audit rows are written on admin view, edit, download, and PDF export operations.
- Notification emails intentionally include no patient name, diagnosis,
  medication, document names, or other PHI.
