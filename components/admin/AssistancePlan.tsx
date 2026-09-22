import { readPublishedCatalog } from "@/lib/catalog/store";
import { catalogPrograms, withCatalogQuestions } from "@/lib/catalog/runtime";
import {
  buildPlan,
  researchVersion,
  workflowStages,
} from "@/lib/assistance/plan";
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
        <strong className="text-amber-800">
          Conflicting answers — volunteer review
        </strong>
      ) : fact.state === "unknown" ? (
        "Unknown — ask only if needed for this route"
      ) : fact.state === "not_applicable" ? (
        "Reported not applicable — confirm for this program"
      ) : (
        fact.evidence[0]?.value
      )}
      {fact.note ? (
        <p className="mt-1 text-xs text-slate-600">{fact.note}</p>
      ) : null}
      {fact.evidence.length ? (
        <details className="mt-1 text-xs text-slate-600">
          <summary className="cursor-pointer">
            Source{fact.evidence.length > 1 ? "s" : ""}
          </summary>
          <ul className="mt-1 space-y-1 break-words">
            {fact.evidence.map((e) => (
              <li key={e.source}>
                {e.source}: {e.value}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}

/** Server component; no raw submission, SSN, document bytes or notes go to a client component. */
export async function AssistancePlan({
  profile: originalProfile,
}: {
  profile: Profile;
}) {
  let catalog;
  try {
    catalog = await readPublishedCatalog();
  } catch {
    return (
      <section role="alert" className="rounded-md bg-amber-50 p-5">
        Assistance Plan unavailable while the published catalog cannot be
        loaded. Existing patient details remain available below.
      </section>
    );
  }
  const profile = withCatalogQuestions(originalProfile, catalog.entries);
  const plan = buildPlan(
    profile,
    catalogPrograms(catalog.entries, profile, catalog.version),
  );
  const conflicts = Object.values(profile.facts).filter(
    (f) => f.state === "conflict",
  );
  const utility = plan.some((p) => p.applicationId === "az-des-direct-energy");
  return (
    <section
      aria-labelledby="assistance-plan-title"
      className="grid gap-5 rounded-md border border-pine/20 bg-white p-5 shadow-soft md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-pine">
            Volunteer navigation · read-only preview
          </p>
          <h2
            id="assistance-plan-title"
            className="mt-1 text-2xl font-semibold"
          >
            Assistance Plan
          </h2>
        </div>
        <span className="rounded-full bg-paper px-3 py-1 text-sm">
          {plan.length} program {plan.length === 1 ? "route" : "routes"} to
          review
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-600">
        Use the patient’s existing answers to decide what to do next. Screening
        is preliminary; each outside organization determines eligibility. The
        overall application status below, including “approved,” does not approve
        any individual program.
      </p>
      <p className="rounded-md bg-paper p-3 text-sm">
        Assignments, submission dates, decisions and follow-up dates are not
        saved in this preview. External progress is unknown until a volunteer
        records it in a future program case.
      </p>
      <details className="rounded-md border border-pine/20 p-4">
        <summary className="cursor-pointer font-semibold">
          One reusable patient profile · see facts and sources
        </summary>
        <p className="mt-2 text-sm text-slate-600">
          These are views of existing answers, not new program-specific copies.
          “Not applicable,” an unknown answer, zero and false remain different.
          Legacy boolean defaults still need confirmation.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {profileSections.map((section) => (
            <details key={section.label} className="rounded-md bg-paper p-3">
              <summary className="cursor-pointer font-medium">
                {section.label}
              </summary>
              <ul className="text-sm">
                {section.keys.map((key) => (
                  <FactRow key={key} fact={profile.facts[key]} />
                ))}
              </ul>
            </details>
          ))}
        </div>
      </details>
      {plan.length > 1 ? (
        <details
          open
          className="rounded-md border border-pine/20 bg-pine/5 p-4"
        >
          <summary className="cursor-pointer font-semibold">
            Shared facts · collected once, used across programs
          </summary>
          <ul className="mt-3 space-y-3 text-sm">
            {["members", "annualIncome", "monthlyIncome"].map((key) => (
              <li key={key}>
                <strong>{profile.facts[key].label}: </strong>
                {profile.facts[key].state === "known"
                  ? profile.facts[key].evidence[0]?.value
                  : "Needs clarification"}
                <p className="text-xs text-slate-600">
                  Same source:{" "}
                  {profile.facts[key].evidence[0]?.source ?? "not answered"}
                </p>
                <p className="mt-1">
                  Used by{" "}
                  {plan
                    .filter((card) => card.fields.includes(key))
                    .map((card) => card.name)
                    .join("; ")}
                  .
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-6">
            <strong>Different definitions still apply.</strong> Mayo needs
            tax-family and tax-year context; DES needs the shared energy
            household and recent 30-day income. These reported totals cannot
            substitute for either calculation.
          </p>
        </details>
      ) : null}
      {conflicts.length ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
          <h3 className="font-semibold">Resolve conflicting intake facts</h3>
          <ul className="text-sm">
            {conflicts.map((f) => (
              <FactRow key={f.label} fact={f} />
            ))}
          </ul>
        </div>
      ) : null}
      {profile.documents.length ? (
        <details className="rounded-md border border-slate-200 p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Existing patient evidence ({profile.documents.length} uploads)
          </summary>
          <p className="mt-2 text-sm">
            Check these before asking for documents again. Labels alone do not
            prove acceptance, ownership or covered period.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {profile.documents.map((d, i) => (
              <li key={`${d.source}-${i}`}>
                {d.type.replaceAll("_", " ")}{" "}
                <span className="text-xs text-slate-500">— {d.source}</span>
                <p className="mt-1 text-xs">
                  {plan
                    .flatMap((card) =>
                      card.evidence
                        .filter((e) => e.sources.includes(d.source))
                        .map((e) => `${card.name}: ${e.status}`),
                    )
                    .join(" · ") ||
                    "No selected pilot requirement mapped; keep in the existing record."}
                </p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {!plan.length ? (
        <div className="rounded-md bg-paper p-4">
          <h3 className="font-semibold">
            More information needed · no supported pilot route identified yet
          </h3>
          <p className="mt-2 text-sm leading-6">
            This preview only covers Mayo Arizona and the DES energy-assistance
            route. Other assistance remains in the existing patient record and
            worksheet. Volunteer next action: review the patient’s stated need
            and identify a supported route; this is not a finding of
            ineligibility.
          </p>
        </div>
      ) : null}
      {!utility ? (
        <p className="text-sm text-slate-600">
          Utility programs are not surfaced: no confirmed electricity/gas need
          is available. Missing utility answers do not mean the patient needs
          utility assistance. More information needed: if discussing financial
          needs, ask “Are you having trouble paying electricity or gas?” Do not
          assume the answer.
        </p>
      ) : (
        <div className="rounded-md border border-pine/20 bg-pine/5 p-4">
          <h3 className="font-semibold">
            One DES application · two separate programs
          </h3>
          <p className="mt-1 text-sm leading-6">
            LIHEAP and Power AZ share the direct application. Collect the facts
            once and submit once through the chosen DES route. Keep each
            program’s screening and eventual decision separate; do not send
            duplicate applications.
          </p>
        </div>
      )}
      <div className="grid gap-5">
        {plan.map((card) => (
          <article
            key={card.id}
            aria-labelledby={`program-${card.id}`}
            className="overflow-hidden rounded-md border border-slate-200"
          >
            <div className="border-b border-slate-200 bg-paper p-4 md:p-5">
              <h3 id={`program-${card.id}`} className="text-lg font-semibold">
                {card.name}
              </h3>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-600">Screening</dt>
                  <dd className="font-semibold text-amber-800">
                    {card.screening}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-600">
                    External application progress
                  </dt>
                  <dd>{card.progress}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm leading-6">
                <strong>Why this surfaced: </strong>
                {card.why}
              </p>
              <p className="mt-2 text-sm">
                <strong>PCSN’s role: </strong>
                {card.role}
              </p>
            </div>
            <div className="grid gap-5 p-4 md:p-5">
              <div className="rounded-md border border-slate-200 p-4">
                <h4 className="font-semibold">
                  Workflow · suggested next stage: {card.workflow}
                </h4>
                <p className="mt-1 text-xs text-slate-600">
                  Suggested from the current checklist. No stage is recorded as
                  completed; submission, follow-up and outcome remain untracked.
                </p>
                <ol
                  aria-label={`${card.name} workflow`}
                  className="mt-3 flex flex-wrap gap-2"
                >
                  {workflowStages.map((stage, index) => (
                    <li
                      key={stage}
                      aria-current={
                        index === card.suggestedStage ? "step" : undefined
                      }
                      className={`rounded-md border px-3 py-2 text-xs ${index === card.suggestedStage ? "border-pine bg-pine font-semibold text-white" : "border-slate-200 text-slate-600"}`}
                    >
                      {index + 1}. {stage}
                      {index === card.suggestedStage ? " · suggested" : ""}
                    </li>
                  ))}
                </ol>
              </div>
              <div
                className={`rounded-md border p-4 ${card.urgent ? "border-amber-300 bg-amber-50" : "border-pine/20 bg-pine/5"}`}
              >
                <h4 className="font-semibold">
                  {card.urgent ? "Time-sensitive next action" : "Next action"}
                </h4>
                <p className="mt-1 text-sm leading-6">{card.next}</p>
                <p className="mt-2 text-sm">
                  <strong>Responsible person: </strong>
                  {card.owner}
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <details className="rounded-md border border-slate-200 p-3">
                  <summary className="cursor-pointer font-semibold">
                    Available information ({card.available.length} reported
                    facts)
                  </summary>
                  <p className="mt-2 text-xs text-slate-600">
                    Reported, not verified or accepted by the program.
                  </p>
                  <ul className="mt-2 text-sm">
                    {card.available.map((f) => (
                      <FactRow key={f.key} fact={f} />
                    ))}
                  </ul>
                </details>
                <details
                  open
                  className="rounded-md border border-slate-200 p-3"
                >
                  <summary className="cursor-pointer font-semibold">
                    Missing facts / clarification ({card.missing.length})
                  </summary>
                  <p className="mt-2 text-xs text-slate-600">
                    A preparation checklist, not a count of official required
                    fields.
                  </p>
                  <ul className="mt-2 text-sm">
                    {card.missing.map((f) => (
                      <FactRow key={f.key} fact={f} />
                    ))}
                  </ul>
                  {!card.missing.length ? (
                    <p className="mt-2 text-sm">
                      Mapped answers are available. Program rules still need
                      review.
                    </p>
                  ) : null}
                  {card.notApplicable.length ? (
                    <>
                      <p className="mt-2 font-medium">
                        Reported not applicable — verify before omitting
                      </p>
                      <ul className="text-sm">
                        {card.notApplicable.map((f) => (
                          <FactRow key={f.key} fact={f} />
                        ))}
                      </ul>
                    </>
                  ) : null}
                </details>
              </div>
              <div>
                <h4 className="font-semibold">
                  Documents: available versus still needed
                </h4>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {["Available", "Missing", "Needs review", "Outdated"].map(
                    (status) => (
                      <div key={status} className="rounded-md bg-paper p-3">
                        <h5 className="text-sm font-semibold">
                          {status} (
                          {
                            card.evidence.filter((d) => d.status === status)
                              .length
                          }
                          )
                        </h5>
                        <ul className="mt-2 space-y-3 text-sm">
                          {card.evidence
                            .filter((d) => d.status === status)
                            .map((d) => (
                              <li key={d.id}>
                                <strong>{d.label}</strong>
                                <p className="mt-1">{d.applicability}</p>
                                {d.reviewNotes.map((note, i) => (
                                  <p
                                    key={i}
                                    className="mt-1 text-xs text-slate-600"
                                  >
                                    {note}
                                  </p>
                                ))}
                                {d.sources.length ? (
                                  <details className="mt-1 text-xs">
                                    <summary className="cursor-pointer text-pine">
                                      Reuse existing upload · source and other
                                      uses
                                    </summary>
                                    <ul>
                                      {d.sources.map((source) => (
                                        <li
                                          key={source}
                                          className="mt-2 break-words"
                                        >
                                          {source}
                                          <p>
                                            {plan
                                              .filter(
                                                (other) =>
                                                  other.id !== card.id &&
                                                  other.evidence.some((e) =>
                                                    e.sources.includes(source),
                                                  ),
                                              )
                                              .map((other) => other.name)
                                              .join("; ") ||
                                              "Only this pilot route currently references this upload."}
                                          </p>
                                        </li>
                                      ))}
                                    </ul>
                                  </details>
                                ) : (
                                  <p className="mt-1 text-xs text-slate-600">
                                    No classified upload identified. Check
                                    unclassified documents before requesting
                                    anything.
                                  </p>
                                )}
                              </li>
                            ))}
                        </ul>
                        {!card.evidence.some((d) => d.status === status) ? (
                          <p className="mt-1 text-xs text-slate-500">
                            None identified in this category.
                          </p>
                        ) : null}
                      </div>
                    ),
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  “Available” means explicitly reviewed for reuse on this route,
                  not accepted by the outside program. Existing legacy uploads
                  lack that review metadata and remain “Needs review.” Synthetic
                  reviews demonstrate the later workflow. Check unclassified
                  files before requesting a copy.
                </p>
              </div>
              <details className="rounded-md border border-slate-200 p-3" open>
                <summary className="cursor-pointer font-semibold">
                  Volunteer review before applying
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
                  {card.submissionInstructions ? (
                    <li>
                      <strong>Submission instructions: </strong>
                      {card.submissionInstructions}
                    </li>
                  ) : null}
                  {card.renewalDays !== undefined ? (
                    <li>
                      Renewal reminder: {card.renewalDays} days before the
                      recorded benefit end date. Reminder scheduling is not yet
                      enabled.
                    </li>
                  ) : null}
                  {card.reviews.map((review) => (
                    <li key={review}>{review}</li>
                  ))}
                </ul>
              </details>
              <div className="text-sm">
                <a
                  className="font-semibold text-pine underline"
                  href={card.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open official{" "}
                  {card.applicationId === "az-des-direct-energy"
                    ? "shared DES application"
                    : "Mayo application"}{" "}
                  ↗
                </a>
                <p className="mt-2 text-slate-600">
                  After applying: save the confirmation using the existing
                  upload workflow, record what was sent in volunteer notes, and
                  arrange follow-up. This preview does not submit anything.
                </p>
              </div>
              <details className="text-xs text-slate-600">
                <summary className="cursor-pointer">
                  Research sources and unresolved rules
                </summary>
                <p className="mt-2">
                  Published catalog {catalog.version} · original mapping{" "}
                  {researchVersion}, based on the PCSN cross-program field
                  matrix and research report. Rules requiring review are not
                  automated.
                </p>
                <ul className="mt-2 space-y-2">
                  {card.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        className="text-pine underline"
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {source.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
