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
  const { data, error } = await supabase
    .from("intake_drafts")
    .upsert(
      {
        user_id: patientSession.user.id,
        payload: parsed.data.payload,
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
