import Link from "next/link";

export default function AdminLoginPage() {
  return (
    <main className="page-shell">
      <section className="container panel panel-pad grid" style={{ maxWidth: 440 }}>
        <span className="eyebrow">Staff access</span>
        <h1>Admin login</h1>
        <label className="field">
          <span>Email</span>
          <input defaultValue="demo@pcsn.local" />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" defaultValue="demo" />
        </label>
        <Link className="button" href="/admin">
          Sign in
        </Link>
        <p className="muted">Demo login: demo@pcsn.local / demo</p>
      </section>
    </main>
  );
}
