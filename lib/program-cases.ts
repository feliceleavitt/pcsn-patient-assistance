import type { PreviewRoute } from "@/lib/catalog/routing-preview";

/** Immutable, non-sensitive routing snapshot saved only after volunteer action. */
export function programCaseSnapshot(route: PreviewRoute) {
  return {
    program_id: route.programId,
    route_id: route.routeId || null,
    route_action_type: route.actionType,
    match_state: route.matchState,
    verification_status: route.verificationStatus,
    provider_required: route.providerRequired,
    source_url: route.sourceUrl || null,
    match_rationale: [...route.rationale],
  };
}
