import Link from "next/link";
import { PatientApplicationPanel } from "@/components/patient/PatientApplicationPanel";
import { PatientSignOutButton } from "@/components/patient/PatientSignOutButton";
import { requirePatientSession } from "@/lib/security/patient";
import { createServiceClient } from "@/lib/supabase/server";

export default async function PatientPortalPage() {
  const session = await requirePatientSession();
  const { data: application } = await createServiceClient()
    .from("submissions")
    .select("*,patients!inner(*),documents(*),assistance_packets(*)")
    .eq("patients.user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-paper p-5 md:p-8">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-pine">
              Patient profile
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Your PCSN request</h1>
            <p className="mt-2 text-sm text-slate-600">{session.user.email}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/intake"
              className="inline-flex h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink"
            >
              Start new request
            </Link>
            <PatientSignOutButton />
          </div>
        </header>

        {application ? (
          <PatientApplicationPanel
            application={{
              status: application.status,
              createdAt: application.created_at,
              missingDocuments: application.missing_documents,
              patient: application.patients,
              documents: application.documents.map(
                (document: {
                  id: string;
                  original_filename: string;
                  document_type: string;
                  uploaded_at: string;
                }) => ({
                  id: document.id,
                  originalFilename: document.original_filename,
                  documentType: document.document_type,
                  uploadedAt: document.uploaded_at,
                }),
              ),
              signatureRequests: application.assistance_packets.map(
                (packet: {
                  id: string;
                  program_name: string;
                  status: string;
                  signature_requested_at: string | null;
                  patient_signed_at: string | null;
                }) => ({
                  id: packet.id,
                  programName: packet.program_name,
                  status: packet.status,
                  signatureRequestedAt: packet.signature_requested_at,
                  patientSignedAt: packet.patient_signed_at,
                }),
              ),
            }}
          />
        ) : (
          <section className="grid gap-4 rounded-md bg-white p-6 shadow-soft">
            <h2 className="text-xl font-semibold">No application is linked yet.</h2>
            <p className="text-sm leading-6 text-slate-600">
              Start the application while signed in, and it will appear here so
              you can come back later to add missing information.
            </p>
            <Link
              href="/intake"
              className="inline-flex h-11 w-fit items-center rounded-md bg-pine px-4 text-sm font-semibold text-white"
            >
              Start application
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
