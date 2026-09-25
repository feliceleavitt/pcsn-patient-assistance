"use client";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import {
  blankFinancial,
  incomeKinds,
  type FinancialDetails as Details,
} from "@/lib/intake/financial";
export function Answer({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: "yes" | "no" | "not_sure" | "") => void;
}) {
  return (
    <label className="grid gap-2">
      <span>{label}</span>
      <select
        className="min-h-12 rounded border p-2"
        value={value || ""}
        onChange={(e) =>
          onChange(e.target.value as "yes" | "no" | "not_sure" | "")
        }
      >
        <option value="">Choose an answer</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
        <option value="not_sure">I’m not sure</option>
      </select>
    </label>
  );
}
export function FinancialDetails({
  value,
  onChange,
  section,
  documents,
}: {
  value?: Details;
  onChange: (v: Details) => void;
  section: "household" | "bills";
  documents: { id: string; original_filename: string }[];
}) {
  const f = { ...blankFinancial(), ...value };
  const update = (v: Partial<Details>) => onChange({ ...f, ...v });
  if (section === "bills")
    return (
      <section className="grid gap-4 rounded-md border bg-white p-4">
        <h3 className="text-xl font-semibold">Hospital and medical bills</h3>
        <p>
          Include outstanding bills from all healthcare providers. Leave unknown
          details blank. A bill is different from an estimate or an explanation
          of benefits (EOB).
        </p>
        {f.bills.map((bill, i) => {
          const set = (v: Partial<typeof bill>) =>
            update({
              bills: f.bills.map((b, j) => (j === i ? { ...b, ...v } : b)),
            });
          return (
            <fieldset key={bill.id} className="grid gap-3 border p-4">
              <legend>Bill {i + 1}</legend>
              {(
                [
                  ["facility", "Hospital or provider"],
                  ["accountNumber", "Patient account number"],
                  ["guarantorNumber", "Guarantor number"],
                  ["amount", "Current amount owed"],
                  ["serviceDate", "Date of service"],
                  ["statementDate", "Statement date"],
                  [
                    "contactMethod",
                    "Preferred hospital contact method, if known",
                  ],
                ] as const
              ).map(([key, label]) => (
                <TextField
                  key={key}
                  label={label}
                  type={key.endsWith("Date") ? "date" : "text"}
                  inputMode={key === "amount" ? "decimal" : undefined}
                  value={bill[key]}
                  onChange={(e) => set({ [key]: e.target.value })}
                />
              ))}
              <label className="grid gap-2">
                Document kind
                <select
                  className="min-h-12 border p-2"
                  value={bill.kind}
                  onChange={(e) =>
                    set({ kind: e.target.value as typeof bill.kind })
                  }
                >
                  <option value="bill">Bill / statement</option>
                  <option value="eob">Explanation of benefits</option>
                  <option value="denial">Insurance denial</option>
                  <option value="estimate">Estimate</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <Answer
                label="Do you have the bill or statement?"
                value={bill.statementAvailable}
                onChange={(v) => set({ statementAvailable: v })}
              />
              <Answer
                label="Is this account in collections?"
                value={bill.collections}
                onChange={(v) => set({ collections: v })}
              />
              <Answer
                label="Has insurance finished processing this claim?"
                value={bill.insuranceProcessed}
                onChange={(v) => set({ insuranceProcessed: v })}
              />
              <label className="grid gap-2">
                Reuse an uploaded document
                <select
                  className="min-h-12 border p-2"
                  value={bill.documentId}
                  onChange={(e) => set({ documentId: e.target.value })}
                >
                  <option value="">
                    Not linked yet — upload in Documents, then return here
                  </option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.original_filename}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  update({ bills: f.bills.filter((_, j) => j !== i) })
                }
              >
                Remove bill
              </Button>
            </fieldset>
          );
        })}
        <Button
          type="button"
          onClick={() =>
            update({
              bills: [
                ...f.bills,
                {
                  id: crypto.randomUUID(),
                  facility: "",
                  accountNumber: "",
                  guarantorNumber: "",
                  amount: "",
                  serviceDate: "",
                  statementDate: "",
                  statementAvailable: "",
                  collections: "",
                  contactMethod: "",
                  insuranceProcessed: "",
                  kind: "bill",
                  documentId: "",
                },
              ],
            })
          }
        >
          Add a medical bill
        </Button>
        <details>
          <summary>How do I find this information?</summary>
          <p>
            Open your hospital’s patient portal and look for Billing or
            Statements. Download the statement as a PDF, then upload it in
            Documents. For HonorHealth, use MyChart. You can also call the
            number on your bill and ask for a current statement. Do not enter
            portal passwords here.
          </p>
        </details>
      </section>
    );
  return (
    <section className="grid gap-4 rounded-md border bg-white p-4">
      <h3 className="text-xl font-semibold">Your financial household</h3>
      <p>
        People at the same address do not always share finances. Use the
        household-member entries below to identify your spouse, dependents and
        other people you live with. We reuse their names instead of asking
        twice.
      </p>
      <Answer
        label="Are you married?"
        value={f.married}
        onChange={(v) => update({ married: v })}
      />
      <Answer
        label="Do you have dependents?"
        value={f.hasDependents}
        onChange={(v) => update({ hasDependents: v })}
      />
      <TextField
        label="Employer, if employed"
        value={f.employer}
        onChange={(e) => update({ employer: e.target.value })}
      />
      <label className="grid gap-2">
        Work schedule, if employed
        <select
          className="min-h-12 border p-2"
          value={f.workSchedule}
          onChange={(e) =>
            update({ workSchedule: e.target.value as Details["workSchedule"] })
          }
        >
          <option value="">Not provided</option>
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="other">Other</option>
          <option value="not_sure">Not sure</option>
        </select>
      </label>
      <h4 className="font-semibold">Income sources</h4>
      <p>
        Tell us which sources you receive. These details help explain the income
        totals you already entered; we do not add the totals again.
      </p>
      {incomeKinds.map((kind) => {
        const item = f.income.find((i) => i.kind === kind) || {
          kind,
          receives: "" as const,
          amount: "",
          frequency: "" as const,
          source: "",
        };
        const set = (v: Partial<typeof item>) =>
          update({
            income: [
              ...f.income.filter((i) => i.kind !== kind),
              { ...item, ...v },
            ],
          });
        return (
          <fieldset className="grid gap-3 border p-3" key={kind}>
            <legend>{kind}</legend>
            <Answer
              label={`Do you receive ${kind.toLowerCase()}?`}
              value={item.receives}
              onChange={(v) => set({ receives: v })}
            />
            {item.receives === "yes" ? (
              <>
                <TextField
                  label="Amount"
                  inputMode="decimal"
                  value={item.amount}
                  onChange={(e) => set({ amount: e.target.value })}
                />
                <label className="grid gap-2">
                  How often?
                  <select
                    className="min-h-12 border p-2"
                    value={item.frequency}
                    onChange={(e) =>
                      set({
                        frequency: e.target.value as typeof item.frequency,
                      })
                    }
                  >
                    {[
                      "",
                      "weekly",
                      "biweekly",
                      "monthly",
                      "annually",
                      "other",
                    ].map((v) => (
                      <option value={v} key={v}>
                        {v || "Select frequency"}
                      </option>
                    ))}
                  </select>
                </label>
                <TextField
                  label="Source / who provides this income"
                  value={item.source}
                  onChange={(e) => set({ source: e.target.value })}
                />
              </>
            ) : null}
          </fieldset>
        );
      })}
      <Answer
        label="Do you have checking or savings accounts?"
        value={f.hasBankAccounts}
        onChange={(v) => update({ hasBankAccounts: v })}
      />
      <p>
        When bank statements are needed, upload the last two complete statements
        for every checking or savings account, including all pages. Do not send
        only a balance screenshot. No Social Security number is needed in this
        portal; enter it directly on the official application if required.
      </p>
    </section>
  );
}
