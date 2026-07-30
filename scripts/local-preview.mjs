import http from "node:http";

const css = `
  body{margin:0;background:#f7f5f1;color:#182126;font-family:Arial,Helvetica,sans-serif}
  main{max-width:1040px;margin:0 auto;padding:32px 20px}
  .card{background:white;border-radius:6px;box-shadow:0 18px 40px rgba(24,33,38,.08);padding:24px;margin:18px 0}
  .grid{display:grid;gap:14px}.cols{grid-template-columns:repeat(2,minmax(0,1fr))}
  label{display:grid;gap:7px;font-size:14px}input,select,textarea{border:1px solid #cbd5e1;border-radius:6px;padding:11px;background:white}
  button,.btn{background:#2d6a4f;color:white;border:0;border-radius:6px;padding:12px 18px;font-weight:700;text-decoration:none;display:inline-block}
  a{color:#2d6a4f;font-weight:700}.muted{color:#64748b}.pill{display:inline-block;background:#e7ece8;border-radius:999px;padding:5px 10px}
  table{width:100%;border-collapse:collapse;background:white}th,td{padding:16px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#e7ece8}
  @media(max-width:760px){.cols{grid-template-columns:1fr}}
`;

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css}</style></head><body>${body}</body></html>`;
}

function intake() {
  return page("Financial Assistance Application", `
    <main>
      <p style="font-weight:700;color:#2d6a4f;text-transform:uppercase">Cancer support nonprofit</p>
      <h1>Financial assistance application</h1>
      <section class="card grid">
        <h2>Program</h2>
        <label><input type="radio" checked> Help paying for medications</label>
        <label><input type="radio"> Help with medical bills</label>
        <label><input type="radio"> Both medication costs and medical bills</label>
      </section>
      <section class="card grid cols">
        <h2 style="grid-column:1/-1">Patient information</h2>
        <label>First name<input></label><label>Last name<input></label>
        <label>Cancer type<input list="cancers"></label><label>Medication<input list="meds"></label>
        <datalist id="cancers"><option>Breast cancer</option><option>Leukemia</option><option>Lung cancer</option></datalist>
        <datalist id="meds"><option>Palbociclib</option><option>Imatinib</option><option>Pembrolizumab</option></datalist>
      </section>
      <section class="card grid">
        <h2>Final consent</h2>
        <label><input type="checkbox"> I authorize release of medical and financial information for this application</label>
        <label><input type="checkbox"> PCSN may contact providers, hospitals, insurers, manufacturers, and assistance foundations</label>
        <label><input type="checkbox"> I understand that Phoenix Cancer Support Network cannot guarantee approval, funding, medication assistance, or hospital financial assistance, and that all decisions are made by the sponsoring organizations.</label>
        <label>Electronic signature<input></label>
        <a class="btn" href="/intake/confirmation">Submit Application</a>
      </section>
      <section class="card grid">
        <h2>Important Disclaimer</h2>
        <p>Phoenix Cancer Support Network provides volunteer assistance with identifying and completing applications for financial assistance programs, including hospital financial assistance programs and manufacturer-sponsored medication assistance programs.</p>
        <p>Submission of an application does not guarantee approval, funding, medication access, debt reduction, or any other benefit. Eligibility requirements, funding availability, program rules, and approval decisions are determined solely by the hospitals, pharmaceutical manufacturers, foundations, government agencies, and other organizations administering these programs.</p>
        <p>Phoenix Cancer Support Network does not make eligibility determinations, cannot guarantee outcomes, and is not responsible for decisions made by third-party organizations. Assistance programs may change, become unavailable, exhaust available funding, or modify their eligibility criteria at any time.</p>
        <p>Patients are responsible for reviewing all submitted information for accuracy and for responding to any requests for additional documentation from the sponsoring organization.</p>
        <p>By using this website, you acknowledge that Phoenix Cancer Support Network is providing informational and application assistance services only and makes no guarantees regarding the availability or receipt of financial assistance.</p>
      </section>
    </main>`);
}

function confirmation() {
  return page("Submitted", `<main><section class="card grid"><h1>Your request has been submitted.</h1><p>Thank you for trusting Phoenix Cancer Support Network. A volunteer will review your information and contact you if anything else is needed.</p><p>Many assistance programs take several days to a few weeks to process requests. Some programs may contact you, your provider, or PCSN directly with updates.</p><p>You do not need to submit this form again unless your information changes.</p><a class="btn" href="/intake">Return to PCSN website</a></section></main>`);
}

function login() {
  return page("Admin login", `<main style="max-width:430px"><section class="card grid"><p style="font-weight:700;color:#2d6a4f;text-transform:uppercase">Staff access</p><h1>Admin login</h1><label>Email<input value="demo@pcsn.local"></label><label>Password<input type="password" value="demo"></label><a class="btn" href="/admin">Sign in</a><p class="muted">Demo login: demo@pcsn.local / demo</p></section></main>`);
}

function admin() {
  return page("Submissions", `<main><p style="font-weight:700;color:#2d6a4f;text-transform:uppercase">Admin dashboard</p><h1>Submissions</h1><table><thead><tr><th>Patient</th><th>Clinic</th><th>Status</th><th>Submitted</th></tr></thead><tbody><tr><td><a href="/admin/submissions/demo-lena-morales">Lena Morales</a></td><td>Desert Oncology Center</td><td>missing documents</td><td>5/12/2026</td></tr><tr><td><a href="/admin/submissions/demo-david-chen">David Chen</a></td><td>Phoenix Hematology Group</td><td>under review</td><td>5/10/2026</td></tr></tbody></table></main>`);
}

function detail() {
  return page("Lena Morales", `<main><a href="/admin">Back to submissions</a><h1>Lena Morales</h1><a class="btn" href="#">Export patient packet PDF</a><section class="card grid cols"><h2 style="grid-column:1/-1">Patient details</h2><p><span class="muted">Date of birth</span><br>1974-09-18</p><p><span class="muted">Phone</span><br>(602) 555-0134</p><p><span class="muted">Cancer type</span><br>Breast cancer</p><p><span class="muted">Medication</span><br>Palbociclib</p><p><span class="muted">Annual income</span><br>$38,400</p><p><span class="muted">Monthly income</span><br>$3,200</p></section><section class="card grid"><h2>Uploaded documents</h2><a href="#">insurance card front: insurance-card-front.pdf</a><a href="#">medical bill: hospital-bill-april.pdf</a><a href="#">prior authorization denial: coverage-denial-letter.pdf</a></section><section class="card grid"><h2>Review actions</h2><label>Application status<select><option>missing documents</option><option>submitted</option><option>approved</option><option>denied</option></select></label><label>Missing documents<input value="Two recent pay stubs, Insurance card back"></label><label>Add note<textarea></textarea></label><button>Save changes</button></section></main>`);
}

const server = http.createServer((req, res) => {
  const url = req.url ?? "/";
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (url === "/" || url === "/intake") return res.end(intake());
  if (url === "/intake/confirmation") return res.end(confirmation());
  if (url === "/admin/login") return res.end(login());
  if (url === "/admin") return res.end(admin());
  if (url.startsWith("/admin/submissions/")) return res.end(detail());
  res.statusCode = 404;
  res.end(page("Not found", "<main><h1>Not found</h1></main>"));
});

server.listen(3003, "127.0.0.1", () => {
  console.log("Preview server ready at http://127.0.0.1:3003");
});
