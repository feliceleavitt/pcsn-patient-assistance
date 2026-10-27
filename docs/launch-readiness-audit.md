# Launch-readiness audit and staging supervisor preview

**Audit date:** 2026-10-27  
**Source reviewed:** `codex/audited-catalog-preview` at `8612e21`  
**Scope:** source code, migrations `001` through `025`, local automated tests,
type checking, linting, and production build. This is not evidence that a
hosted deployment, database, or external URL is working.

## Verified locally

The following source-level protections and workflows are covered by the test
suite. The checks use isolated fakes or temporary local PostgreSQL instances;
they do not contact a real patient, production project, or email recipient.

| Area | Evidence | Status |
| --- | --- | --- |
| Intake validation and submission finalization | required-section, consent, canonical-field, idempotency, and transactional-finalizer tests | tested locally |
| Save/resume and draft documents | owner-scoped draft, cross-origin, private-upload, and atomic-transfer tests | tested locally |
| Patient portal | login guard, owner-scoped application query, post-submission behavior, and upload checks | tested locally |
| Volunteer access | session, approved-email, role, forced-password-change, and reset tests | tested locally |
| Patient isolation and documents | anonymous/cross-owner denial, private document metadata, and byte-signature validation tests | tested locally |
| Caregiver permissions | no browser-table access, invitation acceptance, revocation, and atomic single-use invitation test | tested locally |
| Case routing and lifecycle | audited catalog, manual-review constraints, immutable snapshots, duplicate protection, and lifecycle migration tests | tested locally |
| Messaging | dedicated patient-message storage test | tested locally |
| Production build quality | `npm run typecheck`, `npm run lint`, and `npm run build` | passed locally |

Run the complete suite with:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

## Not verified yet

The repository deliberately does **not** contain any of the following:

- a staging URL or Vercel project linkage;
- proof that the linked Supabase project is staging rather than production;
- applied-migration history or schema parity for a remote project;
- an authorized synthetic patient, volunteer, or supervisor account;
- confirmation that `PCSN_CATALOG_ENABLED=true` resolves the approved
  published catalog revision;
- browser evidence for desktop or mobile behavior; or
- backup, restore, credential-rotation, or rollback evidence.

Do not describe any of those items as verified until the checks below are
recorded against the named non-production deployment.

## Safe staging gate

An owner with access to the deployment and **known staging Supabase project**
must complete this gate. Do not run it against production.

1. Record the HTTPS staging URL, Vercel project name, and Supabase project ref
   in the deployment run record. Confirm that none is the production project.
2. Compare the remote migration history with all files in
   `supabase/migrations/001_init.sql` through
   `supabase/migrations/025_secure_caregiver_access.sql`. Apply only missing
   migrations to the confirmed staging project, in numeric order.
3. Configure staging-only values for the Supabase URL, anon key, service-role
   key, file-encryption key, session secret, approved volunteer allowlist, and
   canonical `NEXT_PUBLIC_APP_URL`. Keep them in the provider's environment
   manager, never in source control or a browser-exposed variable.
4. Set `PCSN_CATALOG_ENABLED=true` only after confirming this is the staging
   deployment and that the approved catalog revision is published. Keep
   outbound notifications disabled or routed exclusively to an approved test
   mailbox; never use a real patient address.
5. Seed only synthetic patient records, documents, messages, and program cases.
   Use unmistakably fake names and `example.invalid` addresses. Do not import
   production data or files.
6. Deploy this exact commit. From an external computer and a clean browser,
   complete the smoke tests below. Record the URL, commit, time, test accounts
   (outside this repository), and results.

## Supervisor access for Sam Martin

The staging-only enrollment flow is available only on a Vercel Preview
deployment. It requires migration `019` and an existing staging `auth.users`
record with an `admin_roles` row whose role is `admin`.

An authorized staging administrator must create a one-time, short-lived token
record in `staging_volunteer_password_setup_tokens` for Sam's existing
staging-only user. The administrator sends Sam this URL through an approved
secure channel:

```text
https://<staging-host>/admin/setup-password#token=<single-use-token>
```

The token stays in the URL fragment, so it is not sent to Vercel in the HTTP
request. Sam chooses a password meeting the displayed policy, then signs in at
`https://<staging-host>/admin/login` with the authorized staging email. The
enrollment endpoint returns 404 outside Vercel Preview, and token redemption is
atomic and single-use.

Before sending the link, the administrator must verify that the account is
staging-only, is listed in `VOLUNTEER_EMAILS`, has the `admin` role, and can see
only synthetic records. Never send credentials or a raw setup token in a ticket,
repository, or chat transcript.

## Hosted smoke test checklist

Use two synthetic patients, one synthetic caregiver, and the staging volunteer
account. Use separate clean browser profiles for each actor.

- Register patient A, save a partially completed intake, sign out/in, and
  confirm only A's draft appears. Submit it with synthetic files, then confirm
  the confirmation page and patient dashboard.
- Register patient B. Attempt direct URLs and API requests for A's application,
  draft, documents, messages, and signatures. Every attempt must deny access
  or return no data.
- As patient A, invite the synthetic caregiver. Confirm the invitation is
  single-use, the caregiver sees only A, and revocation removes access.
- As the volunteer, verify the dashboard lists the synthetic submission, open
  the detail page, view permitted document metadata/downloads, update status
  and notes, and create/update a program case. Confirm case routing remains
  manual decision support rather than an eligibility assertion.
- As a non-volunteer and a patient, attempt every `/admin` route and the
  volunteer APIs. Confirm redirection/denial and no patient data in errors.
- Check password reset only with the approved test mailbox. Confirm that a
  used or expired reset link fails and no real email is sent.
- Repeat patient and volunteer paths at a narrow mobile viewport and desktop.
  Record broken controls, navigation, or error states as failures.

## Production blockers

Production launch is blocked until all of these have evidence from the
production owner; this audit did not change production.

1. A documented staging deployment and successful hosted smoke-test record.
2. Schema/migration parity through migration 025, including RLS and storage
   policy verification on the intended production project.
3. A production secrets inventory, least-privilege access review, rotation
   owner/cadence, and confirmation that service-role values are server-only.
4. Tested encrypted-file backup and restore procedures, including a timed
   restoration drill.
5. A rollback plan that identifies the previous deploy and database-migration
   recovery procedure; irreversible migrations need a separately reviewed
   mitigation.
6. Approved operational policies for volunteer provisioning/removal, audit-log
   review, incident response, data retention, and patient support.
7. Production-domain configuration, TLS, canonical URL, outbound-email
   controls, and a post-deployment smoke-test checklist.

