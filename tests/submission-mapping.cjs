const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");

function mapping() {
  let source = fs.readFileSync(path.join(root, "lib/intake/submission-mapping.ts"), "utf8");
  source = source.replace(/import type[^;]+;\n/, "").replace(/import \{ normalizeBillingEntity \}[^;]+;\n/, "const normalizeBillingEntity = (name) => ({ catalogId: name === 'Known Biller' ? 'known' : undefined, matchState: name === 'Known Biller' ? 'matched' : 'unmatched' });\n");
  const out = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} }; new Function("exports", "module", "Buffer", out)(module.exports, module, Buffer); return module.exports;
}
const fixture = {
  assistanceType: "both", patient: { firstName:"Ada",lastName:"Patient",dateOfBirth:"1980-01-02",socialSecurityNumber:"123456789",phone:"555",email:"ada@example.test",addressLine1:"1 Test",addressLine2:"",city:"Phoenix",state:"AZ",postalCode:"85001",employmentStatus:"employed",incomeSources:["work"] },
  representative:{hasRepresentative:true,firstName:"Rep",lastName:"One",relationship:"friend",phone:"2",email:"rep@example.test"}, diagnosis:{cancerType:"Type",cancerStage:"II",diagnosisDate:"2025-04",treatmentPlan:"fallback",treatments:[{name:"Chemo",startDate:"2025-05"}],medications:["Drug"],pharmacyName:"Pharmacy"}, provider:{clinicName:"Clinic",providerName:"Dr",npi:"",phone:"",fax:"",addressLine1:"",addressLine2:"",city:"",state:"",postalCode:""},
  hospital:{accountNumber:"acct",guarantorNumber:"guar",treatmentFacilities:["Facility"],billingEntities:[{name:"Known Biller",accountNumber:"bill",billType:"professional",matchState:"matched"}],mayoFinancialAssistance:{relationshipToPatient:["I am the patient"],applicantFirstName:"",applicantMiddleName:"",applicantLastName:"",responsiblePartyBirthDate:"",claimedOnAnotherTaxReturn:"no",assistanceNeed:"need",appliedForGovernmentAssistance:"no",pendingClaim:"no",employerInsuranceAvailable:"no",hasSpouse:false,dependentsDetails:"none",otherIncomeDetails:"none",medicalDebtDetails:"none",certificationAccepted:true}},
  insurance:{hasInsurance:true,hasMedicalInsurance:true,hasPharmacyInsurance:false,hasMedicare:false,hasMedicaid:false,coverageDenied:"no",eobAvailable:false}, household:{financialNeeds:["electricity_gas"],utilities:{utilityProvider:"Power"},monthlyIncome:100,annualIncome:1200,householdSize:1,employmentStatus:"employed",members:[{name:"Ada",relationship:"Patient",age:45,isAdult:true,incomeSources:["work"]}]}, consent:{volunteerAccessConsent:true,releaseMedicalFinancial:true,contactPermission:true,noGuaranteeAcknowledgment:true,signature:"Ada",signedAt:"2025-05-01T00:00:00.000Z"}
};
test("canonical mapping preserves every persisted field for comprehensive synthetic intake", () => {
  const { mapIntakeSubmission } = mapping();
  const value = mapIntakeSubmission(fixture, "user-1", () => ({ encrypted: Buffer.from("cipher"), iv:"iv", tag:"tag" }));
  assert.deepEqual(value.patient, { user_id:"user-1",first_name:"Ada",last_name:"Patient",date_of_birth:"1980-01-02",phone:"555",email:"ada@example.test",address_line_1:"1 Test",address_line_2:null,city:"Phoenix",state:"AZ",postal_code:"85001" });
  assert.equal(value.submission.diagnosis_date, "2025-04-01"); assert.equal(value.submission.treatment_plan,"Chemo (2025-05)"); assert.equal(value.submission.treatment_start_date,"2025-05-01"); assert.equal(value.submission.provider_fax,null); assert.equal(value.submission.insurance_details.socialSecurityNumber.last4,"6789"); assert.equal(value.submission.insurance_details.mayoFinancialAssistance.applicantFirstName,"Ada"); assert.deepEqual(value.submission.treatment_facilities,["Facility"]); assert.equal(value.submission.billing_entities[0].catalogId,"known");
});
test("canonical mapping preserves optional nulls and empty arrays", () => {
  const { mapIntakeSubmission } = mapping(); const value = mapIntakeSubmission({ ...fixture, assistanceType:"hospital", patient:{...fixture.patient,socialSecurityNumber:""}, diagnosis:{...fixture.diagnosis,treatments:[],medications:[]}, hospital:{...fixture.hospital,treatmentFacilities:[],billingEntities:[],mayoFinancialAssistance:undefined} }, "user-2", () => { throw new Error("must not encrypt"); });
  assert.equal(value.submission.treatment_start_date,null); assert.equal(value.submission.medication_requested,null); assert.deepEqual(value.submission.treatment_facilities,[]); assert.equal(value.submission.insurance_details.socialSecurityNumber,undefined);
});
