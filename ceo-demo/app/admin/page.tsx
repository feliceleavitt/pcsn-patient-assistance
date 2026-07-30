import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="page-shell">
      <div className="container">
        <header className="topbar">
          <div>
            <span className="eyebrow">Admin dashboard</span>
            <h1>Submissions</h1>
          </div>
          <span className="demo-pill">Volunteer side</span>
        </header>
        <section className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Clinic</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <Link href="/admin/submissions/lena-morales">
                    Lena Morales
                  </Link>
                </td>
                <td>Desert Oncology Center</td>
                <td>
                  <span className="status">missing documents</span>
                </td>
                <td>5/12/2026</td>
              </tr>
              <tr>
                <td>
                  <Link href="/admin/submissions/david-chen">David Chen</Link>
                </td>
                <td>Phoenix Hematology Group</td>
                <td>
                  <span className="status">under review</span>
                </td>
                <td>5/10/2026</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
