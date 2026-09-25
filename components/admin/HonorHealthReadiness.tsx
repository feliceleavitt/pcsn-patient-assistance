import { honorHealthReadiness } from "@/lib/assistance/honorhealth";
export function HonorHealthReadiness({
  submission,
}: {
  submission: Record<string, unknown>;
}) {
  const r = honorHealthReadiness(submission);
  const money = (n: number | null) =>
    n === null
      ? "Unknown"
      : n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  return (
    <section className="grid gap-3 rounded-md border border-pine/30 bg-white p-5">
      <h2 className="text-xl font-semibold">
        HonorHealth Financial Assistance readiness
      </h2>
      <p>
        Ready to apply: not confirmed. “Complete” means the answer is present. A
        volunteer still needs to check the official requirements and evidence.
        Reuse the linked documents before requesting another copy.
      </p>
      <ul className="grid gap-3">
        {r.items.map((i) => (
          <li key={i.label}>
            <strong>
              {i.label}: {i.status}
            </strong>
            {i.documents.length ? (
              <ul className="ml-5 list-disc">
                {i.documents.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : null}
            {i.note ? <p className="text-sm">{i.note}</p> : null}
          </li>
        ))}
      </ul>
      <p>
        Reported monthly income: {money(r.monthly)}. Reported annual income:{" "}
        {money(r.annual)}. Estimated annual income from monthly amount:{" "}
        {money(r.estimatedAnnual)}.
      </p>
      <p>
        Patient-reported outstanding expenses with linked bills in the previous
        12 months: {money(r.reportedBillTotal)}. Verified documented total: not
        yet established.
      </p>
      <p>
        Internal screening only:{" "}
        {r.ratio === null
          ? "Insufficient information to calculate a percentage."
          : `${r.ratio.toFixed(1)}% of reported annual income. Confirm responsibility, dates, duplicates and income period before relying on this figure.`}
      </p>
      {r.ratio !== null && r.ratio > 50 ? (
        <p className="font-semibold">
          Potential HonorHealth medically indigent criteria — review
          application. This is not an eligibility determination.
        </p>
      ) : null}
      <a
        className="underline"
        href="https://www.honorhealth.com/patients-visitors/financial-assistance-policy"
        target="_blank"
        rel="noreferrer"
      >
        Official HonorHealth application and requirements
      </a>
    </section>
  );
}
