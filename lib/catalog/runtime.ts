import { known, type Profile } from "../assistance/profile";
import type { Program } from "../assistance/plan";
import type { Entry, Rule } from "./model";
export function ruleMatches(profile: Profile, rule: Rule): boolean | null {
  const value = known(profile, rule.fact);
  if (value === undefined) return null;
  const a = value.toLowerCase().trim(),
    b = rule.value.toLowerCase().trim();
  if (rule.operator === "equals") return a === b;
  if (rule.operator === "one_of")
    return b
      .split("|")
      .map((s) => s.trim())
      .includes(a);
  if (rule.operator === "contains_item") return a.split(/;\s*/).includes(b);
  if (!a || !b || !Number.isFinite(Number(a)) || !Number.isFinite(Number(b)))
    return null;
  return rule.operator === "at_least"
    ? Number(a) >= Number(b)
    : Number(a) <= Number(b);
}
export function catalogPrograms(
  entries: Entry[],
  profile: Profile,
  version: string,
): Program[] {
  const active = entries.filter((e) => e.enabled),
    byId = new Map(active.map((e) => [e.id, e]));
  return active
    .filter((e) => e.kind === "program")
    .filter((p) => {
      const triggers = p.rules.filter((r) => r.purpose === "surface");
      return (
        !p.manualOnly &&
        triggers.length > 0 &&
        triggers.every((r) => ruleMatches(profile, r) === true)
      );
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      applicationId: p.applicationId,
      url: p.applicationUrl,
      fields: p.questionIds.flatMap((id) =>
        byId.get(id)?.factKey ? [byId.get(id)!.factKey] : [],
      ),
      reviews: [
        ...p.reviewNotes,
        ...p.rules
          .filter((r) => r.purpose === "review")
          .map(
            (r) =>
              `${r.explanation} (${ruleMatches(profile, r) === null ? "More information needed" : ruleMatches(profile, r) ? "Reported facts support review" : "Review recommended; reported facts do not meet this condition"})`,
          ),
      ],
      documents: p.documentIds.flatMap((id) => {
        const d = byId.get(id);
        return d
          ? [
              {
                id: d.id.startsWith(p.id + "-")
                  ? d.id.slice(p.id.length + 1)
                  : d.id,
                label: d.name,
                types: d.documentTypes,
                applicability: [d.description, d.help]
                  .filter(Boolean)
                  .join(" How to find it: "),
                conditional: d.conditional,
                whenFact: d.whenFact || undefined,
              },
            ]
          : [];
      }),
      reviewRequired: p.rules.some(
        (r) => r.purpose === "review" && ruleMatches(profile, r) !== true,
      ),
      sources: [
        {
          label: `Published catalog ${version}; ${p.verifiedOn ? `verified ${p.verifiedOn} by ${p.verifiedBy}` : "legacy content; verification due"}`,
          url: p.sourceUrl,
        },
      ],
      role:
        p.actionType === "completes"
          ? "PCSN completes application"
          : p.actionType === "refers"
            ? "Refer patient to resource"
            : "PCSN helps patient apply",
      why: p.rules
        .filter((r) => r.purpose === "surface")
        .map((r) => r.explanation)
        .join(" "),
      submissionInstructions: p.submissionInstructions,
      renewalDays: p.renewalDays,
    }));
}
export function withCatalogQuestions(
  profile: Profile,
  entries: Entry[],
): Profile {
  const facts = { ...profile.facts };
  for (const q of entries.filter(
    (e) => e.kind === "question" && e.enabled && e.factKey,
  )) {
    facts[q.factKey] = facts[q.factKey]
      ? { ...facts[q.factKey], label: q.name }
      : {
          label: q.name,
          state: "unknown",
          evidence: [],
          note:
            q.help ||
            "Not collected in the existing intake. Ask only if this program needs it.",
        };
  }
  return { ...profile, facts };
}
