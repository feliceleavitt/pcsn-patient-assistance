import Link from "next/link";
import { notFound } from "next/navigation";
import { SignatureRequestPanel } from "@/components/patient/SignatureRequestPanel";
import { requirePatientSession } from "@/lib/security/patient";
import { createServiceClient } from "@/lib/supabase/server";

export default async function PatientSignaturePage({
  params,
}: {
  params: Promise<{ packetId: string }>;
}) {
  const session = await requirePatientSession();
  const { packetId } = await params;
  const { data: packet } = await createServiceClient()
    .from("assistance_packets")
    .select("id,program_name,patient_signed_at,submissions!inner(patients!inner(user_id,first_name,last_name))")
    .eq("id", packetId)
    .maybeSingle<{
      id: string;
      program_name: string;
      patient_signed_at: string | null;
      submissions: {
        patients: {
          user_id: string | null;
          first_name: string;
          last_name: string;
        };
      };
    }>();

  if (!packet || packet.submissions.patients.user_id !== session.user.id) {
    notFound();
  }

  const patientName = `${packet.submissions.patients.first_name} ${packet.submissions.patients.last_name}`;

  return (
    <main className="min-h-screen bg-paper p-5 md:p-8">
      <div className="mx-auto grid max-w-3xl gap-6">
        <Link href="/patient" className="text-sm text-pine">
          Back to profile
        </Link>
        <SignatureRequestPanel
          packetId={packet.id}
          patientName={patientName}
          programName={packet.program_name}
          signedAt={packet.patient_signed_at}
        />
      </div>
    </main>
  );
}
