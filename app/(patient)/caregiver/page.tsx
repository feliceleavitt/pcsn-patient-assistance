import Link from "next/link";
import { requirePatientSession } from "@/lib/security/patient";
import { createServiceClient } from "@/lib/supabase/server";

export default async function CaregiverPortalPage() {
  const session = await requirePatientSession();
  const db = createServiceClient();
  const { data: access } = await db.from("caregiver_access").select("id,patient_id,granted_at,patients!inner(first_name,last_name)").eq("caregiver_user_id", session.user.id).is("revoked_at", null).order("granted_at", { ascending: false });
  return <main className="min-h-screen bg-paper p-5 md:p-8"><div className="mx-auto grid max-w-3xl gap-5"><header><p className="text-sm font-semibold uppercase tracking-wide text-pine">Caregiver portal</p><h1 className="mt-2 text-3xl font-semibold">Authorized patient access</h1><p className="mt-2 text-sm text-slate-600">Only patients who explicitly invited this account appear here.</p></header>{(access ?? []).length ? <section className="grid gap-3">{access!.map((item: any) => <Link key={item.id} className="rounded-md bg-white p-5 shadow-soft" href={`/caregiver/patients/${item.patient_id}`}><strong>{item.patients.first_name} {item.patients.last_name}</strong><p className="mt-1 text-sm text-slate-600">Access granted {new Date(item.granted_at).toLocaleDateString()}</p></Link>)}</section> : <section className="rounded-md bg-white p-5 shadow-soft"><p>No active caregiver access is linked to this account.</p></section>}</div></main>;
}
