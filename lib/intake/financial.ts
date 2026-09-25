import { z } from "zod";
import { validMoney, validBirthDate } from "./validation";
const text = z.string().max(500).optional().default("");
const answer = z.enum(["", "yes", "no", "not_sure"]).optional().default("");
const money = z
  .string()
  .refine(
    (v) => v === "" || validMoney(v),
    "Enter a dollar amount, or leave blank if unknown.",
  )
  .optional()
  .default("");
const date = z
  .string()
  .refine(
    (v) => !v || validBirthDate(v),
    "Enter a valid date that is not in the future.",
  )
  .optional()
  .default("");
export const incomeKinds = [
  "Employment wages",
  "Social Security",
  "Pension",
  "Government assistance",
  "Alimony",
  "Child or spousal support",
  "Regular financial gifts",
  "Other income",
] as const;
export const financialSchema = z
  .object({
    employer: text,
    workSchedule: z
      .enum(["", "full_time", "part_time", "other", "not_sure"])
      .optional()
      .default(""),
    married: answer,
    hasDependents: answer,
    income: z
      .array(
        z.object({
          kind: z.enum(incomeKinds),
          receives: answer,
          amount: money,
          frequency: z
            .enum(["", "weekly", "biweekly", "monthly", "annually", "other"])
            .optional()
            .default(""),
          source: text,
        }),
      )
      .max(40)
      .optional()
      .default([]),
    hasBankAccounts: answer,
    bills: z
      .array(
        z.object({
          id: z.string().max(80),
          facility: text,
          accountNumber: text,
          guarantorNumber: text,
          amount: money,
          serviceDate: date,
          statementDate: date,
          statementAvailable: answer,
          collections: answer,
          contactMethod: text,
          insuranceProcessed: answer,
          kind: z.enum(["bill", "eob", "denial", "estimate", "other"]),
          documentId: z.string().max(80).optional().default(""),
        }),
      )
      .max(100)
      .optional()
      .default([]),
  })
  .strict();
export type FinancialDetails = z.infer<typeof financialSchema>;
export const blankFinancial = (): FinancialDetails => financialSchema.parse({});
export const memberDetailsSchema = z
  .object({
    dateOfBirth: date,
    dependent: answer,
    sharesFinances: answer,
    supportsPatient: answer,
    supportedByPatient: answer,
  })
  .partial();
