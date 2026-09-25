import { z } from "zod";
import { validBirthDate } from "../intake/validation";
const date = z
  .string()
  .refine((v) => !v || validBirthDate(v, "9999-12-31"), "Enter a valid date.")
  .transform((v) => v || null);
export const caseStatuses = [
  "preparing",
  "awaiting_documents",
  "submitted",
  "approved",
  "denied",
  "follow_up_due",
  "declined",
  "completed",
] as const;
export const caseInput = z
  .object({
    programId: z.string().min(1).max(100),
    revision: z.number().int().nonnegative(),
    status: z.enum(caseStatuses),
    assigned_to: z.string().max(200),
    priority: z.enum(["normal", "urgent"]),
    next_action: z.string().max(2000),
    missing_documents: z.string().max(4000),
    follow_up_date: date,
    last_contact_date: date,
    submitted_date: date,
    benefits_end_date: date,
  })
  .strict();
export function casesEnabled() {
  return process.env.PCSN_PROGRAM_CASES_ENABLED === "true";
}
export function followUpDue(
  c: { follow_up_date?: string | null; benefits_end_date?: string | null },
  today = new Date().toISOString().slice(0, 10),
) {
  if (c.follow_up_date && c.follow_up_date <= today) return true;
  if (!c.benefits_end_date) return false;
  const due = new Date(c.benefits_end_date + "T00:00:00Z");
  due.setUTCDate(due.getUTCDate() - 30);
  return due.toISOString().slice(0, 10) <= today;
}
