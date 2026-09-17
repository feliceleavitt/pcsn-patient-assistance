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

## Volunteer password recovery

Volunteers can select **Forgot your password?** at `/admin/login`, receive an
email, and choose a new password at `/admin/reset-password`. Recovery is limited
to the existing volunteer allowlist and uses `volunteer_credentials`; it does
not change a patient's Supabase Auth password or require a new database migration.

Required deployment settings: `NEXT_PUBLIC_APP_URL` (the canonical HTTPS portal
URL), `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`, and `ADMIN_SESSION_SECRET`
(or the existing `VOLUNTEER_SESSION_SECRET` fallback), plus the existing Supabase
service credentials. Migration `006_volunteer_credentials.sql` must already be
applied. Recovery links expire within 30 minutes, are carried in the URL fragment,
and are consumed atomically when the password is saved. Password changes also
invalidate outstanding recovery links. Duplicate emails are deduplicated by
Resend in five-minute windows. Valid email submissions receive a generic response
so account membership and email delivery failures are not disclosed.

Recovery clears the current browser's volunteer cookie and requires sign-in.
Existing sessions in other browsers retain their existing expiration (up to eight
hours); this change does not introduce global session revocation.

Validation: `node --test tests/volunteer-password-reset.cjs`, `npm run typecheck`,
and `npm run build`. Route tests isolate the database and email provider. For a
live smoke test, request recovery for an approved test mailbox, follow the email,
set a new password, sign in, then confirm the same link cannot be reused.
