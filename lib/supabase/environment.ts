const previewStagingProjectRef = "hdywzivrbtoskxgcsbze";

function projectRef(url: string) {
  try {
    const hostname = new URL(url).hostname;
    const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Preview deployments must never silently use a production Supabase URL.
 * The fixed ref is intentionally public: project refs are already visible in
 * Supabase URLs and are not credentials. Production uses its separately
 * configured URL and is not constrained by this preview-only assertion.
 */
export function assertSupabaseEnvironment(url: string) {
  if (process.env.VERCEL_ENV !== "preview") return;
  if (projectRef(url) !== previewStagingProjectRef) {
    throw new Error("Preview Supabase isolation check failed");
  }
}

export function publicSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  assertSupabaseEnvironment(url);
  return url;
}
