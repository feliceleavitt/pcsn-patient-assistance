"use client";

import { financialNeedOptions } from "@/lib/intake/needs";
import { missingIntakeRequirements } from "@/lib/intake/requirements";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AutocompleteField } from "@/components/ui/AutocompleteField";
import { TextAreaField, TextField } from "@/components/ui/Field";

import { MayoFinancialAssistanceSection } from "@/components/intake/MayoFinancialAssistanceSection";
import type { IntakePayload, MayoFinancialAssistance } from "@/lib/types";

type DocumentType =
  | "utility_bill"
  | "shutoff_notice"
  | "proof_of_residence"
  | "photo_id"
  | "medical_bill"
  | "prior_authorization_denial"
  | "prior_authorization_appeal"
  | "appeal_denial"
  | "eob"
  | "other_insurance_denial_letter"
  | "proof_of_income"
  | "tax_return"
  | "w2"
  | "paystub"
  | "benefit_letter"
  | "bank_statement"
  | "insurance_card_front"
  | "insurance_card_back"
  | "prescription_or_medication_list"
  | "other_documents";

const steps = [
  "Program",
  "Patient",
  "Caregiver",
  "Treatment",
  "Provider",
  "Insurance",
  "Household",
  "Documents",
  "Consent",
  "Review",
];

const documentLabels: Record<DocumentType, string> = {
  utility_bill: "Current utility bill", shutoff_notice: "Utility shutoff notice", proof_of_residence: "Proof of residence",
  insurance_card_front: "Insurance card, front",
  insurance_card_back: "Insurance card, back",
  photo_id: "Photo ID",
  medical_bill: "Medical bill",
  prior_authorization_denial:
    "Prior authorization denial (a notice that insurance would not cover the request)",
  prior_authorization_appeal:
    "Prior authorization appeal (a request to review the insurance decision)",
  appeal_denial: "Appeal denial",
  eob: "Explanation of Benefits/EOB (a summary from your insurance)",
  other_insurance_denial_letter: "Other insurance denial letter",
  w2: "Most recent W2",
  tax_return: "Most recent tax return",
  paystub: "Two most recent pay stubs",
  bank_statement: "Two most recent bank statements",
  benefit_letter:
    "Social Security, disability, unemployment, or benefit award letter",
  proof_of_income: "Proof of household income",
  prescription_or_medication_list: "Prescription or medication list",
  other_documents: "Other documents",
};

const baseDocumentTypes: DocumentType[] = [
  "insurance_card_front",
  "insurance_card_back",
  "photo_id",
  "medical_bill",
  "w2",
  "tax_return",
  "paystub",
  "bank_statement",
  "benefit_letter",
  "proof_of_income",
  "prescription_or_medication_list",
  "other_documents",
];

const cancerTypes = [
  "Acute lymphoblastic leukemia (ALL)",
  "Acute myeloid leukemia (AML)",
  "Adrenocortical carcinoma",
  "AIDS-related cancers",
  "AIDS-related lymphoma",
  "Anal cancer",
  "Appendix cancer",
  "Basal cell skin cancer",
  "Bile duct cancer",
  "Bladder cancer",
  "Bone cancer",
  "Brain cancer",
  "Brain tumor",
  "Breast cancer",
  "Burkitt lymphoma",
  "Carcinoma of unknown primary",
  "Cervical cancer",
  "Childhood cancer",
  "Cholangiocarcinoma",
  "Chordoma",
  "Chronic lymphocytic leukemia (CLL)",
  "Chronic myeloid leukemia (CML)",
  "Colon cancer",
  "Colorectal cancer",
  "Cutaneous T-cell lymphoma",
  "Ductal carcinoma in situ (DCIS)",
  "Endocrine cancer",
  "Endometrial cancer",
  "Esophageal cancer",
  "Ewing sarcoma",
  "Eye cancer",
  "Fallopian tube cancer",
  "Gallbladder cancer",
  "Gastric cancer",
  "Gastrointestinal neuroendocrine tumor",
  "Gastrointestinal stromal tumor (GIST)",
  "Germ cell tumor",
  "Gestational trophoblastic disease",
  "Glioblastoma",
  "Glioma",
  "Hairy cell leukemia",
  "Head and neck cancer",
  "Hepatocellular carcinoma",
  "Hodgkin lymphoma",
  "Hypopharyngeal cancer",
  "Intraocular melanoma",
  "Kaposi sarcoma",
  "Kidney cancer",
  "Langerhans cell histiocytosis",
  "Laryngeal cancer",
  "Leukemia",
  "Lip and oral cavity cancer",
  "Liver cancer",
  "Lung cancer",
  "Lymphoma",
  "Male breast cancer",
  "Melanoma",
  "Merkel cell carcinoma",
  "Mesothelioma",
  "Metastatic cancer",
  "Mouth cancer",
  "Multiple endocrine neoplasia",
  "Multiple myeloma",
  "Myelodysplastic syndrome (MDS)",
  "Myeloproliferative neoplasm (MPN)",
  "Nasal cavity and paranasal sinus cancer",
  "Nasopharyngeal cancer",
  "Neuroblastoma",
  "Neuroendocrine tumor",
  "Non-Hodgkin lymphoma",
  "Non-small cell lung cancer",
  "Oral cancer",
  "Oropharyngeal cancer",
  "Osteosarcoma",
  "Ovarian cancer",
  "Pancreatic neuroendocrine tumor",
  "Pancreatic cancer",
  "Paraganglioma",
  "Parathyroid cancer",
  "Penile cancer",
  "Pharyngeal cancer",
  "Pheochromocytoma",
  "Pituitary tumor",
  "Plasma cell neoplasm",
  "Primary CNS lymphoma",
  "Primary peritoneal cancer",
  "Prostate cancer",
  "Rare cancer",
  "Rectal cancer",
  "Renal cell cancer",
  "Retinoblastoma",
  "Rhabdomyosarcoma",
  "Salivary gland cancer",
  "Sarcoma",
  "Sezary syndrome",
  "Skin cancer",
  "Small cell lung cancer",
  "Small intestine cancer",
  "Soft tissue sarcoma",
  "Squamous cell skin cancer",
  "Stomach cancer",
  "Testicular cancer",
  "Throat cancer",
  "Thymoma and thymic carcinoma",
  "Thyroid cancer",
  "Ureter and renal pelvis cancer",
  "Urethral cancer",
  "Uterine cancer",
  "Uterine sarcoma",
  "Vaginal cancer",
  "Vascular tumor",
  "Vulvar cancer",
  "Wilms tumor",
  "Other cancer",
  "Not sure",
];



