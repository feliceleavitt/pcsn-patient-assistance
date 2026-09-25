import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav
        aria-label="Volunteer session"
        className="flex justify-end bg-paper px-5 py-3"
      >
        <AdminSignOutButton />
      </nav>
      {children}
    </>
  );
}
