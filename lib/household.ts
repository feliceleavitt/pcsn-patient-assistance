/** Old forms defaulted age to zero and stored an independent adult checkbox. */
export function householdAgeLabel(member: { age?: number | null; isAdult?: boolean | null }) {
  const age = member.age;
  if (typeof age === "number" && Number.isInteger(age) && age > 0) {
    if (age >= 18) return `Age ${age} · Adult${member.isAdult === false ? " (age and previous selection differ; confirm)" : ""}`;
    if (member.isAdult === true) return `Age ${age} · Age and adult selection differ; confirm`;
    return `Age ${age} · Minor`;
  }
  return member.isAdult === true ? "Adult · Age not confirmed" : "Age and adult/minor status not confirmed";
}

export function ageFromBirthDate(value: string, today = new Date().toISOString().slice(0, 10)): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(value + "T00:00:00Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || value > today) return undefined;
  return Number(today.slice(0,4)) - Number(value.slice(0,4)) - (today.slice(5) < value.slice(5) ? 1 : 0);
}