const employmentOptions = [
  "Employed full-time",
  "Employed part-time",
  "Self-employed",
  "Unemployed",
  "Retired",
  "Disabled",
  "Receiving SSDI (Social Security Disability Insurance)",
  "Student",
  "Homemaker/caregiver",
  "Other",
  "Prefer not to say",
];

const fieldStepLabels = [
  "Program",
  "Patient",
  "Caregiver",
  "Treatment",
  "Provider",
  "Insurance",
  "Household",
  "Documents",
  "Consent",
] as const;

const emptyMayoApplication: MayoFinancialAssistance = {
  relationshipToPatient: ["I am the patient"], applicantFirstName: "", applicantMiddleName: "", applicantLastName: "", responsiblePartyBirthDate: "",
  claimedOnAnotherTaxReturn: "", assistanceNeed: "", appliedForGovernmentAssistance: "", pendingClaim: "", employerInsuranceAvailable: "",
  hasSpouse: false, dependentsDetails: "", otherIncomeDetails: "", medicalDebtDetails: "", certificationAccepted: false,
};

const initialState: IntakePayload = {
  assistanceType: "manufacturer",
  patient: {
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    socialSecurityNumber: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    employmentStatus: "",
    incomeSources: [""],
  },
  representative: {
    hasRepresentative: false,
    firstName: "",
    lastName: "",
    relationship: "",
    phone: "",
    email: "",
  },
  diagnosis: {
    cancerType: "",
    cancerStage: "",
    diagnosisDate: "",
    treatmentPlan: "",
    treatmentStartDate: "",
    medicationRequested: "",
    treatments: [{ name: "", startDate: "" }],
    medications: [""],
    pharmacyName: "",
  },
  provider: {
    clinicName: "",
    providerName: "",
    npi: "",
    phone: "",
    fax: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
  },
  hospital: {
    accountNumber: "",
    guarantorNumber: "",
    treatmentFacilities: [],
    mayoFinancialAssistance: emptyMayoApplication,
  },
  insurance: {
    hasInsurance: true,
    hasMedicalInsurance: true,
    medicalCarrier: "",
    medicalPolicyId: "",
    medicalGroupId: "",
    medicalMemberId: "",
    hasPharmacyInsurance: false,
    pharmacyCarrier: "",
    pharmacyPolicyId: "",
    pharmacyGroupId: "",
    pharmacyMemberId: "",
    hasMedicare: false,
    hasMedicaid: false,
    priorAuthorizationStatus: "",
    appealStatus: "",
    coverageDenied: "not_sure",
    denialDetails: "",
    eobAvailable: false,
  },
  household: {
    monthlyIncome: 0,
    annualIncome: 0,
    householdSize: 1,
    employmentStatus: "",
    members: [
      {
        name: "",
        relationship: "Patient",
        age: 0,
        isAdult: true,
        employmentStatus: "",
        incomeSources: [""],
      },
    ],
  },
  consent: {
    volunteerAccessConsent: false,
    releaseMedicalFinancial: false,
    contactPermission: false,
    noGuaranteeAcknowledgment: false,
    signature: "",
    signedAt: "",
  },
};

type IntakeFormProps = {
  catalogFacilities: string[];
  catalogDrugs: string[];
  catalogQuestions: Record<string,{name:string;help:string}>;
  catalogDocumentHelp: Record<string,string>;
  initialDraft?: IntakePayload | null;
  initialStep?: number;
  draftUpdatedAt?: string | null;
};

