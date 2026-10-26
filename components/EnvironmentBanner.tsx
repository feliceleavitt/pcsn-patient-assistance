export function EnvironmentBanner() {
  // Vercel sets this server-side value for Preview deployments. Local use is
  // marked too, so staff do not mistake a development session for production.
  if (process.env.VERCEL_ENV === "production") return null;
  return <div role="status" className="sticky top-0 z-50 bg-amber-300 px-4 py-2 text-center text-sm font-bold text-slate-950">STAGING / TEST ENVIRONMENT — use fictional information only. No real patient applications.</div>;
}
