export type BillingEntity = {
  name: string;
  catalogId?: string;
  accountNumber?: string;
  billType?: string;
  documentId?: string;
  matchState: "matched" | "unmatched" | "ambiguous";
};

const aliases: Array<{ id: string; names: string[] }> = [
  { id: "facility-yuma-regional-medical-center-onvida-health", names: ["onvida health", "yuma regional medical center", "yuma regional", "yuma regional medical center onvida health"] },
  { id: "facility-desert-hematology-oncology", names: ["desert hematology oncology"] },
];
const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Conservative alias matching. It never uses treatment location as evidence. */
export function normalizeBillingEntity(name: string): Pick<BillingEntity, "catalogId" | "matchState"> {
  const normalized = key(name);
  if (!normalized) return { matchState: "unmatched" };
  const matches = aliases.filter((entry) => entry.names.some((alias) => key(alias) === normalized));
  return matches.length === 1 ? { catalogId: matches[0].id, matchState: "matched" } : { matchState: matches.length > 1 ? "ambiguous" : "unmatched" };
}
