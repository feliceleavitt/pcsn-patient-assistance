export const patientDocumentTypes = ["photo_id", "medical_bill", "prior_authorization_denial", "prior_authorization_appeal", "appeal_denial", "eob", "other_insurance_denial_letter", "proof_of_income", "tax_return", "w2", "paystub", "benefit_letter", "bank_statement", "insurance_card_front", "insurance_card_back", "prescription_or_medication_list", "other_documents", "utility_bill", "shutoff_notice", "proof_of_residence"];
export function documentMime(bytes: Uint8Array): string | null {
  if (Buffer.from(bytes.slice(0, 5)).toString() === "%PDF-") return "application/pdf";
  if (Buffer.from(bytes.slice(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  return null;
}
