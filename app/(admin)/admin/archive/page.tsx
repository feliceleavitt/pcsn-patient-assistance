import Link from "next/link";
import { recordAuditEvent } from "@/lib/security/audit";
import {
  getArchivedDraftUserIds,
  getArchivedSubmissionIds,
} from "@/lib/security/archive";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { getDemoSubmissions, isDemoMode } from "@/lib/demo/admin";

export default async function ArchivedApplicationsPage() {
  const session = await requireAdminSession();
  const [archivedIds, archivedDraftUserIds] = await Promise.all([
    getArchivedSubmissionIds(),
    getArchivedDraftUserIds(),
  ]);
  const submissions = isDemoMode()
    ? getDemoSubmissions().filter((submission) => archivedIds.has(submission.id))
    : archivedIds.size
      ? (
          await createServiceClient()
            .from("submissions")
            .select(
              "id,status,created_at,updated_at,patients(first_name,last_name),clinic_name,assistance_type",
            )
            .in("id", [...archivedIds])
            .order("updated_at", { ascending: false })
        ).data
      : [];
  const archivedDrafts = archivedDraftUserIds.size
    ? (
        await createServiceClient()
          .from("intake_drafts")
          .select("user_id,payload,created_at,updated_at")
          .in("user_id", [...archivedDraftUserIds])
          .order("updated_at", { ascending: false })
      ).data
    : [];

  await recordAuditEvent({
    actorId: session.user.id,
    action: "view_archives",
    metadata: {
      archivedSubmissionCount: submissions?.length ?? 0,
      archivedDraftCount: archivedDrafts?.length ?? 0,
    },
  });

  return (
    <main className="min-h-screen p-5 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-pine">
            Back to active applications
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-pine">
            Volunteer archive
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Archived applications</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Archived applications remain available for reference and can be
            restored to the active dashboard at any time.
          </p>
        </div>

        <section className="grid gap-4">
          <div>
            <h2 className="text-xl font-semibold">In-progress applications</h2>
            <p className="mt-1 text-sm text-slate-600">
              Saved drafts that have not been submitted.
            </p>
          </div>
          {archivedDrafts?.length ? (
            <div className="overflow-hidden rounded-md bg-white shadow-soft">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-mist text-left">
                  <tr>
                    <th className="p-4">Applicant</th>
                    <th className="p-4">Started</th>
                    <th className="p-4">Last saved</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedDrafts.map((draft) => {
                    const payload = draft.payload as {
                      patient?: {
                        firstName?: string;
                        lastName?: string;
                        email?: string;
                      };
                    };
                    const applicant =
                      [payload.patient?.firstName, payload.patient?.lastName]
                        .filter(Boolean)
                        .join(" ") ||
                      payload.patient?.email ||
                      "Signed-in applicant";
                    return (
                      <tr key={draft.user_id} className="border-t border-slate-200">
                        <td className="p-4">
                          <Link
                            className="font-semibold text-pine"
                            href={`/admin/drafts/${draft.user_id}`}
                          >
                            {applicant}
                          </Link>
                        </td>
                        <td className="p-4">
                          {new Date(draft.created_at).toLocaleString()}
                        </td>
                        <td className="p-4">
                          {new Date(draft.updated_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-md bg-white p-5 text-sm text-slate-600 shadow-soft">
              No in-progress applications have been archived.
            </p>
          )}
        </section>

        <section className="grid gap-4">
          <h2 className="text-xl font-semibold">Submitted applications</h2>
        {submissions?.length ? (
          <div className="overflow-hidden rounded-md bg-white shadow-soft">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-mist text-left">
                <tr>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Clinic</th>
                  <th className="p-4">Assistance</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => {
                  const patient = submission.patients as {
                    first_name: string;
                    last_name: string;
                  };
                  return (
                    <tr key={submission.id} className="border-t border-slate-200">
                      <td className="p-4">
                        <Link
                          className="font-semibold text-pine"
                          href={`/admin/submissions/${submission.id}`}
                        >
                          {patient.first_name} {patient.last_name}
                        </Link>
                      </td>
                      <td className="p-4">{submission.clinic_name}</td>
                      <td className="p-4">
                        {submission.assistance_type.replaceAll("_", " ")}
                      </td>
                      <td className="p-4">
                        {submission.status.replaceAll("_", " ")}
                      </td>
                      <td className="p-4">
                        {new Date(submission.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-md bg-white p-5 text-sm text-slate-600 shadow-soft">
            No applications have been archived.
          </p>
        )}
        </section>
      </div>
    </main>
  );
}
