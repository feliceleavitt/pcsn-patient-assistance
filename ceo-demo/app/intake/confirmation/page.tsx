import Link from "next/link";

export default function ConfirmationPage() {
  return (
    <main className="page-shell">
      <section className="container panel panel-pad grid">
        <h1>Your request has been submitted.</h1>
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
        <Link className="button" href="/">
          Return to PCSN website
        </Link>
      </section>
    </main>
  );
}
