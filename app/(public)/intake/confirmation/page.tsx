import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePatientSession } from "@/lib/security/patient";
import { createServiceClient } from "@/lib/supabase/server";

export default async function IntakeConfirmationPage() {
  const session = await requirePatientSession();
  const { data, error } = await createServiceClient().from("submissions")
    .select("id,created_at,patients!inner(user_id)").eq("patients.user_id", session.user.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("We could not confirm your submission. Check your patient profile before submitting again.");
  if (!data) redirect("/intake");
  return <main className="grid min-h-screen place-items-center bg-paper p-4">
    <section className="grid w-full max-w-2xl gap-5 rounded-md bg-white p-6 shadow-soft md:p-8">
      <h1 className="text-3xl font-semibold">Your application has been submitted</h1>
      <div className="grid gap-4 text-base leading-7 text-slate-700">
        <p>PCSN has received your request. You do not need to submit it again.</p>
        <h2 className="text-xl font-semibold text-ink">What happens next?</h2>
        <p>A PCSN volunteer will review your answers and documents. We aim to contact you within <strong>5–7 business days</strong>, excluding weekends and holidays. This is an estimate, not a guaranteed appointment.</p>
        <p>Please watch for a call or email using the phone number and email address you provided, and check your spam folder. The volunteer will explain possible programs and ask for anything else that is needed.</p>
        <p>This confirms your request to PCSN. It does not mean that an outside assistance application has been submitted or approved.</p>
        <h2 className="text-xl font-semibold text-ink">If something changes</h2>
        <p>Open your patient profile to update your contact details, add documents, or send an update about your situation. If you have not heard from PCSN after 7 business days, send an update from your profile asking for a follow-up.</p>
      </div>
      <Link href="/patient" className="inline-flex min-h-12 items-center justify-center rounded-md bg-pine px-4 py-3 font-semibold text-white">Go to my patient profile</Link>
    </section>
  </main>;
}
