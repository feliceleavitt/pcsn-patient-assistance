import {casesEnabled,followUpDue} from "@/lib/assistance/cases";
import { canManageCatalog } from "@/lib/catalog/access";
import Link from "next/link";
import { AdminAutoRefresh } from "@/components/admin/AdminAutoRefresh";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { getDemoSubmissions, isDemoMode } from "@/lib/demo/admin";
import {
  getArchivedDraftUserIds,
  getArchivedSubmissionIds,
} from "@/lib/security/archive";

export default async function AdminDashboardPage({searchParams}: {searchParams:Promise<{q?:string;status?:string;owner?:string;due?:string}>}) {
  const filters = await searchParams;
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
            "id,status,created_at,updated_at,patients(first_name,last_name),clinic_name,annual_income,assistance_type,missing_documents",
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
  const caseResult = casesEnabled() && supabase ? await supabase.from("program_cases").select("*") : {data:[],error:null};
  const programCases = caseResult.data ?? [];
  const submissions = submissionsResult.data;
  const drafts = draftsResult.data;
  const [archivedSubmissionIds, archivedDraftUserIds] = await Promise.all([
    getArchivedSubmissionIds(),
    getArchivedDraftUserIds(),
  ]);
  const activeDrafts = drafts?.filter(
    (draft) => !archivedDraftUserIds.has(draft.user_id),
  );
  const activeSubmissions = submissions?.filter(
    (submission) => {
      const patient = submission.patients as {first_name:string;last_name:string};
      const cases = programCases.filter(c=>c.submission_id===submission.id);
      return !archivedSubmissionIds.has(submission.id) && (!filters.q || `${patient.first_name} ${patient.last_name} ${submission.clinic_name}`.toLowerCase().includes(filters.q.toLowerCase())) && (!filters.status || submission.status === filters.status) && (!filters.owner || cases.some(c=>String(c.assigned_to).toLowerCase().includes(filters.owner!.toLowerCase()))) && (filters.due !== '1' || cases.some(c=>followUpDue(c)));
    },
  );
  const viewedSubmissionIds = new Set(
    viewsResult.data?.map((view) => view.submission_id) ?? [],
  );
  const newSubmissionCount =
    activeSubmissions?.filter(
      (submission) => !viewedSubmissionIds.has(submission.id),
    )
      .length ?? 0;

  await recordAuditEvent({
    actorId: session.user.id,
    action: "view_dashboard",
    metadata: { visibleSubmissionCount: submissions?.length ?? 0 },
  });

  return (
    <main className="min-h-screen p-5 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        {canManageCatalog(session.role, session.user.email, demoMode) ? <Link href="/admin/catalog" className="text-pine underline">Manage program & resource library</Link> : null}
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
            <div className="flex flex-wrap items-center gap-3">
              {demoMode ? <Link href="/admin/assistance-plan-preview" className="inline-flex h-10 items-center rounded-md bg-pine px-4 text-sm font-semibold text-white">Synthetic Assistance Plan preview</Link> : null}
              <Link
                href="/admin/archive"
                className="inline-flex h-10 items-center rounded-md border border-pine/30 bg-white px-4 text-sm font-semibold text-pine"
              >
                Archive ({archivedSubmissionIds.size + archivedDraftUserIds.size})
              </Link>
              <AdminAutoRefresh />
            </div>
        </div>

        <section className="grid gap-3 rounded-md border border-pine/20 bg-white p-5 shadow-soft md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-lg font-semibold">New application notifications</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {newSubmissionCount
                ? `${newSubmissionCount} new application${newSubmissionCount === 1 ? "" : "s"} ${newSubmissionCount === 1 ? "needs" : "need"} review.`
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
              {activeDrafts?.length
                ? `${activeDrafts.length} ${activeDrafts.length === 1 ? "person has" : "people have"} started an application but ${activeDrafts.length === 1 ? "has" : "have"} not submitted it.`
                : "No one currently has an application in progress."}
            </p>
          </div>
          {activeDrafts?.length ? (
        <div className="overflow-x-auto rounded-md bg-white shadow-soft">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-mist text-left">
                  <tr>
                    <th className="p-4">Applicant</th>
                    <th className="p-4">Started</th>
                    <th className="p-4">Last active</th>
                    <th className="p-4">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDrafts.map((draft) => {
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
                        <td className="p-4 font-semibold text-ink">
                          <Link
                            className="text-pine"
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
                        <td className="p-4">
                          <Link
                            className="font-semibold text-pine"
                            href={`/admin/drafts/${draft.user_id}`}
                          >
                            View saved answers
                          </Link>
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
            <p>Oldest applications appear first. “New” means no volunteer has opened the request yet.</p>
          </div>
          <div>
            <p className="font-semibold text-ink">Submitted time</p>
            <p>Use this to decide who should be reviewed next.</p>
          </div>
          <div>
            <p className="font-semibold text-ink">Last updated</p>
            <p>Changes to status, missing documents, or notes update the record. Program work shows saved ownership and follow-up when case storage is enabled; check internal notes for additional context.</p>
          </div>
        </div>
        <form method="get" className="grid gap-3 rounded-md bg-white p-4 sm:grid-cols-2"><label>Search patient or clinic<input name="q" defaultValue={filters.q} className="block min-h-11 w-full border p-2"/></label><label>Status<select name="status" defaultValue={filters.status || ''} className="block min-h-11 w-full border p-2"><option value="">All statuses</option>{['submitted','under_review','missing_documents','approved','denied','renewal_needed'].map(v=><option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select></label><label>Assigned volunteer<input name="owner" defaultValue={filters.owner} className="block min-h-11 w-full border p-2"/></label><label className="flex items-center gap-3"><input type="checkbox" name="due" value="1" defaultChecked={filters.due === '1'}/>Follow-up / renewal due</label><button className="min-h-11 rounded bg-pine px-4 text-white">Apply filters</button><Link className="p-3 underline" href="/admin">Clear filters</Link></form>
        {caseResult.error ? <p role="alert">Program work information could not be loaded. Do not assume cases are unassigned.</p> : null}
        <div className="overflow-x-auto rounded-md bg-white shadow-soft">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-mist text-left">
              <tr>
                <th className="p-4">Patient</th>
                <th className="p-4">Clinic</th>
                <th className="p-4">Assistance</th>
                <th className="p-4">Status / next action</th>
                <th className="p-4">Program work</th>
                <th className="p-4">Submitted</th>
                <th className="p-4">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {activeSubmissions?.map((submission) => {
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
                      {submission.status.replaceAll("_", " ").replace(/^./, (c:string)=>c.toUpperCase())}
                      <p className="mt-2 text-sm font-semibold">{isNew ? "Next: review new request" : submission.missing_documents?.length ? "Next: follow up on missing documents" : submission.status === "approved" ? "Review program outcomes separately" : "Next: review latest updates and plan"}</p>
                      {submission.missing_documents?.length ? <ul className="mt-1 list-inside list-disc text-sm">{submission.missing_documents.map((item: string) => <li key={item}>{item}</li>)}</ul> : <p className="mt-1 text-sm text-slate-600">No missing documents recorded; requirements may still need review.</p>}
                    </td>
                    <td className="min-w-64 p-4">{programCases.filter(c=>c.submission_id===submission.id).map(c=><div key={c.id} className="mb-3 border-b pb-2"><strong>{c.program_name}: {c.status.replaceAll('_',' ')}</strong><p>Owner: {c.assigned_to || 'Unassigned'} · Priority: {c.priority}</p><p>Next: {c.next_action || 'Not recorded'}</p><p>Missing documents: {c.missing_documents.split('\n').filter((v:string)=>v.trim()).length}</p><p>Follow-up: {c.follow_up_date || 'Not set'} {followUpDue(c)?'— Due for follow-up / renewal':''}</p><p>Last contact: {c.last_contact_date || 'Not recorded'}</p></div>)}{!programCases.some(c=>c.submission_id===submission.id)?'No saved program cases':''}</td>
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
