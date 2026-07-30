import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { getDemoSubmission, isDemoMode } from "@/lib/demo/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await requireAdminSession();
  const { submissionId } = await params;
  const submission = isDemoMode()
    ? getDemoSubmission(submissionId)
    : (
        await createServiceClient()
          .from("submissions")
          .select("*,patients(*),documents(*)")
          .eq("id", submissionId)
          .maybeSingle()
      ).data;

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 748;

  const write = (text: string, emphasized = false) => {
    page.drawText(text, {
      x: 48,
      y,
      size: emphasized ? 14 : 10,
      font: emphasized ? bold : font,
      color: rgb(0.09, 0.13, 0.15),
    });
    y -= emphasized ? 24 : 16;
  };

  write("Financial Assistance Patient Packet", true);
  write(`Assistance needed: ${submission.assistance_type.replaceAll("_", " ")}`);
  write(`Patient: ${submission.patients.first_name} ${submission.patients.last_name}`);
  write(`Date of birth: ${submission.patients.date_of_birth}`);
  write(`Phone: ${submission.patients.phone}`);
  write(`Email: ${submission.patients.email}`);
  y -= 8;
  write("Clinical information", true);
  write(`Cancer type: ${submission.cancer_type}`);
  write(`Diagnosis date: ${submission.diagnosis_date}`);
  write(`Treatment plan: ${submission.treatment_plan}`);
  write(`Medication requested: ${submission.medication_requested || "N/A"}`);
  write(`Clinic: ${submission.clinic_name}`);
  write(`Provider: ${submission.provider_name}`);
  write(`Provider NPI: ${submission.provider_npi}`);
  write(`Hospital account number: ${submission.hospital_account_number || "N/A"}`);
  y -= 8;
  write("Financial information", true);
  write(`Monthly income: $${Number(submission.monthly_income).toLocaleString()}`);
  write(`Annual income: $${Number(submission.annual_income).toLocaleString()}`);
  write(`Household size: ${submission.household_size}`);
  write(`Employment status: ${submission.employment_status}`);
  y -= 8;
  write("Review summary", true);
  write(`Status: ${submission.status.replaceAll("_", " ")}`);
  write(`Missing documents: ${submission.missing_documents.join(", ") || "None"}`);
  write(`Uploaded documents: ${submission.documents.length}`);

  const bytes = await pdf.save();

  await recordAuditEvent({
    actorId: session.user.id,
    action: "download_packet",
    submissionId,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="patient-packet.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
