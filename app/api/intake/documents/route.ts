import { NextResponse } from "next/server";
import { getPatientSession } from "@/lib/security/patient";
import { createServiceClient } from "@/lib/supabase/server";
import { encryptBuffer } from "@/lib/security/crypto";
import { patientDocumentTypes, documentMime } from "@/lib/intake/documents";
import { sameOrigin } from "@/lib/catalog/origin";
const columns = "id,original_filename,document_type,uploaded_at";
export async function GET() {
  const session = await getPatientSession();
  if (!session) return NextResponse.json({error:"Please sign in."},{status:401});
  const {data,error} = await createServiceClient().from("intake_draft_documents").select(columns).eq("user_id",session.user.id).order("uploaded_at");
  return error ? NextResponse.json({error:"Unable to load saved documents. Please try again."},{status:503}) : NextResponse.json({documents:data});
}
export async function POST(request: Request) {
  const session = await getPatientSession();
  if (!session) return NextResponse.json({error:"Please sign in."},{status:401});
  if (!sameOrigin(request)) return NextResponse.json({error:"Invalid request origin."},{status:403});
  const form = await request.formData();
  const file = form.get("file"), type = String(form.get("documentType") ?? "");
  if (!(file instanceof File) || !patientDocumentTypes.includes(type) || file.size === 0 || file.size > 4194304) return NextResponse.json({error:"Choose a PDF, JPG, or PNG up to 4 MB and a valid document category."},{status:400});
  const db = createServiceClient();
  const {data:draft,error:draftError} = await db.from("intake_drafts").select("payload").eq("user_id",session.user.id).maybeSingle();
  if (draftError) return NextResponse.json({error:"Unable to check saved permission."},{status:503});
  if (draft?.payload?.consent?.volunteerAccessConsent !== true) return NextResponse.json({error:"Save your volunteer-access permission before uploading."},{status:403});
  const bytes = Buffer.from(await file.arrayBuffer()), mime = documentMime(bytes);
  if (!mime) return NextResponse.json({error:"This file is not a supported PDF, JPG, or PNG."},{status:400});
  const encrypted = encryptBuffer(bytes), storagePath = `drafts/${session.user.id}/${crypto.randomUUID()}.bin`;
  const {error:uploadError} = await db.storage.from("encrypted-documents").upload(storagePath,encrypted.encrypted,{contentType:"application/octet-stream"});
  if (uploadError) return NextResponse.json({error:"Document was not saved. Please retry."},{status:503});
  const {data,error} = await db.from("intake_draft_documents").insert({user_id:session.user.id,original_filename:file.name.slice(0,255),document_type:type,storage_path:storagePath,mime_type:mime,byte_size:file.size,encryption_iv:encrypted.iv,encryption_tag:encrypted.tag}).select(columns).single();
  if (error) {
    await db.storage.from("encrypted-documents").remove([storagePath]);
    return NextResponse.json({error:"Document was not saved. Please retry."},{status:503});
  }
  return NextResponse.json({document:data},{status:201});
}
export async function DELETE(request: Request) {
  const session = await getPatientSession();
  if (!session) return NextResponse.json({error:"Please sign in."},{status:401});
  if (!sameOrigin(request)) return NextResponse.json({error:"Invalid request origin."},{status:403});
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({error:"Invalid document."},{status:400});
  const db = createServiceClient();
  const {data,error} = await db.from("intake_draft_documents").delete().eq("id",id).eq("user_id",session.user.id).select("storage_path").maybeSingle();
  if (error) return NextResponse.json({error:"Unable to remove document."},{status:503});
  if (!data) return NextResponse.json({error:"Document not found in your draft."},{status:404});
  await db.storage.from("encrypted-documents").remove([data.storage_path]);
  return NextResponse.json({ok:true});
}
