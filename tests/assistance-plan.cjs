// Run: node --test tests/assistance-plan.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    filename,
  );
const { adaptSubmission, known } = require("../lib/assistance/profile.ts");
const { buildPlan } = require("../lib/assistance/plan.ts");
const { exampleProfile } = require("../lib/assistance/examples.ts");
const { getDemoSubmissions } = require("../lib/demo/admin.ts");

test("utility need alone does not establish an Arizona potential match", () => {
  const p = exampleProfile("utilities");
  p.facts.state.evidence[0].value = "CA";
  assert.ok(buildPlan(p).filter(c => c.id !== "mayo-az").every(c => c.screening === "Review recommended"));
  p.facts.serviceAddress.state = "unknown";
  assert.ok(buildPlan(p).filter(c => c.id !== "mayo-az").every(c => c.screening === "More information needed"));
});

test("not applicable, unknown, false and zero remain separate", () => {
  const p = adaptSubmission({
    annual_income: 0,
    insurance_details: {
      hasMedicalInsurance: false,
      mayoFinancialAssistance: {
        otherIncomeDetails: "not applicable",
        pendingClaim: "unknown",
        employerInsuranceAvailable: "no",
      },
    },
  });
  assert.equal(p.facts.otherIncomeDetails.state, "not_applicable");
  assert.equal(p.facts.pendingClaim.state, "unknown");
  assert.equal(known(p, "hasMedicalInsurance"), "false");
  assert.equal(known(p, "annualIncome"), "0");
  assert.equal(known(p, "employerInsuranceAvailable"), "no");
  assert.equal(known(p, "otherIncomeDetails"), undefined);
});

test("Mayo potential match has a missing-document next action and independent workflow", () => {
  const card = buildPlan(exampleProfile("mayo"))[0];
  assert.equal(card.screening, "Potential match");
  assert.equal(card.workflow, "Collect/reuse documents");
  assert.equal(
    card.evidence.find((d) => d.id === "medical-bill").status,
    "Missing",
  );
  assert.match(card.next, /medical bill/);
  assert.equal(card.progress, "Not tracked in this preview");
});

test("one reviewed income upload can be reused across all three routes", () => {
  const cards = buildPlan(exampleProfile("utilities"));
  const income = cards.map((c) => c.evidence.find((d) => d.id === "income"));
  assert.ok(income.every((d) => d.status === "Available"));
  const sharedSource = income[1].sources[0];
  assert.ok(income.every((d) => d.sources.includes(sharedSource)));
  for (const card of cards.filter((c) => c.id !== "mayo-az")) {
    assert.equal(
      card.evidence.find((d) => d.id === "utility-bill").status,
      "Outdated",
    );
    assert.equal(
      card.evidence.find((d) => d.id === "identity").status,
      "Missing",
    );
    assert.match(card.next, /shutoff deadline/);
  }
});

test("review applies only to its program and requirement, never to an upload label", () => {
  const p = exampleProfile("utilities");
  p.documents.forEach((d) => {
    d.reviews = d.reviews?.filter((r) => r.programId === "mayo-az");
  });
  const cards = buildPlan(p);
  assert.equal(
    cards[0].evidence.find((d) => d.id === "income").status,
    "Available",
  );
  assert.equal(
    cards[1].evidence.find((d) => d.id === "income").status,
    "Needs review",
  );
  const legacy = adaptSubmission({
    assistance_type: "hospital",
    treatment_facilities: ["Mayo Clinic Arizona"],
    documents: [
      {
        document_type: "paystub",
        reviews: [
          {
            programId: "mayo-az",
            requirementId: "income",
            status: "available",
          },
        ],
      },
    ],
  });
  assert.equal(
    buildPlan(legacy)[0].evidence.find((d) => d.id === "income").status,
    "Needs review",
  );
});

test("all existing demo submissions remain compatible and unchanged", () => {
  const submissions = getDemoSubmissions();
  const before = JSON.stringify(submissions);
  for (const submission of submissions) {
    const p = adaptSubmission(submission);
    assert.equal(known(p, "firstName"), submission.patients.first_name);
    assert.deepEqual(buildPlan(p), []);
  }
  assert.equal(JSON.stringify(submissions), before);
});

