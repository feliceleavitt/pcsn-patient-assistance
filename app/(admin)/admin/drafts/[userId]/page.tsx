import Link from "next/link";
import { notFound } from "next/navigation";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";
import { createServiceClient } from "@/lib/supabase/server";

type DraftPayload = Record<string, unknown>;

const sectionLabels: Record<string, string> = {
  assistanceType: "Program",
  patient: "Patient",
  representative: "Caregiver or representative",
  diagnosis: "Treatment",
  provider: "Provider",
  hospital: "Hospital",
  insurance: "Insurance",
  household: "Household",
  consent: "Consent",
};

function humanize(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function hasMeaningfulValue(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value > 0;
  if (value === true) return true;
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (value && typeof value === "object") {
    return Object.values(value).some(hasMeaningfulValue);
  }
  return false;
}

function flattenAnswers(
  value: unknown,
  prefix = "",
): Array<{ label: string; value: string }> {
  if (typeof value === "string" && value.trim()) {
    return [{ label: humanize(prefix), value: value.trim() }];
  }
  if (typeof value === "number" && value > 0) {
    return [{ label: humanize(prefix), value: value.toLocaleString() }];
  }
  if (value === true) {
    return [{ label: humanize(prefix), value: "Yes" }];
  }
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string")) {
      const items = value.filter((item) => item.trim());
      return items.length
        ? [{ label: humanize(prefix), value: items.join(", ") }]
        : [];
    }
    return value.flatMap((item, index) =>
      flattenAnswers(item, `${prefix} ${index + 1}`),
    );
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      flattenAnswers(child, prefix ? `${prefix} — ${humanize(key)}` : key),
    );
  }
  return [];
}

export default async function DraftDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await requireAdminSession();
  const { data: draft } = await createServiceClient()
    .from("intake_drafts")
    .select("user_id,payload,created_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!draft) notFound();

  const payload = (draft.payload ?? {}) as DraftPayload;
  const sections = Object.entries(sectionLabels).map(([key, label]) => ({
    key,
    label,
    answers: flattenAnswers(payload[key]),
    started: hasMeaningfulValue(payload[key]),
  }));
  const startedSections = sections.filter((section) => section.started).length;
  const progress = Math.round((startedSections / sections.length) * 100);
  const patient = payload.patient as
    | { firstName?: string; lastName?: string; email?: string }
    | undefined;
  const applicant =
    [patient?.firstName, patient?.lastName].filter(Boolean).join(" ") ||
    patient?.email ||
    "Signed-in applicant";

  await recordAuditEvent({
    actorId: session.user.id,
    action: "view_intake_draft",
    metadata: { draftUserId: userId },
  });

  return (
    <main className="min-h-screen p-5 md:p-8">
      <div className="mx-auto grid max-w-5xl gap-6">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-pine">
            Back to dashboard
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-pine">
            Application in progress
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{applicant}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Started {new Date(draft.created_at).toLocaleString()} · Last saved{" "}
            {new Date(draft.updated_at).toLocaleString()}
          </p>
        </div>

        <section className="rounded-md border border-pine/20 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Saved progress</h2>
              <p className="mt-1 text-sm text-slate-600">
                {startedSections} of {sections.length} sections contain saved answers.
              </p>
            </div>
            <p className="text-2xl font-semibold text-pine">{progress}%</p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-mist">
            <div
              className="h-full rounded-full bg-pine"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            This percentage reflects sections with saved information, not final
            eligibility or readiness to submit.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.key}
              className="rounded-md bg-white p-5 shadow-soft"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{section.label}</h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    section.started
                      ? "bg-pine/10 text-pine"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {section.started ? "Saved" : "Not started"}
                </span>
              </div>
              {section.answers.length ? (
                <dl className="mt-4 grid gap-3 text-sm">
                  {section.answers.map((answer, index) => (
                    <div key={`${answer.label}-${index}`}>
                      <dt className="text-slate-500">{answer.label}</dt>
                      <dd className="mt-0.5 break-words text-ink">{answer.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  No meaningful answers have been saved in this section.
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
