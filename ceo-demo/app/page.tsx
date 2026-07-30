import Link from "next/link";

export default function Home() {
  return (
    <main className="page-shell">
      <div className="container">
        <header className="topbar">
          <div className="brand">
            <span className="eyebrow">Phoenix Cancer Support Network</span>
            <strong>Financial Assistance Portal</strong>
          </div>
          <span className="demo-pill">CEO demo · no real submissions</span>
        </header>

        <section className="hero">
          <h1>Patient intake and volunteer review in one secure workflow.</h1>
          <p>
            This demo shows how patients request help with medication costs and
            medical bills, then how PCSN volunteers review submissions,
            documents, missing items, statuses, notes, and packet exports.
          </p>
          <div className="actions">
            <Link className="button" href="/intake">
              View patient side
            </Link>
            <Link className="button secondary" href="/admin/login">
              View volunteer side
            </Link>
          </div>
        </section>

        <section className="panel panel-pad grid three">
          <div>
            <h2 className="section-title">Patient-friendly intake</h2>
            <p className="muted">
              Simple language, branching support needs, document uploads,
              consent, and no-guarantee acknowledgment.
            </p>
          </div>
          <div>
            <h2 className="section-title">Volunteer review</h2>
            <p className="muted">
              Sample submissions, document list, missing-document tracking,
              notes, statuses, and packet export preview.
            </p>
          </div>
          <div>
            <h2 className="section-title">Launch-ready plan</h2>
            <p className="muted">
              Production launch still needs Supabase credentials, admin
              accounts, and legal/content approval before collecting PHI.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
