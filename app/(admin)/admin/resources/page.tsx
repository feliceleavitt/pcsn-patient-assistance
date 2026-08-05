import Link from "next/link";
import { volunteerResources } from "@/lib/resources";
import { recordAuditEvent } from "@/lib/security/audit";
import { requireAdminSession } from "@/lib/security/admin";

export default async function VolunteerResourcesPage() {
  const session = await requireAdminSession();
  await recordAuditEvent({
    actorId: session.user.id,
    action: "view_resources",
    metadata: { resourceCount: volunteerResources.length },
  });

  const hospitalResources = volunteerResources.filter(
    (resource) => resource.category === "Hospital / cancer center",
  );
  const medicationResources = volunteerResources.filter(
    (resource) => resource.category === "Drug company assistance",
  );

  return (
    <main className="min-h-screen p-5 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <div>
          <Link href="/admin" className="text-sm text-pine">
            Back to submissions
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-pine">
            Volunteer resources
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            Applications, contacts, and document checklists
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Use this page as a starting point before contacting a hospital,
            cancer center, insurer, manufacturer, or assistance foundation.
            Program rules and forms can change, so verify the linked page before
            submitting anything for a patient.
          </p>
        </div>

        <section className="grid gap-4">
          <h2 className="text-xl font-semibold">Arizona hospital and cancer center programs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {hospitalResources.map((resource) => (
              <ResourceCard key={resource.name} resource={resource} />
            ))}
          </div>
        </section>

        <section className="grid gap-4">
          <h2 className="text-xl font-semibold">Drug company patient assistance programs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {medicationResources.map((resource) => (
              <ResourceCard key={resource.name} resource={resource} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function ResourceCard({
  resource,
}: {
  resource: (typeof volunteerResources)[number];
}) {
  return (
    <article className="grid gap-4 rounded-md bg-white p-5 shadow-soft">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-pine">
          {resource.category}
        </p>
        <h3 className="mt-1 text-lg font-semibold">{resource.name}</h3>
        <p className="mt-1 text-sm text-slate-600">{resource.focus}</p>
      </div>

      <dl className="grid gap-2 text-sm">
        {resource.phone ? (
          <div>
            <dt className="font-medium text-ink">Phone</dt>
            <dd>{resource.phone}</dd>
          </div>
        ) : null}
        {resource.forms ? (
          <div>
            <dt className="font-medium text-ink">Forms / portal</dt>
            <dd>{resource.forms}</dd>
          </div>
        ) : null}
      </dl>

      <div>
        <p className="text-sm font-medium text-ink">Usually needed from the patient</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
          {resource.patientItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <p className="rounded-md bg-paper p-3 text-sm leading-6 text-slate-700">
        {resource.volunteerNotes}
      </p>

      <a
        className="inline-flex h-10 items-center justify-center rounded-md border border-pine/30 px-4 text-sm font-semibold text-pine"
        href={resource.website}
        rel="noreferrer"
        target="_blank"
      >
        Open resource
      </a>
    </article>
  );
}
