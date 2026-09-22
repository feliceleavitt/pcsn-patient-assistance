/** Compare the browser Origin to the actual request host, including local proxy hosts. */
export function sameOrigin(request: Request) {
  const raw = request.headers.get("origin");
  if (!raw) return false;
  try {
    const origin = new URL(raw),
      url = new URL(request.url);
    const host = request.headers.get("host") ?? url.host;
    return (
      ["http:", "https:"].includes(origin.protocol) &&
      origin.host === host &&
      (origin.protocol === url.protocol ||
        request.headers.get("x-forwarded-proto") ===
          origin.protocol.slice(0, -1))
    );
  } catch {
    return false;
  }
}
