import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusControls } from "@/components/admin/StatusControls";
import { ArchiveControls } from "@/components/admin/ArchiveControls";
import { getArchivedSubmissionIds } from "@/lib/security/archive";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getDemoSubmission,
  isDemoMode,
  markDemoSubmissionViewed,
} from "@/lib/demo/admin";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const session = await requireAdminSession();
  const demoMode = isDemoMode();
  const supabase = demoMode ? null : createServiceClient();
  const submission = demoMode
    ? getDemoSubmission(submissionId)
    : (
        await supabase!
          .from("submissions")
          .select("*,patients(*),documents(*),admin_notes(*)")
          .eq("id", submissionId)
          .maybeSingle()
      ).data;

  if (!submission) notFound();
  const archivedSubmissionIds = await getArchivedSubmissionIds();
  if (demoMode) {
    markDemoSubmissionViewed(submissionId);
  }
  const treatmentFacilities = Array.isArray(submission.treatment_facilities)
    ? (submission.treatment_facilities as string[])
    : [];

  await recordAuditEvent({
    actorId: session.user.id,
    action: "view_submission",
    submissionId,
  });

  return (
    <main className="min-h-screen p-5 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm text-pine">
              Back to submissions
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">
              {submission.patients.first_name} {submission.patients.last_name}
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <ArchiveControls
              submissionId={submissionId}
              archived={archivedSubmissionIds.has(submissionId)}
            />
            <a
              className="inline-flex h-11 items-center rounded-md bg-pine px-4 text-sm font-semibold text-white"
              href={`/api/admin/submissions/${submissionId}/packet`}
            >
              Export patient packet PDF
            </a>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="grid gap-5 rounded-md bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Patient details</h2>
            <dl className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <dt className="text-slate-500">Date of birth</dt>
                <dd>{submission.patients.date_of_birth}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd>{submission.patients.phone}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd>{submission.patients.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Cancer type</dt>
                <dd>{submission.cancer_type}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Assistance needed</dt>
                <dd>{submission.assistance_type.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Medication requested</dt>
                <dd>{submission.medication_requested || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Clinic</dt>
                <dd>{submission.clinic_name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Provider NPI</dt>
                <dd>{submission.provider_npi}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Hospital account</dt>
                <dd>{submission.hospital_account_number || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Arizona care sites</dt>
                <dd>
                  {treatmentFacilities.length
                    ? treatmentFacilities.join(", ")
                    : "None selected"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Annual income</dt>
                <dd>${Number(submission.annual_income).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Monthly income</dt>
                <dd>${Number(submission.monthly_income).toLocaleString()}</dd>
              </div>
            </dl>
            <div className="grid gap-3">
              <h3 className="font-semibold">Household members</h3>
              {submission.household_members.map(
                (member: {
                  name: string;
                  relationship: string;
                  age: number;
                  isAdult: boolean;
                  incomeSources: string[];
                }) => (
                  <div key={`${member.name}-${member.relationship}`} className="rounded-md bg-paper p-3 text-sm">
                    <p className="font-medium">
                      {member.name} ({member.relationship})
                    </p>
                    <p className="text-slate-600">
                      Age {member.age} · {member.isAdult ? "Adult" : "Minor"}
                    </p>
                    {member.isAdult ? (
                      <p className="text-slate-600">
                        Income sources: {member.incomeSources.filter(Boolean).join(", ") || "None listed"}
                      </p>
                    ) : null}
                  </div>
                ),
              )}
            </div>
            <div className="grid gap-3">
              <h3 className="font-semibold">Uploaded documents</h3>
              {submission.documents.length ? (
                submission.documents.map((document: { id: string; original_filename: string; document_type: string }) => (
                  <a
                    key={document.id}
                    className="text-sm text-pine"
                    href={`/api/admin/submissions/${submissionId}/documents/${document.id}/download`}
                  >
                    {document.document_type.replaceAll("_", " ")}: {document.original_filename}
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-500">No documents uploaded.</p>
              )}
            </div>
            <div className="grid gap-3">
              <h3 className="font-semibold">Enrollment form worksheet</h3>
              <p className="text-sm leading-6 text-slate-600">
                Use this section when transferring information into patient
                assistance, hospital financial assistance, or foundation forms.
              </p>
              <dl className="grid gap-3 rounded-md bg-paper p-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Patient full name</dt>
                  <dd>
                    {submission.patients.first_name} {submission.patients.last_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Date of birth</dt>
                  <dd>{submission.patients.date_of_birth}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Phone</dt>
                  <dd>{submission.patients.phone}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd>{submission.patients.email}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Diagnosis</dt>
                  <dd>{submission.cancer_type}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Medication</dt>
                  <dd>{submission.medication_requested || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Prescriber/provider</dt>
                  <dd>{submission.provider_name}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Provider NPI</dt>
                  <dd>{submission.provider_npi}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Provider phone</dt>
                  <dd>{submission.provider_phone}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Provider fax</dt>
                  <dd>{submission.provider_fax || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Clinic address</dt>
                  <dd>
                    {submission.provider_address_line_1}
                    {submission.provider_address_line_2
                      ? `, ${submission.provider_address_line_2}`
                      : ""}
                    , {submission.provider_city}, {submission.provider_state}{" "}
                    {submission.provider_postal_code}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Hospital account number</dt>
                  <dd>{submission.hospital_account_number || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Arizona care sites</dt>
                  <dd>
                    {treatmentFacilities.length
                      ? treatmentFacilities.join(", ")
                      : "None selected"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Household size</dt>
                  <dd>{submission.household_size}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Annual household income</dt>
                  <dd>${Number(submission.annual_income).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
            <div className="grid gap-3">
              <h3 className="font-semibold">Notes</h3>
              {submission.admin_notes.length ? (
                submission.admin_notes.map((note: { id: string; note: string; created_at: string }) => (
                  <div key={note.id} className="rounded-md bg-paper p-3 text-sm">
                    <p>{note.note}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No notes yet.</p>
              )}
            </div>
          </section>
          <StatusControls
            submissionId={submissionId}
            initialStatus={submission.status}
            initialMissingDocuments={submission.missing_documents}
          />
        </div>
      </div>
    </main>
  );
}
