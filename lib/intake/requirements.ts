import { validBirthDate, validMoney, validPhone, validMonthOrDate } from "./validation";
import type { IntakePayload } from "../types";
const hasText = (value: string | undefined) => Boolean(value?.trim());
export function missingIntakeRequirements(form: IntakePayload, isManufacturer: boolean, needsMayoApplication: boolean) {
    const requiredByStep: Array<[number, boolean, string]> = [
      [0, Boolean(form.consent.volunteerAccessConsent), "Permission for volunteer access and contact is required before saving."],
      [8, form.consent.releaseMedicalFinancial, "Please review the release authorization."],
      [8, form.consent.contactPermission, "Please review the contact permission."],
      [8, form.consent.noGuaranteeAcknowledgment, "Please review the no-guarantee acknowledgment."],
      [8, hasText(form.consent.signature), "Your electronic signature is required."],
      [1, hasText(form.patient.firstName), "Patient first name is required."],
      [1, hasText(form.patient.lastName), "Patient last name is required."],
      [1, validBirthDate(form.patient.dateOfBirth ?? ""), "Enter a real date of birth that is not in the future."],
      [1, validPhone(form.patient.phone ?? ""), "Enter a phone number with at least 10 digits, including the area code."],
      [1, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.patient.email ?? ""), "Enter an email address like name@example.com."],
      [1, hasText(form.patient.addressLine1), "Patient address is required."],
      [1, hasText(form.patient.city), "Patient city is required."],
      [1, hasText(form.patient.state), "Patient state is required."],
      [1, hasText(form.patient.postalCode), "Patient postal code is required."],
      [1, hasText(form.patient.employmentStatus), "Patient employment status is required."],
      [3, hasText(form.diagnosis.cancerType), "Cancer type is required."],
      [3, validMonthOrDate(form.diagnosis.diagnosisDate ?? ""), "Enter a valid diagnosis month and year."],
      [3, (form.diagnosis.treatments ?? []).every(item => !item.startDate || validMonthOrDate(item.startDate)), "Enter a valid start month and year for each treatment, or leave it blank if unknown."],
      [3, (form.diagnosis.treatments ?? []).some((item) => hasText(item.name)), "At least one treatment is required."],
      [3, !isManufacturer || (form.diagnosis.medications ?? []).some(hasText), "At least one medication is required for medication assistance."],
      [4, hasText(form.provider.clinicName), "Clinic name is required."],
      [4, hasText(form.provider.providerName), "Provider name is required."],
      [3, !needsMayoApplication || hasText(form.hospital.mayoFinancialAssistance?.applicantMiddleName), "Mayo applicant middle name or 'not applicable' is required."],
      [3, !needsMayoApplication || hasText(form.hospital.mayoFinancialAssistance?.assistanceNeed), "Please describe the need for Mayo financial assistance."],
      [3, !needsMayoApplication || Boolean(form.hospital.mayoFinancialAssistance?.certificationAccepted), "Mayo certification is required."],
      [6, Number.isInteger(form.household.householdSize) && form.household.householdSize > 0, "Enter household size as a whole number of at least 1."],
      [6, validMoney(form.household.monthlyIncome), "Enter monthly household income as a dollar amount, such as 1,250.50. Enter 0 only if you have no income."],
      [6, validMoney(form.household.annualIncome), "Enter annual household income as a dollar amount, such as 15,000. Enter 0 only if you have no income."],
    ];

    return requiredByStep.filter(([, isComplete]) => !isComplete);
  }

