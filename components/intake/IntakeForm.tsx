"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AutocompleteField } from "@/components/ui/AutocompleteField";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { arizonaTreatmentFacilities } from "@/lib/resources";
import type { IntakePayload } from "@/lib/types";

type DocumentType =
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
];

const documentLabels: Record<DocumentType, string> = {
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

const medications = [
  "Abemaciclib (Verzenio)",
  "Abiraterone (Zytiga)",
  "Acalabrutinib (Calquence)",
  "Adagrasib (Krazati)",
  "Afatinib (Gilotrif)",
  "Alectinib (Alecensa)",
  "Alemtuzumab (Campath)",
  "Alpelisib (Piqray)",
  "Amivantamab (Rybrevant)",
  "Anastrozole (Arimidex)",
  "Apalutamide (Erleada)",
  "Arsenic trioxide (Trisenox)",
  "Asciminib (Scemblix)",
  "Atezolizumab (Tecentriq)",
  "Avapritinib (Ayvakit)",
  "Avelumab (Bavencio)",
  "Axitinib (Inlyta)",
  "Azacitidine (Vidaza, Onureg)",
  "Belantamab mafodotin (Blenrep)",
  "Belzutifan (Welireg)",
  "Bendamustine (Bendeka, Treanda)",
  "Bevacizumab (Avastin)",
  "Bicalutamide (Casodex)",
  "Binimetinib (Mektovi)",
  "Blinatumomab (Blincyto)",
  "Bortezomib (Velcade)",
  "Bosutinib (Bosulif)",
  "Brentuximab vedotin (Adcetris)",
  "Brexucabtagene autoleucel (Tecartus)",
  "Brigatinib (Alunbrig)",
  "Busulfan (Busulfex, Myleran)",
  "Cabazitaxel (Jevtana)",
  "Cabozantinib (Cabometyx, Cometriq)",
  "Calaspargase pegol (Asparlas)",
  "Capecitabine (Xeloda)",
  "Capivasertib (Truqap)",
  "Capmatinib (Tabrecta)",
  "Carboplatin (Paraplatin)",
  "Carfilzomib (Kyprolis)",
  "Carmustine (BiCNU, Gliadel)",
  "Cemiplimab (Libtayo)",
  "Ceritinib (Zykadia)",
  "Cetuximab (Erbitux)",
  "Chlorambucil (Leukeran)",
  "Cisplatin (Platinol)",
  "Cladribine (Leustatin)",
  "Cobimetinib (Cotellic)",
  "Copanlisib (Aliqopa)",
  "Crizotinib (Xalkori)",
  "Cyclophosphamide (Cytoxan)",
  "Cytarabine (Cytosar-U)",
  "Dabrafenib (Tafinlar)",
  "Dacomitinib (Vizimpro)",
  "Daratumumab (Darzalex, Darzalex Faspro)",
  "Darolutamide (Nubeqa)",
  "Dasatinib (Sprycel)",
  "Daunorubicin (Cerubidine)",
  "Decitabine (Dacogen)",
  "Degarelix (Firmagon)",
  "Denosumab (Xgeva, Prolia)",
  "Dinutuximab (Unituxin)",
  "Docetaxel (Taxotere)",
  "Dostarlimab (Jemperli)",
  "Doxorubicin (Adriamycin, Doxil)",
  "Durvalumab (Imfinzi)",
  "Duvelisib (Copiktra)",
  "Elacestrant (Orserdu)",
  "Elotuzumab (Empliciti)",
  "Enasidenib (Idhifa)",
  "Encorafenib (Braftovi)",
  "Enfortumab vedotin (Padcev)",
  "Entrectinib (Rozlytrek)",
  "Enzalutamide (Xtandi)",
  "Epcoritamab (Epkinly)",
  "Erdafitinib (Balversa)",
  "Erlotinib (Tarceva)",
  "Etoposide (Etopophos, Toposar)",
  "Everolimus (Afinitor)",
  "Exemestane (Aromasin)",
  "Fam-trastuzumab deruxtecan (Enhertu)",
  "Fedratinib (Inrebic)",
  "Fludarabine (Fludara)",
  "Fluorouracil / 5-FU (Adrucil)",
  "Flutamide",
  "Fulvestrant (Faslodex)",
  "Futibatinib (Lytgobi)",
  "Gefitinib (Iressa)",
  "Gemcitabine (Gemzar)",
  "Gemtuzumab ozogamicin (Mylotarg)",
  "Gilteritinib (Xospata)",
  "Glasdegib (Daurismo)",
  "Goserelin (Zoladex)",
  "Hydroxyurea (Hydrea)",
  "Ibrutinib (Imbruvica)",
  "Idarubicin (Idamycin)",
  "Idelalisib (Zydelig)",
  "Ifosfamide (Ifex)",
  "Imatinib (Gleevec)",
  "Infigratinib (Truseltiq)",
  "Inotuzumab ozogamicin (Besponsa)",
  "Interferon alfa-2b (Intron A)",
  "Ipilimumab (Yervoy)",
  "Irinotecan (Camptosar)",
  "Isatuximab (Sarclisa)",
  "Ivosidenib (Tibsovo)",
  "Ixazomib (Ninlaro)",
  "Lapatinib (Tykerb)",
  "Larotrectinib (Vitrakvi)",
  "Lanreotide (Somatuline Depot)",
  "Lenalidomide (Revlimid)",
  "Lenvatinib (Lenvima)",
  "Letrozole (Femara)",
  "Leucovorin",
  "Leuprolide (Lupron Depot, Eligard, Camcevi)",
  "Lisocabtagene maraleucel (Breyanzi)",
  "Lorlatinib (Lorbrena)",
  "Lutetium Lu 177 dotatate (Lutathera)",
  "Lutetium Lu 177 vipivotide tetraxetan (Pluvicto)",
  "Mechlorethamine (Valchlor)",
  "Melphalan (Alkeran)",
  "Mercaptopurine (Purinethol, Purixan)",
  "Methotrexate (Trexall, Otrexup, Rasuvo)",
  "Midostaurin (Rydapt)",
  "Mirvetuximab soravtansine (Elahere)",
  "Mitomycin (Mutamycin)",
  "Mitoxantrone (Novantrone)",
  "Nab-paclitaxel (Abraxane)",
  "Naxitamab (Danyelza)",
  "Neratinib (Nerlynx)",
  "Nilotinib (Tasigna)",
  "Nilutamide (Nilandron)",
  "Niraparib (Zejula)",
  "Nivolumab (Opdivo)",
  "Nivolumab and relatlimab (Opdualag)",
  "Obinutuzumab (Gazyva)",
  "Ofatumumab (Arzerra)",
  "Olaparib (Lynparza)",
  "Osimertinib (Tagrisso)",
  "Oxaliplatin (Eloxatin)",
  "Paclitaxel (Taxol)",
  "Palbociclib (Ibrance)",
  "Pamidronate (Aredia)",
  "Panitumumab (Vectibix)",
  "Pazopanib (Votrient)",
  "Pegaspargase (Oncaspar)",
  "Pemetrexed (Alimta)",
  "Pembrolizumab (Keytruda)",
  "Pertuzumab (Perjeta)",
  "Pirtobrutinib (Jaypirca)",
  "Polatuzumab vedotin (Polivy)",
  "Ponatinib (Iclusig)",
  "Pralsetinib (Gavreto)",
  "Procarbazine (Matulane)",
  "Radium Ra 223 dichloride (Xofigo)",
  "Ramucirumab (Cyramza)",
  "Regorafenib (Stivarga)",
  "Relugolix (Orgovyx)",
  "Repotrectinib (Augtyro)",
  "Ribociclib (Kisqali)",
  "Ripretinib (Qinlock)",
  "Rituximab (Rituxan, Truxima, Ruxience, Riabni)",
  "Romidepsin (Istodax)",
  "Rucaparib (Rubraca)",
  "Ruxolitinib (Jakafi)",
  "Sacituzumab govitecan (Trodelvy)",
  "Selinexor (Xpovio)",
  "Selpercatinib (Retevmo)",
  "Selumetinib (Koselugo)",
  "Sonidegib (Odomzo)",
  "Sorafenib (Nexavar)",
  "Sotorasib (Lumakras)",
  "Sunitinib (Sutent)",
  "Talazoparib (Talzenna)",
  "Tamoxifen (Soltamox)",
  "Tazemetostat (Tazverik)",
  "Temozolomide (Temodar)",
  "Temsirolimus (Torisel)",
  "Tepotinib (Tepmetko)",
  "Thioguanine (Tabloid)",
  "Tisagenlecleucel (Kymriah)",
  "Tisotumab vedotin (Tivdak)",
  "Topotecan (Hycamtin)",
  "Toripalimab (Loqtorzi)",
  "Tovorafenib (Ojemda)",
  "Trametinib (Mekinist)",
  "Trastuzumab (Herceptin, Ogivri, Kanjinti, Trazimera)",
  "Trastuzumab emtansine (Kadcyla)",
  "Tretinoin / ATRA (Vesanoid)",
  "Trifluridine and tipiracil (Lonsurf)",
  "Triptorelin (Trelstar)",
  "Tucatinib (Tukysa)",
  "Vandetanib (Caprelsa)",
  "Venetoclax (Venclexta)",
  "Vinblastine (Velban)",
  "Vincristine (Oncovin, Vincasar PFS)",
  "Vinorelbine (Navelbine)",
  "Vismodegib (Erivedge)",
  "Vorasidenib (Voranigo)",
  "Zanubrutinib (Brukinsa)",
  "Ziv-aflibercept (Zaltrap)",
  "Zoledronic acid (Zometa, Reclast)",
  "Zolbetuximab (Vyloy)",
];

const employmentOptions = [
  "Employed full-time",
  "Employed part-time",
  "Self-employed",
  "Unemployed",
  "Retired",
  "Disabled",
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

const initialState: IntakePayload = {
  assistanceType: "manufacturer",
  patient: {
    firstName: "",
    lastName: "",
    dateOfBirth: "",
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
    diagnosisDate: "",
    treatmentPlan: "",
    treatmentStartDate: "",
    medicationRequested: "",
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
    releaseMedicalFinancial: false,
    contactPermission: false,
    noGuaranteeAcknowledgment: false,
    signature: "",
    signedAt: "",
  },
};

type IntakeFormProps = {
  initialDraft?: IntakePayload | null;
  draftUpdatedAt?: string | null;
};

export function IntakeForm({ initialDraft, draftUpdatedAt }: IntakeFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<IntakePayload>(initialDraft ?? initialState);
  const [files, setFiles] = useState<Partial<Record<DocumentType, File[]>>>({});
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
  const visibleDocumentTypes = useMemo<DocumentType[]>(
    () =>
      [
        ...baseDocumentTypes,
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
    [form.insurance.coverageDenied],
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

  function hasText(value: string | undefined) {
    return Boolean(value?.trim());
  }

  function findMissingRequiredStep() {
    const requiredByStep: Array<[number, boolean, string]> = [
      [1, hasText(form.patient.firstName), "Patient first name is required."],
      [1, hasText(form.patient.lastName), "Patient last name is required."],
      [1, hasText(form.patient.dateOfBirth), "Patient date of birth is required."],
      [1, hasText(form.patient.phone), "Patient phone number is required."],
      [1, hasText(form.patient.email), "Patient email is required."],
      [1, hasText(form.patient.addressLine1), "Patient address is required."],
      [1, hasText(form.patient.city), "Patient city is required."],
      [1, hasText(form.patient.state), "Patient state is required."],
      [1, hasText(form.patient.postalCode), "Patient postal code is required."],
      [1, hasText(form.patient.employmentStatus), "Patient employment status is required."],
      [3, hasText(form.diagnosis.cancerType), "Cancer type is required."],
      [3, hasText(form.diagnosis.diagnosisDate), "Diagnosis date is required."],
      [3, hasText(form.diagnosis.treatmentPlan), "Treatment plan is required."],
      [3, !isManufacturer || hasText(form.diagnosis.medicationRequested), "Medication is required for medication assistance."],
      [4, hasText(form.provider.clinicName), "Clinic name is required."],
      [4, hasText(form.provider.providerName), "Provider name is required."],
      [4, hasText(form.provider.npi), "Provider NPI is required."],
      [4, hasText(form.provider.phone), "Provider phone number is required."],
      [4, hasText(form.provider.addressLine1), "Provider address is required."],
      [4, hasText(form.provider.city), "Provider city is required."],
      [4, hasText(form.provider.state), "Provider state is required."],
      [4, hasText(form.provider.postalCode), "Provider postal code is required."],
      [6, form.household.householdSize > 0, "Household size is required."],
    ];

    return requiredByStep.find(([, isComplete]) => !isComplete);
  }

  async function saveDraft() {
    setSavingDraft(true);
    setSubmitError("");
    setDraftMessage("");

    try {
      const response = await fetch("/api/intake/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: form }),
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
    } catch {
      setDraftMessage(
        "We could not save your progress. Please check your connection and try again.",
      );
    } finally {
      setSavingDraft(false);
    }
  }

  async function submit() {
    const missing = findMissingRequiredStep();
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
      Object.entries(files).forEach(([documentType, selectedFiles]) => {
        selectedFiles?.forEach((file) =>
          body.append(`document:${documentType}`, file),
        );
      });
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
          account. Documents are not saved until you submit, so please select
          your files again if you leave and return.
        </p>
        <p className="mt-2">
          <span className="font-semibold text-coral">*</span> Required field
        </p>
        {draftMessage ? (
          <p className="mt-2 font-semibold text-pine">{draftMessage}</p>
        ) : null}
      </div>

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

      {step === 0 ? (
        <div className="grid gap-3">
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
          <TextField required label="First name" value={form.patient.firstName} onChange={(e) => updateSection("patient", { firstName: e.target.value })} />
          <TextField required label="Last name" value={form.patient.lastName} onChange={(e) => updateSection("patient", { lastName: e.target.value })} />
          <TextField required label="Date of birth" type="date" value={form.patient.dateOfBirth} onChange={(e) => updateSection("patient", { dateOfBirth: e.target.value })} />
          <TextField required label="Phone" value={form.patient.phone} onChange={(e) => updateSection("patient", { phone: e.target.value })} />
          <TextField required label="Email" type="email" value={form.patient.email} onChange={(e) => updateSection("patient", { email: e.target.value })} />
          <TextField required label="Address line 1" value={form.patient.addressLine1} onChange={(e) => updateSection("patient", { addressLine1: e.target.value })} />
          <TextField label="Address line 2" value={form.patient.addressLine2} onChange={(e) => updateSection("patient", { addressLine2: e.target.value })} />
          <TextField required label="City" value={form.patient.city} onChange={(e) => updateSection("patient", { city: e.target.value })} />
          <TextField required label="State" value={form.patient.state} onChange={(e) => updateSection("patient", { state: e.target.value })} />
          <TextField required label="Postal code" value={form.patient.postalCode} onChange={(e) => updateSection("patient", { postalCode: e.target.value })} />
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
          <TextField required label="Diagnosis date" type="date" value={form.diagnosis.diagnosisDate} onChange={(e) => updateSection("diagnosis", { diagnosisDate: e.target.value })} />
          <TextField label="Treatment start date" type="date" value={form.diagnosis.treatmentStartDate} onChange={(e) => updateSection("diagnosis", { treatmentStartDate: e.target.value })} />
          {isManufacturer ? (
            <AutocompleteField required label="Medication" value={form.diagnosis.medicationRequested ?? ""} options={medications} onChange={(value) => updateSection("diagnosis", { medicationRequested: value })} />
          ) : null}
          <div className="md:col-span-2">
            <TextAreaField required label="Treatment plan" value={form.diagnosis.treatmentPlan} onChange={(e) => updateSection("diagnosis", { treatmentPlan: e.target.value })} />
          </div>
          {isHospital ? (
            <>
              <TextField label="Hospital account number" value={form.hospital.accountNumber} onChange={(e) => updateSection("hospital", { accountNumber: e.target.value })} />
              <TextField label="Person responsible for the bill number" value={form.hospital.guarantorNumber} onChange={(e) => updateSection("hospital", { guarantorNumber: e.target.value })} />
            </>
          ) : null}
          <div className="grid gap-3 md:col-span-2">
            <div>
              <h3 className="font-semibold">Arizona hospitals or cancer centers</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Select any places where the patient is receiving cancer care or
                has medical bills. This helps PCSN know who to contact.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {arizonaTreatmentFacilities.map((facility) => (
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
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <TextField required label="Clinic name" value={form.provider.clinicName} onChange={(e) => updateSection("provider", { clinicName: e.target.value })} />
          <TextField required label="Prescriber/provider name" value={form.provider.providerName} onChange={(e) => updateSection("provider", { providerName: e.target.value })} />
          <TextField required label="NPI" value={form.provider.npi} onChange={(e) => updateSection("provider", { npi: e.target.value })} />
          <TextField required label="Phone" value={form.provider.phone} onChange={(e) => updateSection("provider", { phone: e.target.value })} />
          <TextField label="Fax" value={form.provider.fax} onChange={(e) => updateSection("provider", { fax: e.target.value })} />
          <TextField required label="Address line 1" value={form.provider.addressLine1} onChange={(e) => updateSection("provider", { addressLine1: e.target.value })} />
          <TextField label="Address line 2" value={form.provider.addressLine2} onChange={(e) => updateSection("provider", { addressLine2: e.target.value })} />
          <TextField required label="City" value={form.provider.city} onChange={(e) => updateSection("provider", { city: e.target.value })} />
          <TextField required label="State" value={form.provider.state} onChange={(e) => updateSection("provider", { state: e.target.value })} />
          <TextField required label="Postal code" value={form.provider.postalCode} onChange={(e) => updateSection("provider", { postalCode: e.target.value })} />
        </div>
      ) : null}

      {step === 5 ? (
        <div className="grid gap-4">
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
            </div>
          ) : null}
          {form.insurance.hasPharmacyInsurance ? (
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Prescription insurance company" value={form.insurance.pharmacyCarrier} onChange={(e) => updateSection("insurance", { pharmacyCarrier: e.target.value })} />
              <TextField label="Prescription insurance policy ID" value={form.insurance.pharmacyPolicyId} onChange={(e) => updateSection("insurance", { pharmacyPolicyId: e.target.value })} />
              <TextField label="Prescription insurance group ID" value={form.insurance.pharmacyGroupId} onChange={(e) => updateSection("insurance", { pharmacyGroupId: e.target.value })} />
              <TextField label="Prescription insurance member ID" value={form.insurance.pharmacyMemberId} onChange={(e) => updateSection("insurance", { pharmacyMemberId: e.target.value })} />
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
                If yes, you can upload denial letters in the documents step.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 6 ? (
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField required label="Monthly household income" type="number" value={form.household.monthlyIncome} onChange={(e) => updateSection("household", { monthlyIncome: Number(e.target.value) })} />
            <TextField required label="Annual household income" type="number" value={form.household.annualIncome} onChange={(e) => updateSection("household", { annualIncome: Number(e.target.value) })} />
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
                  <TextField required label="Age" type="number" value={displayMember.age} onChange={(e) => updateMember(index, { age: Number(e.target.value) })} />
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
              <input className="sr-only" type="file" multiple onChange={(e) => setFiles((current) => ({ ...current, [documentType]: Array.from(e.target.files ?? []) }))} />
              <span className="grid gap-2">
                <FileUp className="mx-auto text-pine" />
                <span className="font-medium">{documentLabels[documentType]}</span>
                <span className="text-sm text-slate-500">
                  {files[documentType]?.length
                    ? `${files[documentType]?.length} file(s) selected`
                    : "Upload PDF, JPG, or PNG"}
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : null}

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

      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep((current) => Math.max(current - 1, 0))}>
          Back
        </Button>
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant="secondary"
            disabled={savingDraft || submitting}
            onClick={saveDraft}
          >
            {savingDraft ? "Saving..." : "Save and finish later"}
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((current) => current + 1)}>
              Continue
            </Button>
          ) : (
            <Button
              disabled={
                submitting ||
                !form.consent.releaseMedicalFinancial ||
                !form.consent.contactPermission ||
                !form.consent.noGuaranteeAcknowledgment ||
                !form.consent.signature
              }
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
