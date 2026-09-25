"use client";
import { useState } from "react";
export function NewRequestPrompt() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto grid max-w-xl gap-5 p-6">
      <h1 className="text-2xl font-semibold">Start a blank request?</h1>
      <p>
        This replaces your unfinished draft with blank answers. Submitted
        requests are kept. Documents from an older draft will not be attached to
        the new request automatically. Use one account per patient.
      </p>
      <button
        className="min-h-12 rounded-md bg-pine p-3 text-white"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const response = await fetch("/api/intake/draft", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ startBlank: true }),
            });
            if (!response.ok) throw Error();
            window.location.assign("/intake?blank=1");
          } catch {
            setError(
              "Unable to start a blank request. Your saved information has not been opened. Please retry.",
            );
            setBusy(false);
          }
        }}
      >
        Start blank request
      </button>
      <a className="underline" href="/intake">
        Keep my saved draft
      </a>
      <a className="underline" href="/patient">
        Back to my dashboard
      </a>
      {error ? <p role="alert">{error}</p> : null}
    </main>
  );
}
