import { requireAdminSession } from "@/lib/security/admin";
import { isDemoMode } from "@/lib/demo/admin";
export function canManageCatalog(
  role: string,
  email: string | undefined | null,
  demo = false,
) {
  const editors = (process.env.PCSN_CATALOG_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return (
    role === "admin" &&
    (demo || (!!email && editors.includes(email.toLowerCase())))
  );
}
export async function requireCatalogAdmin() {
  const session = await requireAdminSession();
  if (!canManageCatalog(session.role, session.user.email, isDemoMode()))
    throw new Error("CATALOG_FORBIDDEN");
  return session;
}
