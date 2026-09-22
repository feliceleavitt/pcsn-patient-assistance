# Patient workflow repair status

On September 21, 2026 the user lifted the release hold and requested production deployment. Migrations 009 and 010 have been applied to the connected production Supabase project; deployment verification is recorded separately.

## Implemented

- Returning authenticated patients with a linked submission land on their dashboard. A separate request must be started explicitly. No records are merged by email or deleted automatically.
- Signed-in intake navigation exposes dashboard and sign-out. Database read errors no longer masquerade as an empty patient account.
- Continue validates the current section, permission is requested once, save errors stop advancement, and a persistent checklist and final review expose missing requirements.
- SSN is not collected by the universal intake. The backend accepts absence while retaining encrypted compatibility for older clients that provide one. Program-specific secure collection remains a later workflow.
- Unknown provider contact/address details and insurance identifiers can be left blank.
- Living-expense needs are captured with conditional utility follow-ups. Only an explicit electricity/gas need surfaces energy routes. Unchecked/missing answers are not a negative answer or an inferred need.
- Draft documents are encrypted using the existing private bucket and saved immediately. The UI lists successful uploads and allows removal. A service-only atomic transfer validates both document ownership and submission ownership. Migration 010 is installed in production.
- Known adult ages take precedence over an inconsistent legacy checkbox, and contradictions remain flagged. Default zero ages are not presented as confirmed minors.
- Mayo patient identity reuse requires explicit self-applicant relationship; conflicting values remain flagged.
- New submissions store volunteer-access permission and its timestamp. The patient dashboard reuses that stored permission.

## Verification and limits

Automated tests cover blank intake, conditional requirements, household interpretation, authenticated owner-scoped navigation, draft-file API access, file signatures, private database permissions, atomic document transfer, fact reuse, unknown utility answers, and legacy program behavior. No real patient fixtures or messages are used.

An authenticated end-to-end upload against a development Supabase database remains an outstanding verification limit. The local SQL tests use PGlite; they do not verify the hosted object-storage service. The new patient upload UI requires migration 010. A failed load is visibly reported and submission is blocked to avoid omitting existing saved files.

## Still required before patient-readiness sign-off

- Saved individual program cases, assignments, progress, outcomes, follow-up and renewal dates, change history, and task prioritization.
- Structured patient-visible requests/messages, response tracking, and notifications kept separate from internal notes.
- Patient dashboard case and deadline views; volunteer queue assignment/filter/task-count improvements.
- Verify and publish broader hospital, manufacturer, copay, foundation and living-expense routes. Imported unverified routes must remain drafts.
- Review all answers on the final review screen, including household and insurance details; complete field-level accessible validation and unknown-answer semantics.
- Verify the specific reported account linkage with authenticated ownership evidence. Do not infer ownership from matching email or names.
- Review legacy submission retry/idempotency and document-insert error handling before release.
- Full development browser tests, migration rehearsal, storage cleanup/retention review, and final production-readiness check.
