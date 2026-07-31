import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";

export const patientCookieName =
  process.env.PATIENT_SESSION_COOKIE_NAME ?? "pcsn_patient_session";

export async function getPatientSession() {
  const token = (await cookies()).get(patientCookieName)?.value;
  if (!token) return null;

  const supabase = createServiceClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user?.email) return null;

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}

export async function requirePatientSession() {
  const session = await getPatientSession();
  if (!session) redirect("/patient/login");
  return session;
}