export function IntakeForm({ catalogFacilities, catalogDrugs, catalogQuestions, catalogDocumentHelp, initialDraft, initialStep = 0, draftUpdatedAt }: IntakeFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(() => Math.min(Math.max(initialStep, 0), steps.length - 1));
  const [form, setForm] = useState<IntakePayload>(() => initialDraft ? {
    ...initialState, ...initialDraft,
    patient: { ...initialState.patient, ...initialDraft.patient, socialSecurityNumber: "" },
    diagnosis: { ...initialState.diagnosis, ...initialDraft.diagnosis },
    provider: { ...initialState.provider, ...initialDraft.provider },
    hospital: { ...initialState.hospital, ...initialDraft.hospital },
    insurance: { ...initialState.insurance, ...initialDraft.insurance },
    household: { ...initialState.household, ...initialDraft.household },
    consent: { ...initialState.consent, ...initialDraft.consent },
  } : initialState);
  const [savedDocuments, setSavedDocuments] = useState<Array<{id:string;original_filename:string;document_type:string}>>([]);
  const [uploading, setUploading] = useState(false);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [documentError, setDocumentError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/intake/documents").then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (active) { setSavedDocuments(result.documents); setDocumentsLoaded(true); }
    }).catch(() => { if (active) setDocumentError("Saved documents could not be loaded. Reload before submitting so no uploads are missed."); });
    return () => { active = false; };
  }, []);
  async function removeDocument(id: string) {
    setUploading(true); setDocumentError("");
    try {
      const response = await fetch(`/api/intake/documents?id=${encodeURIComponent(id)}`, {method:"DELETE"});
      if (!response.ok) throw new Error("Could not remove the document. Please reload and try again.");
      setSavedDocuments(current => current.filter(document => document.id !== id));
    } catch (error) { setDocumentError(error instanceof Error ? error.message : "Unable to remove document."); }
    finally { setUploading(false); }
  }
  async function uploadDocuments(documentType: DocumentType, selected: File[]) {
    setUploading(true); setDocumentError("");
    try {
      if (!(await saveDraft())) throw new Error("Save your permission and answers before uploading.");
      if (selected.some(file => file.size > 4194304)) throw new Error("Please choose files smaller than 4 MB each.");
      for (const file of selected) {
        const body = new FormData(); body.append("file", file); body.append("documentType", documentType);
        const response = await fetch("/api/intake/documents", {method:"POST", body});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Upload failed. Please retry.");
        setSavedDocuments(current => [...current, result.document]);
      }
    } catch (error) { setDocumentError(error instanceof Error ? error.message : "Upload failed. Please retry."); }
    finally { setUploading(false); }
  }
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [draftMessage, setDraftMessage] = useState(
    draftUpdatedAt
      ? `Saved progress loaded from ${new Date(draftUpdatedAt).toLocaleString()}.`
      : "",
  );
  const isManufacturer =
    form.assistanceType === "manufacturer" || form.assistanceType === "both";
  const isHospital =
    form.assistanceType === "hospital" || form.assistanceType === "both";
  const needsMayoApplication = isHospital && (form.hospital.treatmentFacilities ?? []).includes("Mayo Clinic Arizona");
  const visibleDocumentTypes = useMemo<DocumentType[]>(
    () =>
      [
        ...baseDocumentTypes,
        ...(form.household.financialNeeds?.includes("electricity_gas") ? (["utility_bill", "shutoff_notice", "proof_of_residence"] as DocumentType[]) : []),
        ...(form.insurance.coverageDenied === "yes"
          ? ([
              "prior_authorization_denial",
              "prior_authorization_appeal",
              "appeal_denial",
              "eob",
              "other_insurance_denial_letter",
            ] as DocumentType[])
          : []),
      ].filter((value, index, all) => all.indexOf(value) === index),
    [form.insurance.coverageDenied, form.household.financialNeeds],
  );
  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  function updateSection<T extends Exclude<keyof IntakePayload, "assistanceType">>(
    section: T,
    value: Partial<IntakePayload[T]>,
  ) {
    setForm((current) => {
      const currentSection = current[section] as Record<string, unknown>;
      return {
        ...current,
        [section]: { ...currentSection, ...value },
      };
    });
  }

  function updateMember(index: number, value: Partial<IntakePayload["household"]["members"][number]>) {
    const members = [...form.household.members];
    members[index] = { ...members[index], ...value };
    updateSection("household", { members, householdSize: members.length });
  }

  function updateIncomeSource(memberIndex: number, sourceIndex: number, value: string) {
    const member = form.household.members[memberIndex];
    const incomeSources = [...member.incomeSources];
    incomeSources[sourceIndex] = value;
    updateMember(memberIndex, { incomeSources });
  }

  function updatePatientIncomeSource(sourceIndex: number, value: string) {
    const incomeSources = [...form.patient.incomeSources];
    incomeSources[sourceIndex] = value;
    updateSection("patient", { incomeSources });
  }

  function addMember() {
    updateSection("household", {
      members: [
        ...form.household.members,
        {
          name: "",
          relationship: "",
          age: 0,
          isAdult: false,
          employmentStatus: "",
          incomeSources: [""],
        },
      ],
      householdSize: form.household.members.length + 1,
    });
  }

  function removeMember(index: number) {
    const members = form.household.members.filter((_, itemIndex) => itemIndex !== index);
    updateSection("household", {
      members,
      householdSize: Math.max(members.length, 1),
    });
  }

  function toggleTreatmentFacility(facility: string, checked: boolean) {
    const selected = form.hospital.treatmentFacilities ?? [];
    updateSection("hospital", {
      treatmentFacilities: checked
        ? [...new Set([...selected, facility])]
        : selected.filter((item) => item !== facility),
    });
  }

  function updateTreatment(index: number, value: { name?: string; startDate?: string }) {
    const treatments = [...(form.diagnosis.treatments ?? [])];
    treatments[index] = { ...treatments[index], ...value };
    updateSection("diagnosis", { treatments });
  }

  function updateMayoApplication(value: Partial<MayoFinancialAssistance>) {
    updateSection("hospital", { mayoFinancialAssistance: { ...(form.hospital.mayoFinancialAssistance ?? emptyMayoApplication), ...value } });
  }

  function updateMedication(index: number, value: string) {
    const medications = [...(form.diagnosis.medications ?? [])];
    medications[index] = value;
    updateSection("diagnosis", { medications });
  }

  function hasText(value: string | undefined) {
    return Boolean(value?.trim());
  }

  function missingRequiredItems() { return missingIntakeRequirements(form, isManufacturer, needsMayoApplication); }

  async function saveDraft(resumeStep = step, quiet = false) {
    if (!form.consent.volunteerAccessConsent) {
      setSubmitError(
        "Please consent to volunteer access and contact before saving your application.",
      );
      return;
    }

    setSavingDraft(true);
    setSubmitError("");
    if (!quiet) setDraftMessage("");

    try {
      const response = await fetch("/api/intake/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: { ...form, _resumeStep: resumeStep } }),
      });

      const result = (await response.json().catch(() => null)) as
        | { updatedAt?: string; error?: string }
        | null;

      if (!response.ok) {
        setDraftMessage(
          result?.error ??
            "We could not save your progress. Please try again.",
        );
        return;
      }

      const savedAt = result?.updatedAt
        ? new Date(result.updatedAt).toLocaleString()
        : new Date().toLocaleString();
      setDraftMessage(`Progress saved ${savedAt}. You can sign back in later to continue.`);
      return true;
    } catch {
      setDraftMessage(
        "We could not save your progress. Please check your connection and try again.",
      );
    } finally {
      setSavingDraft(false);
    }
  }

  async function continueToNextStep() {
    const nextStep = Math.min(step + 1, steps.length - 1);
    const missing = missingRequiredItems().filter(([section]) => section === step || section === 0);
    if (missing.length) {
      setSubmitError(missing.map(([, , message]) => message).join(" "));
      return;
    }
    if (await saveDraft(nextStep, true)) setStep(nextStep);
  }

  async function submit() {
    if (uploading || !documentsLoaded) { setSubmitError("Please wait for saved documents to finish loading or uploading."); return; }
    const missing = missingRequiredItems()[0];
    if (missing) {
      const [missingStep, , message] = missing;
      setStep(missingStep);
      setSubmitError(`${message} Please complete the ${fieldStepLabels[missingStep]} section and try again.`);
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const householdMembers = form.household.members
        .filter((member) => {
          if (member.relationship === "Patient") return true;
          return (
            hasText(member.name) ||
            hasText(member.relationship) ||
            member.age > 0 ||
            hasText(member.employmentStatus) ||
            member.incomeSources.some(hasText)
          );
        })
        .map((member) =>
          member.relationship === "Patient"
          ? {
              ...member,
              name: `${form.patient.firstName} ${form.patient.lastName}`.trim(),
              employmentStatus: form.patient.employmentStatus,
              incomeSources: form.patient.incomeSources,
          }
          : member,
        );

      const incompleteMemberIndex = householdMembers.findIndex(
        (member) =>
          !hasText(member.name) ||
          !hasText(member.relationship) ||
          member.age < 0,
      );
      if (incompleteMemberIndex >= 0) {
        setStep(6);
        setSubmitError(
          "Please complete each household member's name and relationship, or remove blank household members.",
        );
        return;
      }

      const body = new FormData();
      body.append(
        "payload",
        JSON.stringify({
          ...form,
          household: {
            ...form.household,
            employmentStatus: form.patient.employmentStatus,
            householdSize: Math.max(
              form.household.householdSize,
              householdMembers.length,
            ),
            members: householdMembers,
          },
          consent: {
            ...form.consent,
            signedAt: new Date().toISOString(),
          },
        }),
      );
      body.append("draftDocumentIds", JSON.stringify(savedDocuments.map(document => document.id)));
      const response = await fetch("/api/intake", { method: "POST", body });

      if (response.ok) {
        router.replace("/intake/confirmation");
        return;
      }

      const result = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setSubmitError(
        result?.error ??
          "We could not submit your application. Please check the form and try again.",
      );
    } catch {
      setSubmitError(
        "We could not submit your application. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-md border border-pine/20 bg-white p-4 text-sm leading-6 text-slate-700 shadow-soft">
        <p>
          You can save this application and come back later from the same
          account. Documents are encrypted and saved as soon as each upload succeeds. Wait for the saved confirmation before leaving.
        </p>
        <p className="mt-2">
          <span className="font-semibold text-coral">*</span> Required field
        </p>
        {draftMessage ? (
          <p className="mt-2 font-semibold text-pine">{draftMessage}</p>
        ) : null}
      </div>

      <details className="rounded-md border border-slate-200 bg-white p-4" open={step === 9}>
        <summary className="cursor-pointer font-semibold">Application checklist · {missingRequiredItems().length} required items remaining</summary>
        <ul className="mt-3 grid gap-2">{steps.slice(0, 9).map((name, index) => {
          const missing = missingRequiredItems().filter(([section]) => section === index);
          return <li key={name}><button type="button" className="text-left text-sm underline" onClick={() => { setStep(index); setSubmitError(""); }}>{name}: {missing.length ? `${missing.length} items to finish` : "Required items complete"}</button>{missing.length ? <ul className="ml-5 list-disc text-sm text-slate-600">{missing.map(([, , message]) => <li key={message}>{message}</li>)}</ul> : null}</li>;
        })}</ul>
      </details>

      <div className="grid gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">{steps[step]}</span>
          <span className="text-slate-500">
            Step {step + 1} of {steps.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-mist">
          <div className="h-full bg-pine transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step === 9 ? <section className="grid gap-3 rounded-md bg-white p-5"><h2 className="text-xl font-semibold">Review before sending</h2><p>Check your answers using the section links above. Your request will be shared with PCSN volunteers when you submit.</p><dl className="grid gap-2 text-sm"><div><dt className="font-semibold">Patient</dt><dd>{form.patient.firstName} {form.patient.lastName}</dd></div><div><dt className="font-semibold">Contact</dt><dd>{form.patient.email} · {form.patient.phone}</dd></div><div><dt className="font-semibold">Treatment facilities</dt><dd>{form.hospital.treatmentFacilities?.join(", ") || "None entered"}</dd></div><div><dt className="font-semibold">Medications</dt><dd>{form.diagnosis.medications?.filter(Boolean).join(", ") || "None entered"}</dd></div><div><dt className="font-semibold">Selected documents</dt><dd>{savedDocuments.length} saved files will be included with this request.</dd></div></dl><p className="text-sm">Submitting a request does not guarantee eligibility or funding.</p></section> : null}

      {step === 0 ? (
        <div className="grid gap-3">
          <fieldset className="grid gap-3 rounded-md bg-white p-4"><legend className="font-semibold">Are you having trouble paying for any of these right now?</legend><p className="text-sm">Choose all that apply. It is okay if you are not sure yet.</p>
            {financialNeedOptions.map(([id,label]) => <label key={id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.household.financialNeeds?.includes(id) ?? false} onChange={event => updateSection("household", {financialNeeds:event.target.checked ? [...(form.household.financialNeeds ?? []),id] : (form.household.financialNeeds ?? []).filter(value => value !== id)})}/>{label}</label>)}
          </fieldset>
          {form.household.financialNeeds?.includes("electricity_gas") ? <fieldset className="grid gap-3 rounded-md bg-white p-4"><legend className="font-semibold">Electricity or gas</legend><p className="text-sm">Leave details blank if you do not know them. A volunteer can help.</p>
            {([["utilityProvider","Utility company"],["accountHolder","Name on the utility account"],["serviceAddress","Address where you receive service"]] as const).map(([key,label]) => <TextField key={key} label={label} value={form.household.utilities?.[key] ?? ""} help="Look at the first page of a recent utility bill, or call your utility company and ask for a copy. You can upload the bill in the Documents section." onChange={event => updateSection("household",{utilities:{...form.household.utilities,[key]:event.target.value}})}/>)}
            {([["shutoff","Is your service off, or have you received a shutoff notice?"],["utilitiesInRent","Are utilities included in your rent?"]] as const).map(([key,label]) => <label key={key} className="grid gap-2 text-sm">{label}<select className="h-11 rounded border p-2" value={form.household.utilities?.[key] ?? ""} onChange={event => updateSection("household",{utilities:{...form.household.utilities,[key]:event.target.value}})}><option value="">Choose an answer</option><option value="yes">Yes</option><option value="no">No</option><option value="not_sure">I am not sure</option></select></label>)}
          </fieldset> : null}
          <p className="font-semibold">For medical bills and medications, which kind of help would you like?</p>
          {[
            ["manufacturer", "Help paying for medications"],
            ["hospital", "Help with medical bills"],
            ["both", "Both medication costs and medical bills"],
          ].map(([value, label]) => (
            <label key={value} className="flex items-center gap-3 rounded-md border border-slate-300 bg-white p-4 text-sm">
              <input
                type="radio"
                name="assistanceType"
                checked={form.assistanceType === value}
                onChange={() => setForm((current) => ({ ...current, assistanceType: value as IntakePayload["assistanceType"] }))}
              />
              {label}
            </label>
          ))}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <TextField required label={catalogQuestions["firstName"]?.name ?? "First name"} help={catalogQuestions["firstName"]?.help} value={form.patient.firstName} onChange={(e) => updateSection("patient", { firstName: e.target.value })} />
          <TextField required label={catalogQuestions["lastName"]?.name ?? "Last name"} help={catalogQuestions["lastName"]?.help} value={form.patient.lastName} onChange={(e) => updateSection("patient", { lastName: e.target.value })} />
          <TextField required label={catalogQuestions["dob"]?.name ?? "Date of birth"} help={catalogQuestions["dob"]?.help} type="date" value={form.patient.dateOfBirth} onChange={(e) => updateSection("patient", { dateOfBirth: e.target.value })} />
          <p className="text-sm text-slate-600 md:col-span-2">You do not need to provide a Social Security number to request help from PCSN. If a particular program needs it later, a volunteer will explain why and how to provide it securely.</p>
          <TextField required label={catalogQuestions["phone"]?.name ?? "Phone"} help={catalogQuestions["phone"]?.help} value={form.patient.phone} onChange={(e) => updateSection("patient", { phone: e.target.value })} />
          <TextField required label={catalogQuestions["email"]?.name ?? "Email"} help={catalogQuestions["email"]?.help} type="email" value={form.patient.email} onChange={(e) => updateSection("patient", { email: e.target.value })} />
          <TextField required label={catalogQuestions["address"]?.name ?? "Address line 1"} help={catalogQuestions["address"]?.help} value={form.patient.addressLine1} onChange={(e) => updateSection("patient", { addressLine1: e.target.value })} />
          <TextField label="Address line 2" value={form.patient.addressLine2} onChange={(e) => updateSection("patient", { addressLine2: e.target.value })} />
          <TextField required label={catalogQuestions["city"]?.name ?? "City"} help={catalogQuestions["city"]?.help} value={form.patient.city} onChange={(e) => updateSection("patient", { city: e.target.value })} />
          <TextField required label={catalogQuestions["state"]?.name ?? "State"} help={catalogQuestions["state"]?.help} value={form.patient.state} onChange={(e) => updateSection("patient", { state: e.target.value })} />
          <TextField required label={catalogQuestions["zip"]?.name ?? "Postal code"} help={catalogQuestions["zip"]?.help} value={form.patient.postalCode} onChange={(e) => updateSection("patient", { postalCode: e.target.value })} />
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-ink">
              Employment status<span className="ml-1 text-coral">*</span>
            </span>
            <select
              className="h-11 rounded-md border border-slate-300 bg-white px-3"
              value={form.patient.employmentStatus}
              onChange={(e) =>
                updateSection("patient", { employmentStatus: e.target.value })
              }
            >
              <option value="">Select one</option>
              {employmentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 md:col-span-2">
            <span className="text-sm font-medium">Patient income sources</span>
            {form.patient.incomeSources.map((source, sourceIndex) => (
              <TextField
                key={sourceIndex}
                label={`Income source ${sourceIndex + 1}`}
                value={source}
                onChange={(e) =>
                  updatePatientIncomeSource(sourceIndex, e.target.value)
                }
              />
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                updateSection("patient", {
                  incomeSources: [...form.patient.incomeSources, ""],
                })
              }
            >
              <Plus size={16} />
              Add income source
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4">
          <label className="flex items-center gap-3 rounded-md border border-slate-300 bg-white p-4 text-sm">
            <input type="checkbox" checked={form.representative.hasRepresentative} onChange={(e) => updateSection("representative", { hasRepresentative: e.target.checked })} />
            Patient has a caregiver or authorized representative
          </label>
          {form.representative.hasRepresentative ? (
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Representative first name" value={form.representative.firstName} onChange={(e) => updateSection("representative", { firstName: e.target.value })} />
              <TextField label="Representative last name" value={form.representative.lastName} onChange={(e) => updateSection("representative", { lastName: e.target.value })} />
              <TextField label="Relationship" value={form.representative.relationship} onChange={(e) => updateSection("representative", { relationship: e.target.value })} />
              <TextField label="Phone" value={form.representative.phone} onChange={(e) => updateSection("representative", { phone: e.target.value })} />
              <TextField label="Email" type="email" value={form.representative.email} onChange={(e) => updateSection("representative", { email: e.target.value })} />
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <AutocompleteField required label="Cancer type" value={form.diagnosis.cancerType} options={cancerTypes} onChange={(value) => updateSection("diagnosis", { cancerType: value })} />
          <label className="grid gap-2 text-sm"><span className="font-medium text-ink">Cancer stage</span><select className="h-11 rounded-md border border-slate-300 bg-white px-3" value={form.diagnosis.cancerStage ?? ""} onChange={(e) => updateSection("diagnosis", { cancerStage: e.target.value })}><option value="">Select if known</option>{["Stage 0","Stage I","Stage II","Stage III","Stage IV","Recurrent","Not sure"].map((value) => <option key={value}>{value}</option>)}</select></label>
          <TextField required label="Approximate diagnosis month" type="month" value={form.diagnosis.diagnosisDate} onChange={(e) => updateSection("diagnosis", { diagnosisDate: e.target.value })} />
          <div className="grid gap-3 md:col-span-2"><h3 className="font-semibold">Treatments</h3><p className="text-sm text-slate-600">Add each treatment separately. The month can be approximate.</p>{(form.diagnosis.treatments ?? []).map((treatment, index) => <div key={index} className="grid gap-3 rounded-md border border-slate-200 p-4 md:grid-cols-2"><TextField label={`Treatment ${index + 1}`} placeholder="Example: chemotherapy, radiation, surgery" value={treatment.name} onChange={(e) => updateTreatment(index, { name: e.target.value })} /><TextField label="Approximate start month" type="month" value={treatment.startDate ?? ""} onChange={(e) => updateTreatment(index, { startDate: e.target.value })} /></div>)}<Button variant="secondary" onClick={() => updateSection("diagnosis", { treatments: [...(form.diagnosis.treatments ?? []), { name: "", startDate: "" }] })}><Plus size={16} />Add treatment</Button></div>
          {isManufacturer ? <div className="grid gap-3 md:col-span-2"><h3 className="font-semibold">Medication list</h3><p className="text-sm text-slate-600">List all cancer-related medications, including lower-cost medications. You may also upload photos of a medication list in Documents.</p>{(form.diagnosis.medications ?? []).map((medication, index) => <AutocompleteField key={index} label={`Medication ${index + 1}`} value={medication} options={catalogDrugs} onChange={(value) => updateMedication(index, value)} />)}<Button variant="secondary" onClick={() => updateSection("diagnosis", { medications: [...(form.diagnosis.medications ?? []), ""] })}><Plus size={16} />Add medication</Button><TextField label="Preferred pharmacy" placeholder="Pharmacy name and location" value={form.diagnosis.pharmacyName ?? ""} onChange={(e) => updateSection("diagnosis", { pharmacyName: e.target.value })} /></div> : null}
          <div className="grid gap-3 md:col-span-2">
            <div>
              <h3 className="font-semibold">Arizona hospitals or cancer centers</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Select any places where the patient is receiving cancer care or
                has medical bills. This helps PCSN know who to contact.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from(new Set([...catalogFacilities, ...(form.hospital.treatmentFacilities ?? [])])).map((facility) => (
                <label
                  key={facility}
                  className="flex items-start gap-3 rounded-md border border-slate-300 bg-white p-4 text-sm"
                >
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={(form.hospital.treatmentFacilities ?? []).includes(facility)}
                    onChange={(event) =>
                      toggleTreatmentFacility(facility, event.target.checked)
                    }
                  />
                  <span>{facility}</span>
                </label>
              ))}
            </div>
          </div>
          {needsMayoApplication ? <MayoFinancialAssistanceSection value={form.hospital.mayoFinancialAssistance ?? emptyMayoApplication} patient={form.patient} onChange={updateMayoApplication} /> : null}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-4 md:grid-cols-2"><p className="text-sm text-slate-600 md:col-span-2">If you do not know your provider’s phone, address, fax, or NPI, leave it blank. A volunteer can help find it.</p>
          <TextField required label="Clinic name" value={form.provider.clinicName} onChange={(e) => updateSection("provider", { clinicName: e.target.value })} />
          <TextField required label="Prescriber/provider name" value={form.provider.providerName} onChange={(e) => updateSection("provider", { providerName: e.target.value })} />
          <TextField label="NPI (if known)" value={form.provider.npi} onChange={(e) => updateSection("provider", { npi: e.target.value })} />
          <TextField label="Phone (if known)" value={form.provider.phone} onChange={(e) => updateSection("provider", { phone: e.target.value })} />
          <TextField label="Fax" value={form.provider.fax} onChange={(e) => updateSection("provider", { fax: e.target.value })} />
          <TextField label="Address line 1 (if known)" value={form.provider.addressLine1} onChange={(e) => updateSection("provider", { addressLine1: e.target.value })} />
          <TextField label="Address line 2" value={form.provider.addressLine2} onChange={(e) => updateSection("provider", { addressLine2: e.target.value })} />
          <TextField label="City (if known)" value={form.provider.city} onChange={(e) => updateSection("provider", { city: e.target.value })} />
          <TextField label="State (if known)" value={form.provider.state} onChange={(e) => updateSection("provider", { state: e.target.value })} />
          <TextField label="Postal code (if known)" value={form.provider.postalCode} onChange={(e) => updateSection("provider", { postalCode: e.target.value })} />
        </div>
      ) : null}

      {step === 5 ? (
        <div className="grid gap-4"><p className="text-sm text-slate-600">If you do not know an insurance identifier, leave it blank. You can upload your insurance card or ask a volunteer for help.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["hasInsurance", "Patient currently has insurance"],
              ["hasMedicalInsurance", "Health insurance"],
              ["hasPharmacyInsurance", "Prescription insurance"],
              ["hasMedicare", "Medicare"],
              ["hasMedicaid", "Medicaid"],
              ["eobAvailable", "I have an Explanation of Benefits from insurance"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 rounded-md border border-slate-300 bg-white p-4 text-sm">
                <input type="checkbox" checked={Boolean(form.insurance[key as keyof typeof form.insurance])} onChange={(e) => updateSection("insurance", { [key]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
          {form.insurance.hasMedicalInsurance ? (
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Health insurance company" value={form.insurance.medicalCarrier} onChange={(e) => updateSection("insurance", { medicalCarrier: e.target.value })} />
              <TextField label="Health insurance policy ID" value={form.insurance.medicalPolicyId} onChange={(e) => updateSection("insurance", { medicalPolicyId: e.target.value })} />
              <TextField label="Health insurance group ID" value={form.insurance.medicalGroupId} onChange={(e) => updateSection("insurance", { medicalGroupId: e.target.value })} />
              <TextField label="Health insurance member ID" value={form.insurance.medicalMemberId} onChange={(e) => updateSection("insurance", { medicalMemberId: e.target.value })} />
              <TextField label="Health insurance PCN" value={form.insurance.medicalPcn ?? ""} onChange={(e) => updateSection("insurance", { medicalPcn: e.target.value })} />
              <TextField label="Policy holder name" value={form.insurance.medicalPolicyHolder ?? ""} onChange={(e) => updateSection("insurance", { medicalPolicyHolder: e.target.value })} />
            </div>
          ) : null}
          {form.insurance.hasPharmacyInsurance ? (
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Prescription insurance company" value={form.insurance.pharmacyCarrier} onChange={(e) => updateSection("insurance", { pharmacyCarrier: e.target.value })} />
              <TextField label="Prescription insurance policy ID" value={form.insurance.pharmacyPolicyId} onChange={(e) => updateSection("insurance", { pharmacyPolicyId: e.target.value })} />
              <TextField label="Prescription insurance group ID" value={form.insurance.pharmacyGroupId} onChange={(e) => updateSection("insurance", { pharmacyGroupId: e.target.value })} />
              <TextField label="Prescription insurance member ID" value={form.insurance.pharmacyMemberId} onChange={(e) => updateSection("insurance", { pharmacyMemberId: e.target.value })} />
              <TextField label="Prescription insurance PCN" value={form.insurance.pharmacyPcn ?? ""} onChange={(e) => updateSection("insurance", { pharmacyPcn: e.target.value })} />
              <TextField label="Policy holder name" value={form.insurance.pharmacyPolicyHolder ?? ""} onChange={(e) => updateSection("insurance", { pharmacyPolicyHolder: e.target.value })} />
            </div>
          ) : null}
          {isManufacturer ? (
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">
                  Has your insurance denied coverage for this medication or treatment?
                </span>
                <select
                  className="h-11 rounded-md border border-slate-300 bg-white px-3"
                  value={form.insurance.coverageDenied}
                  onChange={(e) =>
                    updateSection("insurance", {
                      coverageDenied: e.target.value as IntakePayload["insurance"]["coverageDenied"],
                    })
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="not_sure">I'm not sure</option>
                </select>
              </label>
              <p className="text-sm text-slate-600">
                This means the insurance company said it would not pay for a medication or treatment, including after a prior authorization request. If more than one item was denied, list each one below. You can upload denial letters in Documents.
              </p>
              {form.insurance.coverageDenied === "yes" ? <TextAreaField label="Which medications or treatments were denied?" placeholder="List each denied medication or treatment and anything you know about the decision." value={form.insurance.denialDetails ?? ""} onChange={(e) => updateSection("insurance", { denialDetails: e.target.value })} /> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 6 ? (
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField required label="Monthly household income" inputMode="decimal" placeholder="Example: 4,250" value={form.household.monthlyIncome} onChange={(e) => updateSection("household", { monthlyIncome: e.target.value })} />
            <TextField required label="Annual household income" inputMode="decimal" placeholder="Example: 51,000" value={form.household.annualIncome} onChange={(e) => updateSection("household", { annualIncome: e.target.value })} />
            <TextField required label="Household size" type="number" value={form.household.householdSize} onChange={(e) => updateSection("household", { householdSize: Number(e.target.value) })} />
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-ink">
                Patient employment status<span className="ml-1 text-coral">*</span>
              </span>
              <select
                className="h-11 rounded-md border border-slate-300 bg-white px-3"
                value={form.patient.employmentStatus}
                onChange={(e) =>
                  updateSection("patient", { employmentStatus: e.target.value })
                }
              >
                <option value="">Select one</option>
                {employmentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Household members</h3>
              <Button variant="secondary" onClick={addMember}>
                <Plus size={16} />
                Add member
              </Button>
            </div>
            {form.household.members.map((member, index) => {
              const isPatientMember = member.relationship === "Patient";
              const displayMember = isPatientMember
                ? {
                    ...member,
                    name: `${form.patient.firstName} ${form.patient.lastName}`.trim(),
                    employmentStatus: form.patient.employmentStatus,
                    incomeSources: form.patient.incomeSources,
                  }
                : member;
              return (
              <div key={index} className="grid gap-4 rounded-md border border-slate-200 bg-white p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField required label="Name" value={displayMember.name} disabled={isPatientMember} onChange={(e) => updateMember(index, { name: e.target.value })} />
                  <TextField required label="Relationship" value={displayMember.relationship} disabled={isPatientMember} onChange={(e) => updateMember(index, { relationship: e.target.value })} />
                  <TextField required label="Age" type="number" value={displayMember.age} onChange={(e) => updateMember(index, { age: Number(e.target.value), isAdult: Number(e.target.value) >= 18 })} />
                  <label className="flex items-center gap-3 text-sm">
                    <input type="checkbox" checked={member.isAdult} onChange={(e) => updateMember(index, { isAdult: e.target.checked })} />
                    Adult household member
                  </label>
                  {displayMember.isAdult ? (
                    isPatientMember ? (
                      <TextField label="Employment status" value={displayMember.employmentStatus} disabled />
                    ) : (
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium text-ink">Employment status</span>
                        <select
                          className="h-11 rounded-md border border-slate-300 bg-white px-3"
                          value={displayMember.employmentStatus}
                          onChange={(e) =>
                            updateMember(index, { employmentStatus: e.target.value })
                          }
                        >
                          <option value="">Select one</option>
                          {employmentOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    )
                  ) : null}
                </div>
                {displayMember.isAdult ? (
                  <div className="grid gap-3">
                    <span className="text-sm font-medium">Income sources</span>
                    {displayMember.incomeSources.map((source, sourceIndex) => (
                      <TextField key={sourceIndex} label={`Income source ${sourceIndex + 1}`} value={source} disabled={isPatientMember} onChange={(e) => updateIncomeSource(index, sourceIndex, e.target.value)} />
                    ))}
                    {!isPatientMember ? (
                      <Button variant="secondary" onClick={() => updateMember(index, { incomeSources: [...displayMember.incomeSources, ""] })}>
                        <Plus size={16} />
                        Add income source
                      </Button>
                    ) : (
                      <p className="text-sm text-slate-600">
                        Patient information is copied from the Patient step.
                      </p>
                    )}
                  </div>
                ) : null}
                {form.household.members.length > 1 ? (
                  <Button variant="secondary" onClick={() => removeMember(index)}>
                    <Trash2 size={16} />
                    Remove member
                  </Button>
                ) : null}
              </div>
            );
            })}
          </div>
        </div>
      ) : null}

      {step === 7 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleDocumentTypes.map((documentType) => (
            <label key={documentType} className="grid min-h-40 cursor-pointer place-items-center rounded-md border border-dashed border-slate-400 bg-white p-5 text-center">
              <input className="sr-only" type="file" accept=".pdf,.jpg,.jpeg,.png" multiple disabled={uploading || !documentsLoaded || submitting} onChange={(e) => { void uploadDocuments(documentType, Array.from(e.target.files ?? [])); e.target.value = ""; }} />
              <span className="grid gap-2">
                <FileUp className="mx-auto text-pine" />
                <span className="font-medium">{documentLabels[documentType]}</span>
                {catalogDocumentHelp[documentType] ? <details><summary className="cursor-pointer text-pine underline">How do I find this document?</summary><p className="whitespace-pre-line">{catalogDocumentHelp[documentType]}</p></details> : null}
                <span className="text-sm text-slate-500">
                  {savedDocuments.filter(d => d.document_type === documentType).length
                    ? `${savedDocuments.filter(d => d.document_type === documentType).length} file(s) saved`
                    : "Upload PDF, JPG, or PNG"}
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : null}

      {uploading ? <p role="status">Saving document securely. Please keep this page open.</p> : null}
      {documentError ? <p role="alert" className="text-red-700">{documentError}</p> : null}
      {step === 7 || step === 9 ? <ul className="text-sm">{savedDocuments.map(document => <li key={document.id}>{document.original_filename} — Saved <button type="button" className="ml-2 underline" disabled={uploading || submitting} onClick={() => void removeDocument(document.id)}>Remove</button></li>)}</ul> : null}

      {step === 8 ? (
        <div className="grid gap-4">
          <div className="flex gap-3 rounded-md border border-pine/20 bg-pine/5 p-4 text-sm leading-6">
            <ShieldCheck className="mt-0.5 shrink-0 text-pine" size={18} />
            <p>
              These permissions allow PCSN to coordinate the application with
              authorized parties and review the information needed for financial
              assistance decisions.
            </p>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.consent.releaseMedicalFinancial} onChange={(e) => updateSection("consent", { releaseMedicalFinancial: e.target.checked })} />
            <span>
              I authorize release of medical and financial information for this
              application<span className="ml-1 text-coral">*</span>
            </span>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.consent.contactPermission} onChange={(e) => updateSection("consent", { contactPermission: e.target.checked })} />
            <span>
              PCSN may contact providers, hospitals, insurers, manufacturers,
              and assistance foundations<span className="ml-1 text-coral">*</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm leading-6">
            <input
              className="mt-1"
              type="checkbox"
              checked={form.consent.noGuaranteeAcknowledgment}
              onChange={(e) =>
                updateSection("consent", {
                  noGuaranteeAcknowledgment: e.target.checked,
                })
              }
            />
            <span>
              I understand that Phoenix Cancer Support Network cannot guarantee
              approval, funding, medication assistance, or hospital financial
              assistance, and that all decisions are made by the sponsoring
              organizations.<span className="ml-1 text-coral">*</span>
            </span>
          </label>
          <TextField required label="Electronic signature" value={form.consent.signature} onChange={(e) => updateSection("consent", { signature: e.target.value })} />
        </div>
      ) : null}

      {step === 0 ? <label className="flex items-start gap-3 rounded-md border border-pine/30 bg-pine/5 p-4 text-sm leading-6">
        <input
          className="mt-1"
          type="checkbox"
          checked={form.consent.volunteerAccessConsent}
          onChange={(event) =>
            updateSection("consent", {
              volunteerAccessConsent: event.target.checked,
            })
          }
        />
        <span>
          I consent to Phoenix Cancer Support Network volunteers accessing the
          application information I have entered and saved up to this point,
          and I give permission for volunteers to contact me to offer assistance
          with my application.<span className="ml-1 text-coral">*</span>
        </span>
      </label> : <p className="text-sm text-slate-600">Volunteer access and contact: {form.consent.volunteerAccessConsent ? "Permission given" : "Not yet given"}. <button type="button" className="underline" onClick={() => setStep(0)}>Review permission</button></p>}

      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep((current) => Math.max(current - 1, 0))}>
          Back
        </Button>
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant="secondary"
            disabled={savingDraft || submitting || uploading}
            onClick={() => void saveDraft()}
          >
            {savingDraft ? "Saving..." : "Save and finish later"}
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => void continueToNextStep()} disabled={savingDraft || uploading}>
              Continue
            </Button>
          ) : (
            <Button
              disabled={submitting || savingDraft || uploading || !documentsLoaded}
              onClick={submit}
            >
              {submitting ? "Submitting..." : "Submit application"}
            </Button>
          )}
        </div>
      </div>
      {submitError ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          {submitError}
        </div>
      ) : null}
    </div>
  );
}
