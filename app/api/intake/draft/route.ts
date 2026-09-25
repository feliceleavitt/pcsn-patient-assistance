import { sameOrigin } from "@/lib/catalog/origin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPatientSession } from "@/lib/security/patient";
import { createServiceClient } from "@/lib/supabase/server";

const draftSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
});

export async function GET() {
  const patientSession = await getPatientSession();
  if (!patientSession) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("intake_drafts")
    .select("payload, updated_at")
    .eq("user_id", patientSession.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Unable to load saved progress." },
      { status: 500 },
    );
  }

  return NextResponse.json({ draft: data ?? null });
}

export async function PUT(request: Request) {
  const patientSession = await getPatientSession();
  if (!patientSession) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const parsed = draftSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "We could not save this progress. Please try again." },
      { status: 400 },
    );
  }

  const consent = parsed.data.payload.consent;
  if (
    !consent ||
    typeof consent !== "object" ||
    !("volunteerAccessConsent" in consent) ||
    consent.volunteerAccessConsent !== true
  ) {
    return NextResponse.json(
      { error: "Consent to volunteer access and contact is required before saving." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const {data: currentDraft, error: currentError} = await supabase.from("intake_drafts").select("payload").eq("user_id",patientSession.user.id).maybeSingle();
  if (currentError) return NextResponse.json({error:"Unable to check your current draft. Please retry."},{status:503});
  if ((currentDraft?.payload?._requestStartedAt ?? null) !== (parsed.data.payload._requestStartedAt ?? null)) return NextResponse.json({error:"A new request was started in another tab. Reload before editing; these older answers were not saved."},{status:409});
  const safePayload = structuredClone(parsed.data.payload);
  if (safePayload.patient && typeof safePayload.patient === "object") {
    delete (safePayload.patient as Record<string, unknown>).socialSecurityNumber;
  }
  const { data, error } = await supabase
    .from("intake_drafts")
    .upsert(
      {
        user_id: patientSession.user.id,
        payload: safePayload,
      },
      { onConflict: "user_id" },
    )
    .select("updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Unable to save progress." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, updatedAt: data.updated_at });
}

export async function DELETE() {
  const patientSession = await getPatientSession();
  if (!patientSession) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("intake_drafts")
    .delete()
    .eq("user_id", patientSession.user.id);

  if (error) {
    return NextResponse.json(
      { error: "Unable to remove saved progress." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

// Explicit reset only; viewing a link must never erase a draft.
export async function POST(request: Request) {
 const session = await getPatientSession();
 if (!session) return NextResponse.json({error:"Please sign in."},{status:401});
 if (!sameOrigin(request)) return NextResponse.json({error:"Invalid request origin."},{status:403});
 const input = await request.json().catch(()=>null);
 if (input?.startBlank !== true) return NextResponse.json({error:"Confirm starting a blank request."},{status:400});
 const {error} = await createServiceClient().from("intake_drafts").upsert({user_id:session.user.id,created_at:new Date().toISOString(),payload:{assistanceType:"both",_requestStartedAt:new Date().toISOString()}},{onConflict:"user_id"});
 return error ? NextResponse.json({error:"Unable to start a blank draft."},{status:503}) : NextResponse.json({ok:true});
}
