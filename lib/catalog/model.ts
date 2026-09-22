import { z } from "zod";

export function todayInArizona() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const text = z.string().trim().max(6000);
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/);
const link = z
  .string()
  .max(2000)
  .refine(
    (v) =>
      !v ||
      (/^https:\/\//.test(v) &&
        (() => {
          try {
            return !!new URL(v).hostname;
          } catch {
            return false;
          }
        })()),
    "Use a complete HTTPS URL",
  );
export const kinds = [
  "facility",
  "drug",
  "program",
  "question",
  "document",
] as const;
export type Kind = (typeof kinds)[number];
export const ruleSchema = z
  .object({
    fact: id,
    operator: z.enum([
      "equals",
      "one_of",
      "contains_item",
      "at_least",
      "at_most",
    ]),
    value: text.min(1),
    purpose: z.enum(["surface", "review"]),
    explanation: text.min(1),
  })
  .strict();
export const entrySchema = z
  .object({
    id,
    kind: z.enum(kinds),
    name: text.min(1),
    enabled: z.boolean(),
    description: text,
    sourceUrl: link,
    verifiedOn: z
      .string()
      .refine(
        (v) =>
          !v ||
          (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
            !Number.isNaN(Date.parse(v)) &&
            v <= todayInArizona()),
        "Verification date must be a valid date, no later than today",
      ),
    verifiedBy: text,
    verificationNotes: text,
    reviewOwner: text,
    reviewCadence: text,
    reviewMonths: z.number().int().min(1).max(3),
    organization: text,
    location: text,
    aliases: z.array(text).max(100),
    programIds: z.array(id).max(100),
    manualOnly: z.boolean(),
    category: text,
    phone: text,
    applicationId: text,
    applicationUrl: link,
    actionType: z.enum(["helps", "completes", "refers"]),
    questionIds: z.array(id).max(200),
    documentIds: z.array(id).max(100),
    rules: z.array(ruleSchema).max(100),
    submissionInstructions: text,
    renewalDays: z.number().int().min(0).max(3650),
    reviewNotes: z.array(text).max(100),
    factKey: text,
    answerType: z.enum(["text", "number", "date", "choice", "yes_no"]),
    options: z.array(text).max(100),
    help: text,
    documentTypes: z.array(text).max(100),
    conditional: z.boolean(),
    whenFact: text,
  })
  .strict();
export type Entry = z.infer<typeof entrySchema>;
export type Rule = z.infer<typeof ruleSchema>;
export const catalogSchema = z
  .array(entrySchema)
  .max(2000)
  .superRefine((entries, ctx) => {
    const ids = new Set<string>();
    for (const e of entries) {
      if (ids.has(e.id))
        ctx.addIssue({ code: "custom", message: `Duplicate ID: ${e.id}` });
      ids.add(e.id);
    }
  });
