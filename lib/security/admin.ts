import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/types";
import { demoSessionToken, isDemoMode } from "@/lib/demo/admin";
import { isVolunteerEmail, verifyVolunteerSessionToken } from "@/lib/security/volunteers";

const cookieName =
  process.env.ADMIN_SESSION_COOKIE_NAME ?? "pcsn_admin_session";

export async function requireAdminSession() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) redirect("/admin/login");

  if (isDemoMode() && token === demoSessionToken) {
    return {
      user: { id: "demo-admin", email: "demo@pcsn.local" },
      role: "admin" as AdminRole,
      token,
    };
  }

  const volunteerSession = verifyVolunteerSessionToken(token);
  if (volunteerSession) {
    // The signed session identifies a credential-based volunteer. Confirm the
    // server-only credential still exists so a stale email allowlist cannot
    // silently disable an established account or authorize a removed one.
    const supabase = createServiceClient();
    const { data: credential, error: credentialError } = await supabase
      .from("volunteer_credentials")
      .select("must_change_password")
      .eq("email", volunteerSession.user.email)
      .maybeSingle<{ must_change_password: boolean }>();
    if (credentialError || !credential) redirect("/admin/login");
    if (volunteerSession.mustChangePassword || credential.must_change_password) {
      redirect("/admin/change-password");
    }
    return {
      ...volunteerSession,
      token,
    };
  }

  const supabase = createServiceClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) redirect("/admin/login");
  if (!isVolunteerEmail(user.email)) redirect("/admin/login");

  const { data: roleRow } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: AdminRole }>();

  if (!roleRow) redirect("/admin/login");

  return {
    user,
    role: roleRow.role,
    token,
  };
}

export async function requireAdminSessionForPasswordChange() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) redirect("/admin/login");

  const volunteerSession = verifyVolunteerSessionToken(token);
  if (volunteerSession) {
    return {
      ...volunteerSession,
      token,
    };
  }

  return requireAdminSession();
}
