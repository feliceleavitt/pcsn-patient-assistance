"use client";
import { useState } from "react";
export function AdminSignOutButton() {
  const [error, setError] = useState("");
  return (
    <div>
      <button
        type="button"
        className="min-h-11 rounded-md border border-pine px-4 font-semibold text-pine"
        onClick={async () => {
          try {
            const r = await fetch("/api/admin/logout", { method: "POST" });
            if (!r.ok) throw Error();
            window.location.assign("/admin/login");
          } catch {
            setError("Unable to sign out. Please try again.");
          }
        }}
      >
        Sign out
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
