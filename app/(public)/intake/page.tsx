import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { getPatientSession } from "@/lib/security/patient";
import { createServiceClient } from "@/lib/supabase/server";
import type { IntakePayload } from "@/lib/types";

export default async function IntakePage() {
  const patientSession = await getPatientSession();
  if (!patientSession) {
    redirect("/patient/login?next=/intake");
  }

  const supabase = createServiceClient();
  const { data: draft } = await supabase
    .from("intake_drafts")
    .select("payload, updated_at")
    .eq("user_id", patientSession.user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-paper">
      <div className="grid min-h-screen lg:grid-cols-[minmax(320px,0.8fr)_1.2fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <Image
            src="/intake-support.png"
            alt="Patient and navigator reviewing paperwork together"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8 text-white">
            <p className="max-w-md text-sm leading-6 text-white/90">
              This private form helps PCSN review your request and follow up if
              more information is needed.
            </p>
          </div>
        </section>
        <section className="flex items-center p-5 md:p-10">
          <div className="mx-auto grid w-full max-w-4xl gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="grid gap-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-pine">
                  Cancer support nonprofit
                </p>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Financial assistance application
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  You are signed in as {patientSession.user.email}. Your answers
                  can be saved so you can come back later before submitting.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/patient/login"
                  className="inline-flex h-11 items-center rounded-md bg-pine px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-pine/90"
                >
                  Patient sign in
                </Link>
                <Link
                  href="/admin/login"
                  className="inline-flex h-11 items-center rounded-md border border-pine/30 bg-white px-4 text-sm font-semibold text-pine shadow-soft transition hover:border-pine hover:bg-mist"
                >
                  Volunteer login
                </Link>
              </div>
            </div>
            <IntakeForm
              initialDraft={(draft?.payload as IntakePayload | null) ?? null}
              draftUpdatedAt={draft?.updated_at ?? null}
            />
            <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-700 shadow-soft">
              <h2 className="text-lg font-semibold text-ink">
                Important Disclaimer
              </h2>
              <p>
                Phoenix Cancer Support Network provides volunteer assistance
                with identifying and completing applications for financial
                assistance programs, including hospital financial assistance
                programs and manufacturer-sponsored medication assistance
                programs.
              </p>
              <p>
                Submission of an application does not guarantee approval,
                funding, medication access, debt reduction, or any other
                benefit. Eligibility requirements, funding availability, program
                rules, and approval decisions are determined solely by the
                hospitals, pharmaceutical manufacturers, foundations, government
                agencies, and other organizations administering these programs.
              </p>
              <p>
                Phoenix Cancer Support Network does not make eligibility
                determinations, cannot guarantee outcomes, and is not
                responsible for decisions made by third-party organizations.
                Assistance programs may change, become unavailable, exhaust
                available funding, or modify their eligibility criteria at any
                time.
              </p>
              <p>
                Patients are responsible for reviewing all submitted information
                for accuracy and for responding to any requests for additional
                documentation from the sponsoring organization.
              </p>
              <p>
                By using this website, you acknowledge that Phoenix Cancer
                Support Network is providing informational and application
                assistance services only and makes no guarantees regarding the
                availability or receipt of financial assistance.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
