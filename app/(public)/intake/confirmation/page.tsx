import Link from "next/link";

export default function IntakeConfirmationPage() {
  const websiteUrl = process.env.NEXT_PUBLIC_PCSN_WEBSITE_URL ?? "/";

  return (
    <main className="grid min-h-screen place-items-center bg-paper p-5">
      <section className="grid w-full max-w-2xl gap-5 rounded-md bg-white p-6 shadow-soft md:p-8">
        <h1 className="text-3xl font-semibold">Your request has been submitted.</h1>
        <div className="grid gap-4 text-sm leading-6 text-slate-700">
          <p>
            Thank you for trusting Phoenix Cancer Support Network. A volunteer
            will review your information and contact you if anything else is
            needed.
          </p>
          <p>
            Many assistance programs take several days to a few weeks to process
            requests. Some programs may contact you, your provider, or PCSN
            directly with updates.
          </p>
          <p>
            You do not need to submit this form again unless your information
            changes.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/patient/login"
            className="inline-flex h-11 w-fit items-center rounded-md bg-pine px-4 text-sm font-semibold text-white"
          >
            Sign in to patient profile
          </Link>
          <Link
            href={websiteUrl}
            className="inline-flex h-11 w-fit items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink"
          >
            Return to PCSN website
          </Link>
        </div>
      </section>
    </main>
  );
}
