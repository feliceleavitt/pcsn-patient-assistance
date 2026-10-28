import { CreateProgramCaseButton } from "@/components/admin/CreateProgramCaseButton";
import { readPublishedCatalog } from "@/lib/catalog/store";
import { withCatalogQuestions } from "@/lib/catalog/runtime";
import { routingPreview } from "@/lib/catalog/routing-preview";
import {
  profileSections,
  type Fact,
  type Profile,
} from "@/lib/assistance/profile";

function FactRow({ fact }: { fact: Fact }) {
  return (
    <li className="border-b border-slate-100 py-2 last:border-0">
      <span className="font-medium">{fact.label}: </span>
      {fact.state === "conflict" ? (
        <strong className="text-amber-800">Conflicting answers — volunteer review</strong>
      ) : fact.state === "unknown" ? (
        "Unknown — ask only if needed for this route"
      ) : fact.state === "not_applicable" ? (
        "Reported not applicable — confirm for this program"
      ) : (
        fact.evidence[0]?.value
      )}
      {fact.note ? <p className="mt-1 text-xs text-slate-600">{fact.note}</p> : null}
      {fact.evidence.length ? (
        <details className="mt-1 text-xs text-slate-600">
          <summary className="cursor-pointer">Source{fact.evidence.length > 1 ? "s" : ""}</summary>
          <ul className="mt-1 space-y-1 break-words">
            {fact.evidence.map((e) => <li key={e.source}>{e.source}: {e.value}</li>)}
          </ul>
        </details>
      ) : null}
    </li>
  );
}

function matchExplanation(state: string) {
  if (state === "MATCHED") return "Reported facts support volunteer review. The outside organization still determines eligibility.";
  if (state === "POSSIBLE") return "Some reported facts support review. Confirm the missing information before taking an external action.";
  return "Volunteer or administrator review is required before any external action.";
}

/** Server component. The audited published catalog is the only routing source shown here. */
type ExistingProgramCase = {
  id: string;
  program_id: string;
  application_status: string;
  assigned_to: string | null;
  follow_up_at: string | null;
};

