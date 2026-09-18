import Link from "next/link";
import { notFound } from "next/navigation";
import { AssistancePlan } from "@/components/admin/AssistancePlan";
import { requireAdminSession } from "@/lib/security/admin";
import { isDemoMode } from "@/lib/demo/admin";
import {
  exampleIds,
  exampleProfile,
  type ExampleId,
} from "@/lib/assistance/examples";

export default async function AssistancePlanPreview({
  searchParams,
}: {
  searchParams: Promise<{ example?: string }>;
}) {
  await requireAdminSession();
  if (!isDemoMode()) notFound();
  const { example } = await searchParams;
  const selected: ExampleId = exampleIds.find((id) => id === example) ?? "mayo";
  return (
    <main className="min-h-screen p-5 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <Link href="/admin" className="text-sm text-pine underline">
          Back to development dashboard
        </Link>
        <div className="rounded-md border border-amber-300 bg-amber-50 p-5">
          <h1 className="text-2xl font-semibold">
            Synthetic Assistance Plan examples
          </h1>
          <p className="mt-2 text-sm leading-6">
            Development only. Every person, answer and document here is
            fictional. Nothing is saved or sent. The sample’s overall status is
            “approved” to demonstrate that no program approval is inferred.
          </p>
        </div>
        <nav aria-label="Synthetic scenarios" className="flex flex-wrap gap-3">
          {(
            [
              ["mayo", "Mayo · missing documents"],
              ["utilities", "Mayo + urgent utility need"],
              ["unknown", "Legacy / unknown answers"],
            ] as const
          ).map(([id, label]) => (
            <Link
              key={id}
              href={`/admin/assistance-plan-preview?example=${id}`}
              aria-current={selected === id ? "page" : undefined}
              className={`rounded-md border px-4 py-3 text-sm font-semibold ${selected === id ? "border-pine bg-pine text-white" : "border-slate-300 bg-white text-pine"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <AssistancePlan profile={exampleProfile(selected)} />
      </div>
    </main>
  );
}