export function blankEntry(kind: Kind, entryId: string): Entry {
  return {
    id: entryId,
    kind,
    name: "New " + kind,
    enabled: true,
    description: "",
    sourceUrl: "",
    verifiedOn: "",
    verifiedBy: "",
    verificationNotes: "",
    reviewOwner: "",
    reviewCadence: "Quarterly; check time-sensitive availability before use",
    reviewMonths: 3,
    organization: "",
    location: "",
    aliases: [],
    programIds: [],
    manualOnly: false,
    category: "",
    phone: "",
    applicationId: "",
    applicationUrl: "",
    actionType: "helps",
    questionIds: [],
    documentIds: [],
    rules: [],
    submissionInstructions: "",
    renewalDays: 30,
    reviewNotes: [],
    factKey: "",
    answerType: "text",
    options: [],
    help: "",
    documentTypes: [],
    conditional: false,
    whenFact: "",
  };
}
export type Revision = {
  id: string;
  parent_id: string | null;
  action: "draft" | "publish" | "restore";
  entries: Entry[];
  actor: string;
  created_at: string;
  note: string;
};
export type CatalogState = {
  head: string | null;
  published: string | null;
  revisions: Revision[];
};
export function publicationErrors(
  entries: Entry[],
  previouslyPublished: Entry[] = [],
) {
  const errors: string[] = [];
  const active = entries.filter((e) => e.enabled);
  const seenFacts = new Set<string>();
  for (const q of active.filter((e) => e.kind === "question")) {
    if (q.factKey && seenFacts.has(q.factKey))
      errors.push(
        `${q.name}: duplicate active fact key ${q.factKey}; reuse the existing question`,
      );
    seenFacts.add(q.factKey);
  }
  const factKeys = new Set(
    active.filter((e) => e.kind === "question").map((e) => e.factKey),
  );
  const checkRef = (owner: Entry, ids: string[], kind: Kind) =>
    ids.forEach((id) => {
      if (!active.some((e) => e.id === id && e.kind === kind))
        errors.push(`${owner.name}: missing or disabled ${kind} ${id}`);
    });
  for (const e of active) {
    const unchangedLegacy = previouslyPublished.some(
      (old) => old.id === e.id && JSON.stringify(old) === JSON.stringify(e),
    );
    if (!unchangedLegacy && (!e.verifiedOn || !e.verifiedBy || !e.sourceUrl))
      errors.push(
        `${e.name}: verify the source and record a date and verifier`,
      );
    checkRef(e, e.programIds, "program");
    checkRef(e, e.questionIds, "question");
    checkRef(e, e.documentIds, "document");
    if (e.kind === "program") {
      for (const r of e.rules)
        if (!factKeys.has(r.fact))
          errors.push(
            `${e.name}: rule fact ${r.fact} has no active question mapping`,
          );
      if (!e.applicationId || !e.applicationUrl || !e.submissionInstructions)
        errors.push(
          `${e.name}: application route, HTTPS link and submission instructions are required`,
        );
      if (!e.manualOnly && !e.rules.some((r) => r.purpose === "surface"))
        errors.push(`${e.name}: add at least one explicit screening trigger`);
    }
    if (e.kind === "question" && !e.factKey)
      errors.push(`${e.name}: a reusable fact key is required`);
    if (e.kind === "document" && !e.documentTypes.length)
      errors.push(`${e.name}: at least one document type is required`);
  }
  const shared = new Map<string, string>();
  for (const e of active.filter((e) => e.kind === "program")) {
    if (
      shared.has(e.applicationId) &&
      shared.get(e.applicationId) !== e.applicationUrl
    )
      errors.push(`${e.name}: shared application links must agree`);
    shared.set(e.applicationId, e.applicationUrl);
  }
  return errors;
}
export function publishedEntries(state: CatalogState): Entry[] {
  return (
    state.revisions
      .find((r) => r.id === state.published && r.action === "publish")
      ?.entries.filter((e) => e.enabled) ?? []
  );
}
export function commitRevision(
  state: CatalogState,
  entries: Entry[],
  expected: string | null,
  action: Revision["action"],
  actor: string,
  note: string,
): CatalogState {
  if (expected !== state.head)
    throw new Error(
      "Another administrator saved changes. Reload before saving.",
    );
  const parsed = catalogSchema.parse(entries);
  if (!note.trim()) throw new Error("Describe this change.");
  if (action === "publish") {
    const errors = publicationErrors(parsed, publishedEntries(state));
    if (errors.length) throw new Error(errors.join("\n"));
  }
  const revision: Revision = {
    id: crypto.randomUUID(),
    parent_id: state.head,
    action,
    entries: parsed,
    actor,
    created_at: new Date().toISOString(),
    note,
  };
  return {
    head: revision.id,
    published: action === "publish" ? revision.id : state.published,
    revisions: [revision, ...state.revisions],
  };
}

export function nextReviewDate(entry: Entry): string | null {
  if (!entry.verifiedOn) return null;
  const date = new Date(entry.verifiedOn + "T12:00:00Z");
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + entry.reviewMonths);
  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.toISOString().slice(0, 10);
}

export function stampVerification(
  entries: Entry[],
  previous: Entry[],
  verifiedIds: string[],
  actor: string,
): Entry[] {
  return entries.map((entry) => {
    const e = { ...entry },
      old = previous.find((v) => v.id === e.id);
    if (old && old.kind !== e.kind)
      throw new Error(`The kind of ${e.id} cannot change; create a new item.`);
    if (verifiedIds.includes(e.id)) {
      e.verifiedOn = todayInArizona();
      e.verifiedBy = actor;
    } else if (
      old &&
      JSON.stringify({ ...e, verifiedOn: "", verifiedBy: "" }) ===
        JSON.stringify({ ...old, verifiedOn: "", verifiedBy: "" })
    ) {
      e.verifiedOn = old.verifiedOn;
      e.verifiedBy = old.verifiedBy;
    } else {
      e.verifiedOn = "";
      e.verifiedBy = "";
    }
    return e;
  });
}

export function entryPublicationStatus(entry: Entry, state: CatalogState) {
  const published = state.revisions
    .find((r) => r.id === state.published)
    ?.entries.find((e) => e.id === entry.id);
  if (!published) return "Draft only";
  if (!entry.enabled && published.enabled) return "Retirement pending";
  if (!entry.enabled && !published.enabled) return "Inactive";
  return JSON.stringify(entry) === JSON.stringify(published)
    ? "Published"
    : "Published version + draft changes";
}
