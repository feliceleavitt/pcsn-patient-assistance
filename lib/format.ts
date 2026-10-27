const portalTimeZone = "America/Phoenix";

// Client components are rendered once on the server and again in the browser.
// Pinning these date formats avoids hydration mismatches when the Vercel region
// and a visitor's browser use different local time zones.
export function formatPortalDateTime(value: string | number | Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: portalTimeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
