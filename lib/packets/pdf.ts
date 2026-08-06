import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Patient = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  email: string;
  address_line_1?: string;
  address_line_2?: string | null;
  city?: string;
  state?: string;
  postal_code?: string;
};

type PacketSubmission = {
  assistance_type: string;
  cancer_type: string;
  diagnosis_date: string;
  treatment_plan: string;
  treatment_start_date?: string | null;
  medication_requested?: string | null;
  clinic_name: string;
  provider_name: string;
  provider_npi: string;
  provider_phone: string;
  provider_fax?: string | null;
  provider_address_line_1: string;
  provider_address_line_2?: string | null;
  provider_city: string;
  provider_state: string;
  provider_postal_code: string;
  hospital_account_number?: string | null;
  guarantor_number?: string | null;
  treatment_facilities?: string[] | null;
  insurance_details?: Record<string, unknown>;
  monthly_income: number | string;
  annual_income: number | string;
  household_size: number;
  employment_status: string;
  missing_documents?: string[];
  status?: string;
  patients: Patient;
  documents?: Array<{ document_type: string; original_filename: string }>;
  household_members?: Array<{
    name: string;
    relationship: string;
    age: number;
    isAdult: boolean;
    incomeSources?: string[];
  }>;
};

type AssistancePacket = {
  program_name: string;
  program_type: string;
  program_url?: string | null;
  program_phone?: string | null;
  patient_signature?: string | null;
  patient_signed_at?: string | null;
  fax_number?: string | null;
  faxed_at?: string | null;
  fax_confirmation?: string | null;
};

function dollars(value: number | string) {
  return `$${Number(value).toLocaleString()}`;
}

function normalize(value: unknown) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export async function buildPatientPacketPdf({
  submission,
  packet,
}: {
  submission: PacketSubmission;
  packet?: AssistancePacket | null;
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [612, 792];
  let page = pdf.addPage(pageSize);
  let y = 744;

  const addPage = () => {
    page = pdf.addPage(pageSize);
    y = 744;
  };

  const writeLine = (label: string, value?: unknown) => {
    const text = value === undefined ? label : `${label}: ${normalize(value)}`;
    const maxLength = 92;
    const chunks = text.match(new RegExp(`.{1,${maxLength}}(\\\\s|$)`, "g")) ?? [text];
    chunks.forEach((chunk, index) => {
      if (y < 56) addPage();
      page.drawText(chunk.trim(), {
        x: index === 0 ? 48 : 64,
        y,
        size: 10,
        font: regular,
        color: rgb(0.09, 0.13, 0.15),
      });
      y -= 15;
    });
  };

  const heading = (text: string) => {
    if (y < 80) addPage();
    y -= 8;
    page.drawText(text, {
      x: 48,
      y,
      size: 14,
      font: bold,
      color: rgb(0.04, 0.27, 0.22),
    });
    y -= 22;
  };

  page.drawText("Phoenix Cancer Support Network", {
    x: 48,
    y,
    size: 16,
    font: bold,
    color: rgb(0.04, 0.27, 0.22),
  });
  y -= 24;
  page.drawText("Financial Assistance Packet", {
    x: 48,
    y,
    size: 13,
    font: regular,
    color: rgb(0.09, 0.13, 0.15),
  });
  y -= 24;

  if (packet) {
    heading("Selected program");
    writeLine("Program", packet.program_name);
    writeLine("Program type", packet.program_type);
    writeLine("Phone", packet.program_phone);
    writeLine("Website", packet.program_url);
  }

  heading("Patient");
  writeLine("Name", `${submission.patients.first_name} ${submission.patients.last_name}`);
  writeLine("Date of birth", submission.patients.date_of_birth);
  writeLine("Phone", submission.patients.phone);
  writeLine("Email", submission.patients.email);
  writeLine(
    "Address",
    [
      submission.patients.address_line_1,
      submission.patients.address_line_2,
      submission.patients.city,
      submission.patients.state,
      submission.patients.postal_code,
    ]
      .filter(Boolean)
      .join(", "),
  );

  heading("Treatment");
  writeLine("Assistance needed", submission.assistance_type.replaceAll("_", " "));
  writeLine("Cancer type", submission.cancer_type);
  writeLine("Diagnosis date", submission.diagnosis_date);
  writeLine("Treatment plan", submission.treatment_plan);
  writeLine("Treatment start date", submission.treatment_start_date);
  writeLine("Medication", submission.medication_requested);
  writeLine("Arizona care sites", submission.treatment_facilities);
  writeLine("Hospital account number", submission.hospital_account_number);
  writeLine("Person responsible for bill number", submission.guarantor_number);

  heading("Prescriber / provider");
  writeLine("Clinic", submission.clinic_name);
  writeLine("Provider", submission.provider_name);
  writeLine("NPI", submission.provider_npi);
  writeLine("Phone", submission.provider_phone);
  writeLine("Fax", submission.provider_fax);
  writeLine(
    "Address",
    [
      submission.provider_address_line_1,
      submission.provider_address_line_2,
      submission.provider_city,
      submission.provider_state,
      submission.provider_postal_code,
    ]
      .filter(Boolean)
      .join(", "),
  );

  heading("Insurance and household");
  writeLine("Health insurance company", submission.insurance_details?.medicalCarrier);
  writeLine("Health insurance member ID", submission.insurance_details?.medicalMemberId);
  writeLine("Prescription insurance company", submission.insurance_details?.pharmacyCarrier);
  writeLine("Prescription insurance member ID", submission.insurance_details?.pharmacyMemberId);
  writeLine("Medicare", submission.insurance_details?.hasMedicare);
  writeLine("Medicaid", submission.insurance_details?.hasMedicaid);
  writeLine("Monthly household income", dollars(submission.monthly_income));
  writeLine("Annual household income", dollars(submission.annual_income));
  writeLine("Household size", submission.household_size);
  writeLine("Employment status", submission.employment_status);

  if (submission.household_members?.length) {
    heading("Household members");
    submission.household_members.forEach((member) => {
      writeLine(
        member.name,
        `${member.relationship}, age ${member.age}, ${member.isAdult ? "adult" : "minor"}${
          member.incomeSources?.length
            ? `, income sources: ${member.incomeSources.join(", ")}`
            : ""
        }`,
      );
    });
  }

  heading("Documents");
  writeLine("Current status", submission.status?.replaceAll("_", " "));
  writeLine("Missing documents", submission.missing_documents);
  writeLine("Uploaded documents", submission.documents?.length ?? 0);
  submission.documents?.forEach((document) => {
    writeLine(document.document_type.replaceAll("_", " "), document.original_filename);
  });

  heading("Patient authorization");
  writeLine(
    "PCSN authorization",
    "Patient authorized release of medical and financial information and permission for PCSN to contact providers, hospitals, insurers, manufacturers, and assistance foundations during intake.",
  );
  if (packet?.patient_signature) {
    writeLine("Electronic signature", packet.patient_signature);
    writeLine(
      "Signed at",
      packet.patient_signed_at ? new Date(packet.patient_signed_at).toLocaleString() : undefined,
    );
  } else {
    writeLine("Electronic signature", "Not signed yet");
  }

  if (packet?.fax_number || packet?.faxed_at || packet?.fax_confirmation) {
    heading("Fax / submission log");
    writeLine("Fax number", packet.fax_number);
    writeLine(
      "Faxed at",
      packet.faxed_at ? new Date(packet.faxed_at).toLocaleString() : undefined,
    );
    writeLine("Confirmation", packet.fax_confirmation);
  }

  return pdf.save();
}
