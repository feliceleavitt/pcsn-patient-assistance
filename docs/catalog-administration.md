# Versioned program and resource library

## Implemented

`/admin/catalog` is an administrator-only editor for facilities, drugs, programs, questions, document requirements, screening/review rules, links, instructions and renewal lead time. Programs can be automatic candidates (all explicit triggers must match known facts) or directory-only resources. All rule outcomes remain preliminary; review rules do not approve anyone.

The runtime reads only the published catalog pointer. Patient facility/medication suggestions, mapped identity-question wording/help, existing document-upload help, volunteer resources and Assistance Plans consume that snapshot. New question definitions become missing facts in the volunteer plan; this does **not** introduce new patient answer storage or replace the existing intake. Existing question validation and consent behavior remain intact. New custom patient questions and upload types need a subsequent intake/storage milestone. Editing a label does not change what an existing stored answer means.

Every save creates a complete immutable snapshot with author, timestamp, parent, note and action. Publishing advances one pointer atomically, so related questions/documents/programs cannot be half-published. Per-item history shows its saved values in each snapshot. Restore copies history into a new draft; it never edits historical records. Deactivate rather than delete. Screening is separate from overall submission approval. LIHEAP and Power AZ keep separate definitions and share an application ID/link.

The database is PostgreSQL/Supabase, not the workbook: two RLS-protected tables hold immutable JSONB release snapshots and the current head/published pointers. Snapshots intentionally publish the small reference library together; patient data is not included. A future large catalog can normalize entities behind the same interface without changing the publication contract. Existing patient cases are not yet persistent program cases; when added, store their catalog revision ID so prior submissions keep their original requirements.

## Verification and quarterly maintenance

Each entry has source URL, last verified date, server-stamped verifier, verification notes, review owner, 1–3 calendar-month review interval and additional cadence instructions. Edits invalidate verification unless explicitly reverified. Saving, importing or publishing never silently advances verification. Original legacy content is preserved as unverified: unchanged legacy rows may carry forward, but changed/new active content must pass verification and reference checks. This avoids falsely declaring hundreds of inherited suggestions verified just to preserve existing behavior.

The review queue shows unverified and due/overdue records. Quarterly is the maximum interval; live funding and urgent routes still need at-use checks. Renewal lead time is stored/displayed but does not create patient renewal reminders yet, because saved program awards/cases are not implemented. A separate Codex quarterly automation reviews website and catalog; it does not publish changes.

## Workbook boundary

Both original user workbooks are preserved in `public/templates`. Initial development data contains the 74 route records and 16 question references as disabled/unverified drafts. Their narrative criteria are never converted into guessed executable eligibility rules.

Import recognizes both supplied templates and the `Portal Catalog` sheet in exports. It stages changes for review, clears imported verification and never publishes. Original-template rows use stable prefixed IDs; review duplicates before enabling them. Export includes the unchanged master reference workbook plus an exact round-trip `Portal Catalog` sheet and an explanation. The reference tabs are explicitly not current live data. Formula cells are rejected; spreadsheet namespace/relationship normalization supports the supplied files. Uploads are limited to 2 MB compressed / 25 MB expanded and 2,000 catalog entries. Only catalog administrators can import/export. No patient data belongs in this library.

## Rollout procedure

1. Apply `supabase/migrations/009_versioned_catalog.sql` in staging. It changes no patient tables. Browser roles have no direct catalog access; server-side APIs enforce the existing login and separate editor permission.
2. With staging environment variables, run `node scripts/seed-catalog.cjs --initialize-empty-catalog`. It refuses a nonempty catalog. It copies the existing release and then adds the supplied route workbook as a draft. It is never run by the build or application startup.
3. Set `PCSN_CATALOG_ADMIN_EMAILS` to the approved editor email list. Existing custom volunteer sessions call all volunteers admin, so that role alone intentionally does not grant publishing access.
4. Set `PCSN_CATALOG_ENABLED=true` only after seeding. Prior to this explicit rollout, existing released definitions continue to work; publication is blocked. Once enabled, database failures never fall back to draft or obsolete code definitions.
5. Verify staging login, editor restrictions, draft isolation, publish/restore, intake suggestions, resources and existing patient features before production rollout. Production migration and seeding were authorized and executed on September 21, 2026. The published pointer retains legacy-release; the workbook imports remain disabled drafts.

## Verification

`npm run test:catalog` covers publication isolation, verification authorship, reference validation, unsafe URLs, unknown facts, shared utility applications, workbook round trips, quarterly dates, unauthorized/cross-origin writes and PostgreSQL history/privilege protections. Database tests use isolated in-memory PGlite and never contact Supabase.

Legacy assistance and password-recovery tests remain part of verification. The local browser demonstrated authenticated editing and successful draft saving; an HTTP check confirmed draft content was absent from the volunteer preview. Automatic approval review initially blocked the local publish test. After the user explicitly approved localhost-only publication, the browser test succeeded: the published pointer advanced, the server recorded the demo verifier, and the volunteer preview displayed the synthetic instruction while the 74 imported routes remained hidden. Synthetic edits were cleared by restarting the development process. Production was untouched.

The runtime available for verification is Node 24; the project declares Node 22, so staging CI should run the declared version. The September 21 release updates Next.js to 15.5.24 and patches vulnerable transitive dependencies; npm audit reports zero vulnerabilities. The newly introduced ExcelJS UUID advisory was addressed with a scoped UUID override and workbook tests.

Final checks: all 44 tests passed; production build and TypeScript checks passed. Local preview: http://127.0.0.1:3117/admin/catalog.
