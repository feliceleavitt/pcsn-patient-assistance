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