test("legacy incomplete submissions are accepted without inventing needs, income or documents", () => {
  for (const value of [
    null,
    {},
    { patients: null, household_members: null, documents: null },
    { monthly_income: "", annual_income: "unknown", assistance_type: "both" },
  ]) {
    const p = adaptSubmission(value);
    assert.equal(p.facts.utilityNeed.state, "unknown");
    assert.equal(known(p, "monthlyIncome"), undefined);
    assert.deepEqual(buildPlan(p), []);
  }
});
test("Mayo requires both explicit Arizona facility and hospital need", () => {
  for (const input of [
    { treatment_facilities: ["Mayo Clinic Arizona"] },
    {
      treatment_facilities: ["Mayo Clinic Florida"],
      assistance_type: "hospital",
    },
    { clinic_name: "Mayo", assistance_type: "hospital" },
  ])
    assert.equal(buildPlan(adaptSubmission(input)).length, 0);
  assert.equal(
    buildPlan(
      adaptSubmission({
        treatment_facilities: ["Mayo Clinic Arizona"],
        assistance_type: "both",
      }),
    )[0].id,
    "mayo-az",
  );
});
test("facts retain provenance; unknown is not no and zero remains a reported zero", () => {
  const p = adaptSubmission({
    annual_income: 0,
    monthly_income: "",
    insurance_details: {
      mayoFinancialAssistance: {
        pendingClaim: "no",
        employerInsuranceAvailable: "not_sure",
      },
    },
  });
  assert.equal(known(p, "annualIncome"), "0");
  assert.equal(known(p, "monthlyIncome"), undefined);
  assert.equal(known(p, "pendingClaim"), "no");
  assert.equal(known(p, "employerInsuranceAvailable"), undefined);
  assert.deepEqual(p.facts.employerInsuranceAvailable.evidence, [
    {
      source:
        "submissions.insurance_details.mayoFinancialAssistance.employerInsuranceAvailable",
      value: "not_sure",
    },
  ]);
});
test("conflicting medicine copies are retained without choosing a winner", () => {
  const p = exampleProfile("mayo");
  assert.equal(p.facts.medications.state, "conflict");
  assert.equal(p.facts.medications.evidence.length, 2);
  assert.equal(known(p, "medications"), undefined);
  assert.equal(p.facts.annualIncome.state, "known"); // Different income periods are not falsely declared conflicting.
});
test("adapter is read-only and excludes SSN, private notes, internal files and bytes", () => {
  const input = {
    patients: { first_name: "Synthetic" },
    insurance_details: { socialSecurityNumber: { encrypted: "SECRET" } },
    admin_notes: [{ note: "SECRET" }],
    documents: [
      {
        document_type: "internal_record:medical_bill",
        original_filename: "SECRET",
      },
      { document_type: "tax_return", encrypted: "SECRET" },
    ],
  };
  const before = JSON.stringify(input);
  const p = adaptSubmission(input);
  assert.equal(JSON.stringify(input), before);
  assert.equal(JSON.stringify(p).includes("SECRET"), false);
  assert.deepEqual(
    p.documents.map((d) => d.type),
    ["tax_return"],
  );
});
test("two utility programs reuse one profile and one application, without sharing rules", () => {
  const p = exampleProfile("utilities");
  const cards = buildPlan(p).filter((c) => c.id !== "mayo-az");
  assert.deepEqual(
    cards.map((c) => c.id),
    ["liheap", "power-az"],
  );
  assert.equal(cards[0].applicationId, cards[1].applicationId);
  assert.equal(cards[0].url, cards[1].url);
  assert.deepEqual(cards[0].available, cards[1].available);
  assert.notDeepEqual(cards[0].reviews, cards[1].reviews);
  assert.ok(cards.every((c) => c.urgent && c.owner.includes("Volunteer")));
  for (const state of ["unknown", "conflict"]) {
    p.facts.utilityNeed.state = state;
    assert.equal(
      buildPlan(p).some((c) => c.id === "liheap"),
      false,
    );
  }
  p.facts.utilityNeed = {
    label: "Need",
    state: "known",
    evidence: [{ source: "synthetic", value: "no" }],
  };
  assert.equal(
    buildPlan(p).some((c) => c.id === "liheap"),
    false,
  );
});
test("overall approved status is never translated into screening or external progress", () => {
  const base = {
    assistance_type: "hospital",
    treatment_facilities: ["Mayo Clinic Arizona"],
  };
  const pending = buildPlan(adaptSubmission({ ...base, status: "pending" }));
  const approved = buildPlan(adaptSubmission({ ...base, status: "approved" }));
  assert.deepEqual(pending, approved);
  assert.equal(approved[0].progress, "Not tracked in this preview");
});
test("internal bill cannot satisfy document presence; uploaded bill still needs review", () => {
  const base = {
    assistance_type: "hospital",
    treatment_facilities: ["Mayo Clinic Arizona"],
  };
  const internal = buildPlan(
    adaptSubmission({
      ...base,
      documents: [{ document_type: "internal_record:medical_bill" }],
    }),
  )[0];
  const patient = buildPlan(
    adaptSubmission({
      ...base,
      documents: [{ document_type: "medical_bill" }],
    }),
  )[0];
  assert.equal(internal.evidence[0].uploaded, false);
  assert.equal(patient.evidence[0].uploaded, true);
  assert.match(patient.evidence[0].applicability, /Confirm/);
});

test('explicit utility need creates separate energy routes; missing and stale utility answers do not', () => {
 const base={patients:{state:'AZ'},insurance_details:{financialNeeds:['electricity_gas'],utilities:{utilityProvider:'Synthetic Utility',shutoff:'not_sure'}}};
 const profile=adaptSubmission(base);
 assert.equal(known(profile,'utilityNeed'),'yes');
 assert.equal(known(profile,'shutoff'),undefined);
 const cards=buildPlan(profile);
 assert.deepEqual(cards.map(c=>c.id),['liheap','power-az']);
 assert.equal(cards[0].applicationId,cards[1].applicationId);
 const unchecked=adaptSubmission({...base,insurance_details:{...base.insurance_details,financialNeeds:[]}});
 assert.equal(known(unchecked,'utilityNeed'),undefined);
 assert.equal(known(unchecked,'utilityProvider'),undefined);
 assert.equal(buildPlan(unchecked).length,0);
});
test('Mayo reuses patient names only for explicit self-applicants and preserves conflicts', () => {
 const base={patients:{first_name:'Synthetic',last_name:'Patient'},insurance_details:{mayoFinancialAssistance:{relationshipToPatient:['I am the patient']}}};
 assert.equal(known(adaptSubmission(base),'applicantFirstName'),'Synthetic');
 const other=structuredClone(base); other.insurance_details.mayoFinancialAssistance.relationshipToPatient=['Parent'];
 assert.equal(known(adaptSubmission(other),'applicantFirstName'),undefined);
 const conflict=structuredClone(base); conflict.insurance_details.mayoFinancialAssistance.applicantFirstName='Different';
 assert.equal(adaptSubmission(conflict).facts.applicantFirstName.state,'conflict');
});
