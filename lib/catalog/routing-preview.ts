import { known, type Profile } from "../assistance/profile";
import { ruleMatches } from "./runtime";
import type { Entry } from "./model";

export type MatchState = "MATCHED" | "POSSIBLE" | "MANUAL_REVIEW";
export type PreviewRoute = {
  programId: string;
  routeId: string;
  program: string;
  actionType: Entry["routeActionType"];
  matchState: MatchState;
  verificationStatus: Entry["verificationStatus"];
  volunteerOnly: boolean;
  providerRequired: boolean;
  sourceUrl: string;
  rationale: string[];
};

/** Pure, read-only screening. This function does not create cases or change a profile. */
export function routingPreview(entries: Entry[], profile: Profile): PreviewRoute[] {
  return entries.filter((entry) => entry.kind === "program" && entry.enabled).flatMap((program) => {
    const rules = program.rules.filter((rule) => rule.purpose === "surface");
    const values = rules.map((rule) => ruleMatches(profile, rule));
    const hardFailed = program.eligibilityMode === "hard_rule" && values.some((v) => v === false);
    if (hardFailed) return [];
    const unknown = values.some((v) => v === null);
    const supported = rules.length > 0 && values.every((v) => v === true);
    const partial = program.verificationStatus === "PARTIALLY_VERIFIED";
    const manual = program.implementationHold || program.eligibilityMode === "manual_review" || partial || unknown;
    const matchState: MatchState = supported && !manual ? "MATCHED" : manual ? "MANUAL_REVIEW" : "POSSIBLE";
    // Programs without executable rules are never called a match. They remain volunteer review routes.
    if (!rules.length && !program.manualOnly) return [];
    const rationale = [
      ...rules.map((rule, i) => `${rule.explanation}: ${values[i] === true ? "reported fact supports review" : values[i] === false ? "not established" : "information missing"}`),
      ...(program.providerRequired ? ["Provider action or consent remains outstanding."] : []),
      ...(program.billingEntityRequired && !known(profile, "billingEntity") ? ["Confirm the entity that issued the bill before routing."] : []),
      ...(partial ? ["Current source is partially verified; volunteer review is required."] : []),
    ];
    return [{ programId: program.id, routeId: program.routeId, program: program.name, actionType: program.routeActionType, matchState, verificationStatus: program.verificationStatus, volunteerOnly: partial || program.implementationHold, providerRequired: program.providerRequired, sourceUrl: program.sourceUrl, rationale }];
  });
}
