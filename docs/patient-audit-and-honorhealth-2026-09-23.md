# Patient audit and HonorHealth implementation — September 23, 2026

Development changes only. No production deployment, database migration or catalog publication was performed.

## Existing architecture retained

Patient sign-in, owner-scoped drafts, ten-step intake, encrypted uploads, internal-document separation, notes, archives, patient dashboard and existing PDF export remain. Current demographics, hospital account/guarantor fields, household members, income totals and document categories are reused. The workbook remains an import/export template.

The prior patient-experience work adds autosave/save feedback, accessible fields/focus/error messages, mobile spacing, validation and submission confirmation with the estimated response time: “We aim to contact you within 5–7 business days.”

## Audit changes

- Derive patient age from birth date in the form, submission endpoint and volunteer display. Do not overwrite other members' ages with the patient's age.
- Start-new-request opens an explicit blank-request confirmation. Reset is an authenticated POST, not a side effect of visiting a link. Previously submitted requests remain. Old draft uploads remain stored but are excluded from automatic attachment to the new request. An old open tab is rejected if it tries to overwrite a newly started draft.
- Expanded final review covers requested needs, diagnosis/stage, treatment, facilities/accounts, provider, insurance, caregiver, household, income, documents, consent and financial follow-ups.
- Optional uploads are described as categories, not a list of missing requirements.
- Restored hospital account and guarantor fields; added optional bill entries with facility, balance, dates, collections, document kind, insurance processing and reuse of an uploaded document.
- Visible volunteer sign-out, archive confirmation, grammar/status formatting and blank-address fixes.
- Removed unrelated Mayo sections from the case display and PDF when no Mayo facility is selected.
- Added patient/clinic search, status/owner/due filters and program-work information to the volunteer queue. Oldest-first order remains.

## Possible premature submission

The existing draft API writes only `intake_drafts`. The cause of the reported Test Patient record was not reproduced or established; no production record was changed. The final action now has a distinct button identity, an explicit confirmation, a final-step guard and a required submission-intent marker checked before database access. Tests verify that a request lacking that intent cannot create a submission. This prevents silent final submission through that route; it is not a forensic finding about the earlier record.

## HonorHealth requirements and reuse

Source reviewed on September 23, 2026:

- [Official financial assistance page](https://www.honorhealth.com/patients-visitors/financial-assistance-policy)
- [Enhanced disclosure linked by that page](https://www.honorhealth.com/sites/default/files/2026-02/enhanced-financial-assistance-disclosure-english.pdf)
- [Current linked policy, effective April 17, 2026](https://www.honorhealth.com/sites/default/files/2026-06/financial-assistance-policy-english-26.pdf)

HonorHealth follow-ups distinguish spouse/dependents and financial relationships from mere co-residence. Existing member names are reused; optional birth dates and relationship-to-finances answers extend those member records. Structured income details retain source, frequency, amount and an explicit unknown/no/yes answer. Unknown does not mean no income.

Existing benefit-letter, proof-of-income, paystub, tax-return, W-2, bank-statement and medical-bill categories are reused. Uploads remain shared across program cases on the same request. The system does not claim that two uploaded files establish two statement months for every account. Dates, ownership, completeness and applicability still need volunteer review.

Medical expense screening excludes EOBs/estimates/denials, old or undated bills, duplicate document links and bills without completed insurance processing. It shows the patient-reported amount with linked evidence separately from a verified documented total. Zero or unknown annual income does not produce an infinite percentage. A value above 50% is a review flag only, never eligibility.

The administrator catalog has a “Prepare HonorHealth draft for review” action. It prepares a targeted route and deduplicated requirement references without saving or publishing automatically. It requires known HonorHealth treatment plus hospital assistance, has no automatic eligibility approval and retains unresolved rules for review. Patient/volunteer live routing still reads only published versions. The unrelated 368 unverified entries were not enabled or declared verified. They still require individual review.

## Storage changes

No new intake table is needed for this increment. Optional financial details are stored in the existing draft payload and submission JSON alongside the existing fields; household-member details extend the existing member JSON. Legacy submissions remain readable. This is a compatibility step, not a claim that the legacy `insurance_details` container is an ideal long-term universal-profile schema.

Migration `011_program_cases.sql` is prepared but not applied. It adds one program case per submission/program, separate external progress, assignment, urgency, next action, missing documents, contact/submission/follow-up/benefit-end dates, pinned catalog version and an atomic change history. Optimistic revision checks reject concurrent stale updates. Browser database roles have no access; authenticated volunteer server routes perform writes. `PCSN_PROGRAM_CASES_ENABLED=true` is required after migration to activate storage and queue details. Without it, the portal clearly says storage is not enabled.

Renewal-due filtering uses 30 days before a recorded benefit end date. No patient messages or scheduled outbound contact are sent automatically. Volunteers still record actual contacts and external decisions themselves.

## Verification and remaining release checks

Automated tests cover draft restoration/ownership, stale-tab reset protection, new-request document isolation, required final submission intent, dates/money, HonorHealth matching, unknown facts, non-equivalent documents, duplicate bill links, zero-income calculations, private program storage, history, concurrency and renewal timing. Database checks use an isolated in-memory PostgreSQL implementation, not the production database.

Browser checks used only a synthetic local patient: restored birthday produced age 66; selecting HonorHealth revealed financial follow-ups; expanded review and restored billing fields rendered; the financial-household view had no horizontal overflow at 390px. Previous local tests also covered 320px sections, sign-out/reopen/restoration and encrypted uploads.

Still required before a broad production rollout: physical iPhone/Safari and screen-reader checks; hosted authentication, final submission and upload end-to-end; application of the reviewed program-case migration and flag; administrator verification/publication of the HonorHealth draft; confirmation of actual household/evidence applicability; individual review of other disabled routes. Persisted program-case writes were verified through isolated database/API tests, not a live hosted browser session. No claim is made that the entire 70+ route catalog is ready.

Final local checks: 74 automated tests passed; clean Next.js production build passed; TypeScript checking and `git diff --check` passed. One incremental build hit a stale webpack artifact; moving the generated cache aside and rebuilding cleanly resolved it. Development preview is available at http://127.0.0.1:3117/intake with the isolated synthetic backend. This preview does not use production credentials.
