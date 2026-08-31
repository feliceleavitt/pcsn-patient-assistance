import Link from "next/link";
import { AdminAutoRefresh } from "@/components/admin/AdminAutoRefresh";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { getDemoSubmissions, isDemoMode } from "@/lib/demo/admin";

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const demoMode = isDemoMode();
  const supabase = demoMode ? null : createServiceClient();
  const [submissionsResult, draftsResult, viewsResult] = demoMode
    ? [
        { data: getDemoSubmissions() },
        { data: [] },
        {
          data: getDemoSubmissions()
            .filter((submission) => submission.first_viewed_at)
            .map((submission) => ({ submission_id: submission.id })),
        },
      ]
    : await Promise.all([
        supabase!
          .from("submissions")
          .select(
            "id,status,created_at,updated_at,patients(first_name,last_name),clinic_name,annual_income,assistance_type",
          )
          .order("created_at", { ascending: true }),
        supabase!
          .from("intake_drafts")
          .select("user_id,payload,created_at,updated_at")
          .order("created_at", { ascending: true }),
        supabase!
          .from("audit_logs")
          .select("submission_id")
          .eq("action", "view_submission")
          .not("submission_id", "is", null),
      ]);
  const submissions = submissionsResult.data;
  const drafts = draftsResult.data;
  const viewedSubmissionIds = new Set(
    viewsResult.data?.map((view) => view.submission_id) ?? [],
  );
  const newSubmissionCount =
    submissions?.filter((submission) => !viewedSubmissionIds.has(submission.id))
      .length ?? 0;

  await recordAuditEvent({
    actorId: session.user.id,
    action: "view_dashboard",
    metadata: { visibleSubmissionCount: submissions?.length ?? 0 },
  });

  return (
    <main className="min-h-screen p-5 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-pine">
              Admin dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Submissions</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Applications are sorted oldest to newest so volunteers can work in
              order.
            </p>
          </div>
          <AdminAutoRefresh />
        </div>

        <section className="grid gap-3 rounded-md border border-pine/20 bg-white p-5 shadow-soft md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-lg font-semibold">New application notifications</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {newSubmissionCount
                ? `${newSubmissionCount} new application${newSubmissionCount === 1 ? "" : "s"} need review.`
                : "No new applications are waiting right now."}
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex h-10 items-center justify-center rounded-md border border-pine/30 px-4 text-sm font-semibold text-pine"
          >
            Refresh list
          </Link>
        </section>

        <section className="grid gap-4">
          <div>
            <h2 className="text-xl font-semibold">Applications in progress</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {drafts?.length
                ? `${drafts.length} ${drafts.length === 1 ? "person has" : "people have"} started an application but have not submitted it.`
                : "No one currently has an application in progress."}
            </p>
          </div>
          {drafts?.length ? (
            <div className="overflow-hidden rounded-md bg-white shadow-soft">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-mist text-left">
                  <tr>
                    <th className="p-4">Applicant</th>
                    <th className="p-4">Started</th>
                    <th className="p-4">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((draft) => {
                    const payload = draft.payload as {
                      patient?: { firstName?: string; lastName?: string; email?: string };
                    };
                    const fullName = [
                      payload.patient?.firstName,
                      payload.patient?.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const applicant =
                      fullName || payload.patient?.email || "Signed-in applicant";

                    return (
                      <tr key={draft.user_id} className="border-t border-slate-200">
                        <td className="p-4 font-semibold text-ink">{applicant}</td>
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
          ) : null}
        </section>

        <div className="grid gap-3 rounded-md bg-mist p-4 text-sm text-slate-700 md:grid-cols-3">
          <div>
            <p className="font-semibold text-ink">Work order</p>
            <p>Oldest applications appear first.</p>
          </div>
          <div>
            <p className="font-semibold text-ink">Submitted time</p>
            <p>Use this to decide who should be reviewed next.</p>
          </div>
          <div>
            <p className="font-semibold text-ink">Last updated</p>
            <p>Changes to status, missing documents, or notes update the record.</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-md bg-white shadow-soft">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-mist text-left">
              <tr>
                <th className="p-4">Patient</th>
                <th className="p-4">Clinic</th>
                <th className="p-4">Assistance</th>
                <th className="p-4">Status</th>
                <th className="p-4">Submitted</th>
                <th className="p-4">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {submissions?.map((submission) => {
                const patient = submission.patients as {
                  first_name: string;
                  last_name: string;
                };
                const isNew = !viewedSubmissionIds.has(submission.id);
                return (
                  <tr
                    key={submission.id}
                    className={`border-t border-slate-200 ${isNew ? "bg-amber-50" : "bg-white"}`}
                  >
                    <td className="p-4">
                      <Link
                        className="inline-flex items-center gap-2 font-semibold text-pine"
                        href={`/admin/submissions/${submission.id}`}
                      >
                        {patient.first_name} {patient.last_name}
                        {isNew ? (
                          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-900">
                            New
                          </span>
                        ) : null}
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
                    <td className="p-4">
                      {new Date(submission.updated_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
