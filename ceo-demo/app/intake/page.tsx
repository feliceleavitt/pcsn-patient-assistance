import Link from "next/link";

const documents = [
  "Insurance card, front",
  "Insurance card, back",
  "Photo ID",
  "Medical bill",
  "Prior authorization denial",
  "Appeal denial",
  "Explanation of Benefits/EOB",
  "Most recent W2",
  "Most recent tax return",
  "Two most recent pay stubs",
  "Benefit award letter",
  "Other documents",
];

export default function IntakePage() {
  return (
    <main className="page-shell">
      <div className="container">
        <header className="topbar">
          <div>
            <Link href="/">Back to demo home</Link>
            <h1>Financial assistance application</h1>
          </div>
          <span className="demo-pill">Patient side</span>
        </header>

        <section className="panel panel-pad grid">
          <h2 className="section-title">What do you need help with?</h2>
          <label className="choice">
            <input type="radio" name="help" defaultChecked /> Help paying for
            medications
          </label>
          <label className="choice">
            <input type="radio" name="help" /> Help with medical bills
          </label>
          <label className="choice">
            <input type="radio" name="help" /> Both medication costs and
            medical bills
          </label>
        </section>

        <section className="panel panel-pad grid two">
          <h2 className="section-title" style={{ gridColumn: "1 / -1" }}>
            Patient information
          </h2>
          <label className="field">
            <span>First name</span>
            <input placeholder="Lena" />
          </label>
          <label className="field">
            <span>Last name</span>
            <input placeholder="Morales" />
          </label>
          <label className="field">
            <span>Cancer type</span>
            <input list="cancers" placeholder="Start typing..." />
          </label>
          <label className="field">
            <span>Medication</span>
            <input list="meds" placeholder="Start typing..." />
          </label>
          <datalist id="cancers">
            <option>Breast cancer</option>
            <option>Leukemia</option>
            <option>Lung cancer</option>
            <option>Multiple myeloma</option>
          </datalist>
          <datalist id="meds">
            <option>Palbociclib</option>
            <option>Imatinib</option>
            <option>Pembrolizumab</option>
            <option>Trastuzumab</option>
          </datalist>
          <label className="field">
            <span>Health insurance company</span>
            <input placeholder="Insurance company name" />
          </label>
          <label className="field">
            <span>Employment status</span>
            <select defaultValue="">
              <option value="" disabled>
                Select one
              </option>
              <option>Employed full-time</option>
              <option>Employed part-time</option>
              <option>Retired</option>
              <option>Disabled</option>
              <option>Prefer not to say</option>
            </select>
          </label>
        </section>

        <section className="panel panel-pad">
          <h2 className="section-title">Document uploads</h2>
          <div className="doc-grid">
            {documents.map((document) => (
              <div className="doc" key={document}>
                <strong>{document}</strong>
                <span className="muted">Upload PDF, JPG, or PNG</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel panel-pad grid">
          <h2 className="section-title">Consent and signature</h2>
          <label className="choice">
            <input type="checkbox" /> I authorize release of medical and
            financial information for this application.
          </label>
          <label className="choice">
            <input type="checkbox" /> PCSN may contact providers, hospitals,
            insurers, manufacturers, and assistance foundations.
          </label>
          <label className="choice">
            <input type="checkbox" /> I understand that Phoenix Cancer Support
            Network cannot guarantee approval, funding, medication assistance,
            or hospital financial assistance, and that all decisions are made by
            the sponsoring organizations.
          </label>
          <label className="field">
            <span>Electronic signature</span>
            <input placeholder="Type full name" />
          </label>
          <Link className="button" href="/intake/confirmation">
            Submit Application
          </Link>
        </section>

        <section className="panel panel-pad disclaimer">
          <h2 className="section-title">Important Disclaimer</h2>
          <p>
            Phoenix Cancer Support Network provides volunteer assistance with
            identifying and completing applications for financial assistance
            programs, including hospital financial assistance programs and
            manufacturer-sponsored medication assistance programs.
          </p>
          <p>
            Submission of an application does not guarantee approval, funding,
            medication access, debt reduction, or any other benefit. Eligibility
            requirements, funding availability, program rules, and approval
            decisions are determined solely by the hospitals, pharmaceutical
            manufacturers, foundations, government agencies, and other
            organizations administering these programs.
          </p>
          <p>
            Phoenix Cancer Support Network does not make eligibility
            determinations, cannot guarantee outcomes, and is not responsible
            for decisions made by third-party organizations. Assistance programs
            may change, become unavailable, exhaust available funding, or modify
            their eligibility criteria at any time.
          </p>
        </section>
      </div>
    </main>
  );
}
