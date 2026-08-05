export const arizonaTreatmentFacilities = [
  "Arizona Oncology",
  "Banner MD Anderson Cancer Center",
  "Banner - University Medical Center Phoenix",
  "Banner - University Medical Center Tucson",
  "Banner Boswell Medical Center",
  "Banner Del E. Webb Medical Center",
  "Banner Desert Medical Center",
  "Banner Thunderbird Medical Center",
  "City of Hope Phoenix",
  "Dignity Health Cancer Institute at St. Joseph's",
  "HonorHealth Cancer Care",
  "Ironwood Cancer & Research Centers",
  "Mayo Clinic Arizona",
  "Northern Arizona Healthcare",
  "Phoenix Children's",
  "The University of Arizona Cancer Center",
  "TMC Health / Tucson Medical Center",
  "Valleywise Health",
  "Yuma Regional Medical Center Cancer Center",
  "Other Arizona hospital or cancer center",
];

export type VolunteerResource = {
  name: string;
  category: "Hospital / cancer center" | "Drug company assistance";
  focus: string;
  phone?: string;
  website: string;
  forms?: string;
  patientItems: string[];
  volunteerNotes: string;
};

export const volunteerResources: VolunteerResource[] = [
  {
    name: "Banner Health Arizona",
    category: "Hospital / cancer center",
    focus: "Hospital financial assistance",
    phone: "(888) 264-2127",
    website: "https://www.bannerhealth.com/patients/billing/financial-assistance/arizona-region",
    forms: "Arizona financial assistance application and policy",
    patientItems: [
      "Completed financial assistance application",
      "Proof of household income",
      "Government ID, if requested",
      "Insurance information, if any",
      "Billing account number",
    ],
    volunteerNotes:
      "Use for Banner hospitals and Banner-affiliated cancer care. Confirm the current application form before sending.",
  },
  {
    name: "Dignity Health Arizona / CommonSpirit",
    category: "Hospital / cancer center",
    focus: "Hospital charity care and discounts",
    website: "https://www.commonspirit.org/patient-resources/dignity-health-arizona-financial-assistance",
    forms: "Financial assistance policy and application materials",
    patientItems: [
      "Completed financial assistance application",
      "Proof of income",
      "Household size",
      "Insurance and billing information",
    ],
    volunteerNotes:
      "Use for Dignity Health Arizona facilities, including St. Joseph's. Verify facility-specific mailing or upload instructions.",
  },
  {
    name: "HonorHealth",
    category: "Hospital / cancer center",
    focus: "Hospital financial assistance",
    phone: "(623) 300-9044",
    website: "https://www.honorhealth.com/patients-visitors/financial-assistance-policy",
    forms: "Financial assistance policy and application",
    patientItems: [
      "Financial assistance application",
      "Income documentation",
      "Household information",
      "Insurance card and billing statement",
    ],
    volunteerNotes:
      "Use for HonorHealth hospitals and HonorHealth Cancer Care. Call financial customer service for account-specific instructions.",
  },
  {
    name: "Mayo Clinic Arizona",
    category: "Hospital / cancer center",
    focus: "Charity care and financial assistance",
    website: "https://www.mayoclinic.org/billing-insurance/financial-assistance",
    forms: "Patient Online Services or paper application",
    patientItems: [
      "Mayo patient account access, if applying online",
      "Financial assistance application",
      "Income and asset documentation",
      "Insurance information",
    ],
    volunteerNotes:
      "Mayo often routes patients through Patient Online Services. Confirm whether the patient can submit directly through their account.",
  },
  {
    name: "Phoenix Children's",
    category: "Hospital / cancer center",
    focus: "Charity, low-income, and uninsured program",
    website: "https://phoenixchildrens.org/patient-visitor-information/planning-your-visit/charity-low-income-uninsured-program",
    forms: "Charity, low-income, and uninsured program materials",
    patientItems: [
      "Parent/guardian and patient information",
      "Proof of household income",
      "Insurance information",
      "Billing statement",
    ],
    volunteerNotes:
      "Use for pediatric patients. Make sure guardian authorization is documented before outreach.",
  },
  {
    name: "Valleywise Health",
    category: "Hospital / cancer center",
    focus: "Eligibility and billing assistance",
    phone: "(602) 344-2550",
    website: "https://valleywisehealth.org/patients/billing-and-insurance/",
    forms: "Eligibility specialist appointment and financial assistance guidance",
    patientItems: [
      "Proof of income",
      "Photo ID",
      "Proof of residency, if requested",
      "Insurance or AHCCCS information",
      "Billing statement",
    ],
    volunteerNotes:
      "Valleywise may route patients through eligibility specialists. Encourage the patient to schedule if direct application is required.",
  },
  {
    name: "Bristol Myers Squibb Patient Assistance Foundation",
    category: "Drug company assistance",
    focus: "Medication assistance for eligible uninsured patients",
    phone: "(800) 736-0003",
    website: "https://www.bmspaf.org/",
    forms: "BMSPAF application",
    patientItems: [
      "Signed patient authorization",
      "Prescription information",
      "Prescriber information",
      "Income documentation",
      "Insurance denial or coverage information, if applicable",
    ],
    volunteerNotes:
      "Common oncology medicines include Opdivo, Yervoy, Inrebic, Krazati, Onureg, Sprycel, and related BMS products.",
  },
  {
    name: "Genentech Access Solutions",
    category: "Drug company assistance",
    focus: "Benefits investigation, copay, and free drug programs",
    phone: "(888) 249-4918",
    website: "https://www.genentech-access.com/",
    forms: "Genentech Access Solutions enrollment forms",
    patientItems: [
      "Patient consent",
      "Prescription and diagnosis information",
      "Provider NPI, tax ID, phone, and fax",
      "Insurance card front and back",
      "Income documentation if applying for free medicine",
    ],
    volunteerNotes:
      "Common oncology medicines include Avastin, Herceptin, Kadcyla, Perjeta, Tecentriq, Tarceva, and Xeloda.",
  },
  {
    name: "Merck Access Program",
    category: "Drug company assistance",
    focus: "Insurance support and patient assistance",
    phone: "(855) 257-3932",
    website: "https://www.merckaccessprogram.com/",
    forms: "Merck Access Program enrollment",
    patientItems: [
      "Patient authorization",
      "Prescription information",
      "Provider information",
      "Insurance details",
      "Income documentation for assistance programs",
    ],
    volunteerNotes:
      "Common oncology medicine includes Keytruda. Confirm whether the patient needs copay support, free drug, or benefits investigation.",
  },
  {
    name: "Novartis Patient Assistance Foundation",
    category: "Drug company assistance",
    focus: "Free medication for eligible patients",
    website: "https://pap.novartis.com/",
    forms: "NPAF application",
    patientItems: [
      "Patient and prescriber application sections",
      "Prescription information",
      "Proof of income",
      "Insurance information",
    ],
    volunteerNotes:
      "Common oncology medicines include Kisqali, Tafinlar, Mekinist, Scemblix, Votrient, and Tasigna.",
  },
  {
    name: "Pfizer Oncology Together",
    category: "Drug company assistance",
    focus: "Oncology benefits, copay, and patient assistance",
    phone: "(844) 989-7284",
    website: "https://www.pfizeroncologytogether.com/",
    forms: "Pfizer Oncology Together enrollment forms",
    patientItems: [
      "Patient authorization",
      "Prescription information",
      "Provider information",
      "Insurance information",
      "Income documentation for free medicine programs",
    ],
    volunteerNotes:
      "Common oncology medicines include Ibrance, Inlyta, Lorbrena, Braftovi, Mektovi, Bosulif, and Xalkori.",
  },
];
