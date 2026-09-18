# Assistance Plan preview

Implemented against main `542a2bdc56aee5a5fded69ddeb4a1e3c4aee60c2`. Research basis: PCSN Cross-Program Field Matrix and Research Update and Pilot Decision, September 17, 2026. The catalog includes official source links and a draft mapping version. This is preparation guidance, not automated eligibility determination.

## Run and review

Use the repository's Node 22 runtime and locked dependencies: `npm ci`, `npm run dev`. With no Supabase configuration, the existing non-production demo login is `demo@pcsn.local` / `demo`. Never configure production credentials for this preview.

Open `/admin`, select **Synthetic Assistance Plan preview**, or visit `/admin/assistance-plan-preview`. It is protected by the existing volunteer session guard and returns not-found outside existing demo mode. Synthetic examples are handwritten, separate from patient data, and do not save or submit anything.

Scenarios:

- Mayo: potential match from known routing facts, a missing medical bill, a targeted document request, and a suggested collect/reuse-documents stage. Differing medicine copies remain flagged. Overall “approved” does not approve Mayo.
- Mayo + utilities: explicit synthetic electricity/gas need and shutoff concern. LIHEAP and Power AZ appear separately with one DES application identifier and different rule-review notes. Utility facts here are explicitly synthetic future facts; the current intake does not collect them.
- Legacy / unknown: “More information needed,” no supported route, and distinct false, unknown and not-applicable answers in the grouped profile. Missing utility information never becomes a need or an ineligibility decision.

The utility example demonstrates the same income upload reused across all three routes, an outdated bill, missing evidence and urgent next action. Review metadata is explicitly synthetic, never inferred from an existing upload label. The profile inspector groups current facts into identity/contact, household, care, facilities/providers, insurance, medicines/pharmacy, employment, income/benefits and financial needs; documents are displayed separately. Workflow stages are suggested from the checklist, not recorded completion. Real legacy uploads remain unreviewed; the pilot neither calculates expiration from upload time nor treats an upload as program acceptance.

The same Assistance Plan component appears above the existing editor and details on `/admin/submissions/[submissionId]`. The oldest-first live query, details, notes, status controls, archives, uploads, general worksheet and PDF code are preserved. Only a development-only preview link was added to the dashboard.

## Architecture

`lib/assistance/profile.ts` is a pure whitelist adapter over the already-loaded submission. It does not fetch, write, decrypt or infer sensitive values. Facts retain their original field paths and reported values. Known, unknown, reported not-applicable and conflict states remain explicit; false and zero remain reported values with source provenance. Legacy boolean defaults carry a confirmation warning. No SSN, ciphertext, private notes, internal-record files, filenames or document contents enter the plan. Different annual/monthly periods are not declared contradictory or converted into program income. Applicant identity is not silently copied from patient identity.

`lib/assistance/plan.ts` holds the small versioned draft catalog and deterministic evaluator. It only surfaces Mayo when both the Arizona facility and hospital/both assistance request are known. Utility programs require explicit affirmative energy need. There is no production utility-input writer in this milestone. The catalog's field list is a preparation list, not an official-required-field denominator. No numeric eligibility thresholds are implemented.

`components/admin/AssistancePlan.tsx` is server-rendered inside the existing protected page. It shows reasons, role, reusable facts with provenance, missing answers, document presence versus acceptance, targeted next questions, owner, official links and unresolved rules. An explicit shutoff concern overrides routine document gathering. Sources and already-known facts are expandable. There is no new public API or client-side patient-data cache.

Screening results remain separate from external progress. Existing `submissions.status` is never used by the adapter/evaluator. External progress is **Not tracked in this preview**, not “not applied” or “approved.” Assignments and follow-ups are descriptive; no misleading save controls are added. Existing submission-view audit logging remains in place.

## Minimum storage needed next — proposal only

Keep patient facts, existing submission status, documents and notes where they are for the next small milestone. Keep the three program definitions in versioned code initially. Do not duplicate intake fields per program or add eligibility totals without a confirmed definition.

1. **Program cases:** one `assistance_program_cases` row per pursued submission/program/attempt, with id, submission_id, program_key, program_version, screening_status and reason/review snapshot, external_application_id, assigned_volunteer identity, follow_up_at, created_at and updated_at. Use optimistic revision checks and an explicit way to start a later renewal instead of overwriting an old case. The existing volunteer system includes email-based sessions, so do not assume every assignee has a Supabase auth UUID; normalize approved volunteer identity through the existing access rules.
2. **Shared external applications:** `assistance_external_applications` stores submission_id, route_key, workflow_status, submitted_at, confirmation document reference and timestamps. Both utility cases reference the same DES application row; Mayo has its own. Program-specific decisions/outcomes belong on the individual cases (decision_status, decided_at), because a shared submission does not imply a shared award. No backfill from overall “approved.”
3. **Audit history:** extend the existing audit-event vocabulary to record case creation, assignment, follow-up, external progress and program decisions, with actor and case/application IDs. Keep restricted confirmations in the current encrypted document system and respect internal-record exclusion. Before sending, capture the reviewed profile/program-version snapshot or exact submitted artifact so later edits do not rewrite history.

Those two small tables plus audit support can save cases, assignments and follow-ups. They do not require a universal-profile migration or a new document bucket. A task table, program editor, document-period metadata and a broader document vault can follow once the first cases are usable. Adding utility collection should be a separately approved conditional branch with explicit source/date, not a fabricated legacy mapping.

When saving evidence review is in scope, add a small case/requirement-to-document review record (document ID, case ID, requirement/version, reviewer, reviewed_at, person/period, review status). Keep the same uploaded file; an accepted review for one requirement must not automatically accept it for another. The synthetic review representation in this pilot is intentionally not a production storage contract.

All future writes must authorize the volunteer server-side, validate assignment against approved volunteers, enforce patient isolation and row-level policies, and update case/application records transactionally. No new patient-facing access should be inferred from possession of a case ID. This document proposes schema only; no migration was created or run.

## Verification and limits

Run `npm run test:assistance`, `node --test tests/volunteer-password-reset.cjs`, `npm run typecheck`, and `npm run build`.

Tests cover protected preview/detail access, patient-only and invalid sessions, staff-role checks, mandatory password change, demo-mode exclusion, legacy demo compatibility, immutable reuse, unknown versus no versus zero, preserved unknown provenance, conflicting medicine sources, private-record exclusion, conservative surfacing, shared utility routing, separate rules and status independence.

Local browser review covers login, all three synthetic scenarios, the integrated detail page, existing controls and absence of console errors. HTTP smoke checks cover anonymous redirects and successful authenticated demo PDF generation. Production Supabase/RLS, real encrypted files and real upload writes are not exercised; their implementation was left unchanged. Local checks use locked dependencies with the available Node 24 runtime; CI should also run on the repository's declared Node 22 runtime.

No database migration, production deploy or production-data modification is part of this milestone.
