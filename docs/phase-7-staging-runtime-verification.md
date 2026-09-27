# Phase 7 — Staging Runtime Verification

## Objective

Verify in the confirmed non-production staging application that the Phase 6
audited catalog is read from the published catalog pointer and provides
volunteer decision support without creating autonomous eligibility decisions.

## Approved baseline

- Published revision: `ba27959a-f4f1-4999-8e17-a3c7b455e056`
- Source commit: `cbe87591c50b3cdea09acf8309a9396c79a1d040`
- Published entries: 430
- Strict publication validation: zero errors
- Canonical entry digest:
  `8823f53b2bbe00acefe47bb3fd71ed5d528810c2a5777435abed79c399ac75d9`

## Safety boundary

All audited programs remain `manualOnly`. Runtime routing is volunteer decision
support: it may surface a program for review but must not state that a patient
qualifies. Missing, conflicting, or unsupported facts must lead to manual
review or no route, not an eligibility assertion. No Phase 7 work may publish a
new catalog revision, modify production, add autonomous decisions, or add new
case-workflow tables.

## Staging runtime prerequisite

`readPublishedCatalog()` uses the staging database only when
`PCSN_CATALOG_ENABLED=true`; otherwise it deliberately falls back to the legacy
seed catalog. The flag must be configured only in the intended staging
deployment environment. Updating that external environment configuration may
trigger a deployment and requires explicit approval before it is changed.

The staging deployment URL, deployment provider project linkage, and authorized
synthetic patient/volunteer access are not stored in this repository. They must
be supplied or made available before hosted browser verification can start.

## Verification scope

1. Confirm the runtime resolves the approved published revision, not a draft,
   workbook, or seed fallback.
2. Exercise synthetic hospital, medication-affordability, Medicare/government
   exclusion, LIHEAP crisis, transportation, insufficient-information,
   hard-rule failure, and multiple-need scenarios.
3. Confirm `INS-008` drives the AVEO commercial-copay rule; generic insurance
   presence alone is insufficient, and Medicare/Medicaid do not match.
4. Confirm volunteer Assistance Plan wording, provenance, manual-review
   boundaries, source links, and hard-exclusion behavior.
5. Verify authorized program-case creation, immutable route snapshots,
   duplicate protection, and unauthorized/patient isolation behavior using
   synthetic records only.
6. Verify patient and volunteer regressions, including authentication, intake,
   save/resume, documents, billing entities, and draft/admin-content isolation.
7. Verify failure behavior for catalog unavailability, disabled flag, unknown
   facts, inactive questions, invalid IDs, and unauthorized access.

## Acceptance criteria

- Runtime reads the approved staging revision above.
- All synthetic scenarios have documented expected and actual safe behavior.
- Manual-only routes remain volunteer decision support.
- Existing snapshot and authorization protections pass.
- Browser-level staging checks, automated tests, typecheck, and production build
  pass.
- Production is never accessed or changed.

## Documentation reconciliation

`docs/assistance-plan-preview.md` describes program-case storage as a proposal,
but migrations 011 and 012 plus the program-case endpoint now persist immutable
route snapshots. That historical document should be updated only as part of a
separate documentation reconciliation after Phase 7 evidence is collected.
