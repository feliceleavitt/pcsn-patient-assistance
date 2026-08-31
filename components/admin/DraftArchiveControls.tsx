"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function DraftArchiveControls({
  userId,
  archived,
}: {
  userId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function updateArchive() {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/admin/drafts/${userId}/archive`, {
      method: archived ? "DELETE" : "POST",
    });
    setSaving(false);
    if (!response.ok) {
      setError("Unable to update the archive. Please try again.");
      return;
    }
    router.replace(archived ? "/admin/archive" : "/admin");
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <Button variant="secondary" disabled={saving} onClick={updateArchive}>
        {saving
          ? archived
            ? "Restoring..."
            : "Archiving..."
          : archived
            ? "Restore in-progress application"
            : "Archive in-progress application"}
      </Button>
      {error ? <p className="text-sm text-coral">{error}</p> : null}
    </div>
  );
}
