import Link from "next/link";

export default function SubmissionDetailPage() {
  return (
    <main className="page-shell">
      <div className="container">
        <Link href="/admin">Back to submissions</Link>
        <div className="topbar">
          <h1>Lena Morales</h1>
          <button className="button">Export patient packet PDF</button>
        </div>
        <div className="detail-layout">
          <section className="panel panel-pad grid">
            <h2 className="section-title">Patient details</h2>
            <div className="grid two">
              <p>
                <span className="muted">Date of birth</span>
                <br />
                1974-09-18
              </p>
              <p>
                <span className="muted">Phone</span>
                <br />
                (602) 555-0134
              </p>
              <p>
                <span className="muted">Cancer type</span>
                <br />
                Breast cancer
              </p>
              <p>
                <span className="muted">Medication</span>
                <br />
                Palbociclib
              </p>
              <p>
                <span className="muted">Annual income</span>
                <br />
                $38,400
              </p>
              <p>
                <span className="muted">Monthly income</span>
                <br />
                $3,200
              </p>
            </div>
            <h2 className="section-title">Uploaded documents</h2>
            <Link href="#">insurance card front: insurance-card-front.pdf</Link>
            <Link href="#">medical bill: hospital-bill-april.pdf</Link>
            <Link href="#">
              prior authorization denial: coverage-denial-letter.pdf
            </Link>
            <h2 className="section-title">Notes</h2>
            <p className="panel panel-pad">
              Called patient. She expects to upload missing pay stubs this week.
            </p>
          </section>
          <aside className="panel panel-pad grid">
            <h2 className="section-title">Review actions</h2>
            <label className="field">
              <span>Application status</span>
              <select defaultValue="missing">
                <option value="submitted">submitted</option>
                <option value="review">under review</option>
                <option value="missing">missing documents</option>
                <option value="approved">approved</option>
                <option value="denied">denied</option>
                <option value="renewal">renewal needed</option>
              </select>
            </label>
            <label className="field">
              <span>Missing documents</span>
              <input defaultValue="Two recent pay stubs, Insurance card back" />
            </label>
            <label className="field">
              <span>Add note</span>
              <textarea />
            </label>
            <button className="button">Save changes</button>
          </aside>
        </div>
      </div>
    </main>
  );
}
