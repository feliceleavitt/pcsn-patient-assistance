import Link from "next/link";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { getDemoSubmissions, isDemoMode } from "@/lib/demo/admin";

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const submissions = isDemoMode()
    ? getDemoSubmissions()
    : (
        await createServiceClient()
          .from("submissions")
          .select(
            "id,status,created_at,patients(first_name,last_name),clinic_name,annual_income",
          )
          .order("created_at", { ascending: false })
      ).data;

  await recordAuditEvent({
    actorId: session.user.id,
    action: "view_dashboard",
    metadata: { visibleSubmissionCount: submissions?.length ?? 0 },
  });

  return (
    <main className="min-h-screen p-5 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-pine">
            Admin dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Submissions</h1>
        </div>
        <div className="overflow-hidden rounded-md bg-white shadow-soft">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-mist text-left">
              <tr>
                <th className="p-4">Patient</th>
                <th className="p-4">Clinic</th>
                <th className="p-4">Status</th>
                <th className="p-4">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {submissions?.map((submission) => {
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
                      {submission.status.replaceAll("_", " ")}
                    </td>
                    <td className="p-4">
                      {new Date(submission.created_at).toLocaleDateString()}
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
