/** Calendar validation shared by the browser and submission API. */
export function validBirthDate(value: string, today = new Date().toISOString().slice(0, 10)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= today && value >= '1850-01-01';
}
export function validMoney(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') return false;
  const text = String(value).trim().replace(/^\$\s*/, '');
  return /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text) && Number.isFinite(Number(text.replaceAll(',', '')));
}
export function validPhone(value: string) { return /^\+?[\d\s().-]+$/.test(value) && value.replace(/\D/g, '').length >= 10 && value.replace(/\D/g, '').length <= 15; }
export function validMonthOrDate(value: string) {
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return Number(value.slice(0, 4)) >= 1850;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && validBirthDate(value, '9999-12-31');
}
