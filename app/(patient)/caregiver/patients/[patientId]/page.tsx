import Link from "next/link";
import { notFound } from "next/navigation";
import { recordAuditEvent } from "@/lib/security/audit";
import { requirePatientSession } from "@/lib/security/patient";
import { createServiceClient } from "@/lib/supabase/server";

export default async function CaregiverPatientPage({ params }: { params: Promise<{ patientId: string }> }) {
  const session = await requirePatientSession(); const { patientId } = await params; const db = createServiceClient();
  const { data: membership } = await db.from("caregiver_access").select("id").eq("patient_id", patientId).eq("caregiver_user_id", session.user.id).is("revoked_at", null).maybeSingle();
  if (!membership) notFound();
  const { data: applications } = await db.from("submissions").select("id,status,created_at,missing_documents,documents(id,original_filename,document_type,uploaded_at),patient_messages(id,sender_kind,body,created_at)").eq("patient_id", patientId).order("created_at", { ascending: false });
  await recordAuditEvent({ actorId: session.user.id, action: "caregiver_access_viewed", metadata: { patientId } });
  return <main className="min-h-screen bg-paper p-5 md:p-8"><div className="mx-auto grid max-w-3xl gap-5"><Link className="text-sm text-pine underline" href="/caregiver">Back to authorized patients</Link><header><p className="text-sm font-semibold uppercase tracking-wide text-pine">Caregiver portal</p><h1 className="mt-2 text-3xl font-semibold">Patient applications</h1><p className="mt-2 text-sm text-slate-600">Internal volunteer notes and internal documents are not included.</p></header>{(applications ?? []).map((application: any) => <section key={application.id} className="grid gap-3 rounded-md bg-white p-5 shadow-soft"><p className="font-semibold">Status: {application.status.replaceAll("_", " ")}</p><p className="text-sm">Submitted {new Date(application.created_at).toLocaleString()}</p>{application.missing_documents?.length ? <p className="text-sm">Requested documents: {application.missing_documents.join(", ")}</p> : null}<div><h2 className="font-medium">Patient documents</h2><ul className="mt-1 text-sm">{application.documents.filter((item: any) => !item.document_type.startsWith("internal_record:")).map((item: any) => <li key={item.id}>{item.document_type}: {item.original_filename}</li>)}</ul></div><div><h2 className="font-medium">Patient messages</h2><ul className="mt-1 grid gap-2 text-sm">{application.patient_messages.map((item: any) => <li key={item.id}><strong>{item.sender_kind === "volunteer" ? "Volunteer" : "Patient"}:</strong> {item.body} <span className="text-slate-500">{new Date(item.created_at).toLocaleString()}</span></li>)}</ul></div></section>)}</div></main>;
}
