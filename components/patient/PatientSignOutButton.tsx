"use client";

import { useRouter } from "next/navigation";

export function PatientSignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/patient/logout", { method: "POST" });
    router.push("/patient/login");
    router.refresh();
  }

  return (
    <button
      className="h-11 rounded-md bg-pine px-4 text-sm font-semibold text-white"
      onClick={signOut}
      type="button"
    >
      Sign out
    </button>
  );
}
