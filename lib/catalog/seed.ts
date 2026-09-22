import { legacyMedications } from "./legacy-medications";
import { adaptSubmission } from "../assistance/profile";
import { programs } from "../assistance/plan";
import { arizonaTreatmentFacilities, volunteerResources } from "../resources";
import { blankEntry, type Entry, type CatalogState } from "./model";
export function seedEntries(): Entry[] {
  const entries: Entry[] = [];
  const base = (kind: Entry["kind"], id: string, name: string) => ({
    ...blankEntry(kind, id),
    name,
    verifiedOn: "",
    verifiedBy: "",
    verificationNotes:
      "Preserved existing released guidance; unresolved rules remain for volunteer review.",
    sourceUrl: "https://pcsn-patient-assistance.vercel.app",
  });
  for (const p of programs) {
    for (const f of p.fields)
      if (!entries.some((e) => e.id === `fact-${f}`))
        entries.push({
          ...base(
            "question",
            `fact-${f}`,
            adaptSubmission({}).facts[f]?.label ?? f.replace(/([A-Z])/g, " $1"),
          ),
          factKey: f,
        });
    for (const d of p.documents)
      entries.push({
        ...base("document", `${p.id}-${d.id}`, d.label),
        documentTypes: d.types,
        description: d.applicability,
        conditional: !!d.conditional,
        whenFact: d.whenFact ?? "",
      });
    entries.push({
      ...base("program", p.id, p.name),
      sourceUrl: p.sources[0].url,
      applicationId: p.applicationId,
      applicationUrl: p.url,
      questionIds: p.fields.map((f) => `fact-${f}`),
      documentIds: p.documents.map((d) => `${p.id}-${d.id}`),
      reviewNotes: p.reviews,
      submissionInstructions:
        "Open the official application, confirm current requirements, and use the patient worksheet. Record confirmation and arrange follow-up after submission.",
      rules:
        p.id === "mayo-az"
          ? [
              {
                fact: "facilities",
                operator: "contains_item",
                value: "Mayo Clinic Arizona",
                purpose: "surface",
                explanation:
                  "The patient receives care at Mayo Clinic Arizona.",
              },
              {
                fact: "assistance",
                operator: "one_of",
                value: "hospital|both",
                purpose: "surface",
                explanation: "The patient requested help with medical bills.",
              },
            ]
          : [
              {
                fact: "utilityNeed",
                operator: "equals",
                value: "yes",
                purpose: "surface",
                explanation:
                  "The patient explicitly reported trouble paying electricity or gas.",
              },
            ],
    });
  }
  arizonaTreatmentFacilities.forEach((name, i) =>
    entries.push(base("facility", `facility-${i + 1}`, name)),
  );
  legacyMedications.forEach((name, i) =>
    entries.push(base("drug", `legacy-drug-${i + 1}`, name)),
  );
  volunteerResources.forEach((r, i) =>
    entries.push({
      ...base("program", `legacy-resource-${i + 1}`, r.name),
      manualOnly: true,
      category: r.category,
      phone: r.phone ?? "",
      description: r.focus,
      sourceUrl: r.website,
      applicationId: `resource-${i + 1}`,
      applicationUrl: r.website,
      submissionInstructions: [r.forms, r.volunteerNotes]
        .filter(Boolean)
        .join("\n"),
      reviewNotes: r.patientItems,
    }),
  );
  return entries;
}
export function seedState(): CatalogState {
  return {
    head: "legacy-release",
    published: "legacy-release",
    revisions: [
      {
        id: "legacy-release",
        parent_id: null,
        action: "publish",
        entries: seedEntries(),
        actor: "Legacy catalog migration",
        created_at: "2026-09-17T00:00:00Z",
        note: "Preserved existing released catalog; not a new verification of external requirements.",
      },
    ],
  };
}