export async function AssistancePlan({ profile: originalProfile, submissionId, existingCases = [] }: { profile: Profile; submissionId?: string; existingCases?: ExistingProgramCase[] }) {
  let catalog;
  try {
    catalog = await readPublishedCatalog();
  } catch {
    return <section role="alert" className="rounded-md bg-amber-50 p-5">Assistance Plan unavailable while the published catalog cannot be loaded. Existing patient details remain available below.</section>;
  }

  const profile = withCatalogQuestions(originalProfile, catalog.entries);
  const preview = routingPreview(catalog.entries, profile);
  const programs = new Map(catalog.entries.filter((entry) => entry.kind === "program").map((entry) => [entry.id, entry]));
  const documents = new Map(catalog.entries.filter((entry) => entry.kind === "document").map((entry) => [entry.id, entry]));
  const conflicts = Object.values(profile.facts).filter((fact) => fact.state === "conflict");

  return (
    <section aria-labelledby="assistance-plan-title" className="grid gap-5 rounded-md border border-pine/20 bg-white p-5 shadow-soft md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-pine">Volunteer navigation · audited catalog</p>
          <h2 id="assistance-plan-title" className="mt-1 text-2xl font-semibold">Assistance Plan</h2>
        </div>
        <span className="rounded-full bg-paper px-3 py-1 text-sm">{preview.length} audited {preview.length === 1 ? "route" : "routes"} to review</span>
      </div>
      <p className="text-sm leading-6 text-slate-600">Recommendations use the published audited catalog and the patient’s existing answers. Screening is preliminary: PCSN does not declare a patient eligible, and each organization makes its own decision.</p>

      {!preview.length ? <p className="rounded-md bg-paper p-3 text-sm">No audited route is ready to review from the currently known facts. This is not an eligibility decision.</p> : (
        <ul className="grid gap-3">
          {preview.map((route) => {
            const program = programs.get(route.programId);
            const existingCase = existingCases.find((item) => item.program_id === route.programId);
            const requiredDocuments = (program?.documentIds ?? []).map((id) => documents.get(id)?.name).filter((name): name is string => Boolean(name));
            return <li key={route.programId} className="rounded border border-pine/20 bg-pine/5 p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2"><strong className="text-base">{route.program}</strong><span className="rounded-full bg-white px-2 py-1 text-xs">Review needed · {route.actionType.replaceAll("_", " ")}</span></div>
              <p className="mt-2">{matchExplanation(route.matchState)}</p>
              <div className="mt-3 rounded-md bg-white/80 p-3"><p className="font-medium">Why it was suggested</p><ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-700">{route.rationale.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>
              <div className="mt-3 rounded-md bg-white/80 p-3 text-xs"><p className="font-medium">Verify before applying</p>{requiredDocuments.length ? <p className="mt-1">Required or helpful documents: {requiredDocuments.join("; ")}</p> : <p className="mt-1">No verified program-specific document checklist is available. Review the official source before requesting documents.</p>}{route.providerRequired ? <p className="mt-1">Provider action or consent may still be needed.</p> : null}<p className="mt-1">PCSN cannot confirm eligibility or whether the patient already receives this assistance; verify with the patient and program.</p></div>
              {existingCase ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-pine/30 bg-white p-3"><div><p className="font-medium">Already being tracked</p><p className="text-xs text-slate-600">Status: {existingCase.application_status.replaceAll("_", " ")}{existingCase.assigned_to ? ` · Assigned to ${existingCase.assigned_to}` : " · Unassigned"}{existingCase.follow_up_at ? ` · Follow up ${existingCase.follow_up_at.slice(0, 10)}` : ""}</p></div><a href="#active-applications" className="font-semibold text-pine underline">Open tracking record</a></div> : <div className="mt-3 flex flex-wrap items-center gap-3"><a className="text-pine underline" href={route.sourceUrl} target="_blank" rel="noreferrer">Review official program information</a>{submissionId ? <CreateProgramCaseButton submissionId={submissionId} programId={route.programId} /> : null}</div>}
            </li>;
          })}
        </ul>
      )}

      <p className="rounded-md bg-paper p-3 text-sm">External progress is unknown until a volunteer creates a program case and records work in its internal tracking fields. Creating a case does not submit an outside application or contact an organization.</p>

      <details className="rounded-md border border-pine/20 p-4">
        <summary className="cursor-pointer font-semibold">One reusable patient profile · facts and sources</summary>
        <p className="mt-2 text-sm text-slate-600">These are existing answers, not program-specific copies. Unknown, not applicable, zero, and false remain distinct.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">{profileSections.map((section) => <details key={section.label} className="rounded-md bg-paper p-3"><summary className="cursor-pointer font-medium">{section.label}</summary><ul className="text-sm">{section.keys.map((key) => <FactRow key={key} fact={profile.facts[key]} />)}</ul></details>)}</div>
      </details>

      {conflicts.length ? <div className="rounded-md border border-amber-300 bg-amber-50 p-4"><h3 className="font-semibold">Resolve conflicting intake facts</h3><ul className="text-sm">{conflicts.map((fact) => <FactRow key={fact.label} fact={fact} />)}</ul></div> : null}

      {profile.documents.length ? <details className="rounded-md border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold">Existing patient evidence ({profile.documents.length} uploads)</summary><p className="mt-2 text-sm">Check these before requesting documents again. An upload label does not prove program acceptance, ownership, or covered period.</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{profile.documents.map((document, index) => <li key={`${document.source}-${index}`}>{document.type.replaceAll("_", " ")} <span className="text-xs text-slate-500">— {document.source}</span><p className="mt-1 text-xs">No catalog requirement has been marked satisfied; review the relevant route checklist before relying on this upload.</p></li>)}</ul></details> : null}
    </section>
  );
}
