"use client";
import {prepareHonorHealthDraft} from "@/lib/catalog/honorhealth";
import { useState } from "react";
import {
  blankEntry,
  kinds,
  publicationErrors,
  nextReviewDate,
  todayInArizona,
  entryPublicationStatus,
  type CatalogState,
  type Entry,
  type Kind,
} from "@/lib/catalog/model";

const labels: Record<Kind, string> = {
  facility: "Facilities",
  drug: "Drugs",
  program: "Assistance programs",
  question: "Questions",
  document: "Documents",
};
const inputClass =
  "w-full rounded-md border border-slate-300 bg-white p-2 text-sm";
export function CatalogEditor({
  initial,
  demo,
}: {
  initial: CatalogState;
  demo: boolean;
}) {
  const [state, setState] = useState(initial);
  const [entries, setEntries] = useState<Entry[]>(
    initial.revisions.find((r) => r.id === initial.head)?.entries ?? [],
  );
  const [kind, setKind] = useState<Kind>("program");
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [verifiedIds, setVerifiedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [history, setHistory] = useState("");
  const entry = entries.find((e) => e.id === selected);
  const errors = publicationErrors(
    entries,
    state.revisions.find((r) => r.id === state.published)?.entries ?? [],
  );
  const saved = state.revisions.find((r) => r.id === state.head)?.entries ?? [];
  const dirty = JSON.stringify(entries) !== JSON.stringify(saved);
  const update = (key: keyof Entry, value: Entry[keyof Entry]) => {
    setEntries((all) =>
      all.map((e) =>
        e.id === selected
          ? {
              ...e,
              [key]: value,
              ...(["verifiedOn", "verificationNotes"].includes(key)
                ? {}
                : { verifiedOn: "", verifiedBy: "" }),
            }
          : e,
      ),
    );
    setVerifiedIds((ids) => ids.filter((id) => id !== selected));
    setReview(false);
  };
  async function save(action: "draft" | "publish") {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries,
          expected: state.head,
          action,
          note,
          verifiedIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setState(data);
      setEntries(
        data.revisions.find((r: { id: string }) => r.id === data.head).entries,
      );
      setNote("");
      setVerifiedIds([]);
      setReview(false);
      setMessage(
        action === "publish"
          ? "Published. New workflow requests now use this release."
          : "Draft saved. Published workflows are unchanged.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  async function importWorkbook(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/admin/catalog/workbook", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEntries((current) => {
        const map = new Map(current.map((e) => [e.id, e]));
        for (const item of data.entries) map.set(item.id, item);
        return [...map.values()];
      });
      setMessage(
        `Imported ${data.entries.length} rows into this unsaved draft. ${data.warnings.join(" ")} Review before saving; nothing was published.`,
      );
      setReview(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }
  function field(key: keyof Entry, label: string, multiline = false) {
    if (!entry) return null;
    const value = entry[key];
    return (
      <label className="grid gap-1 text-sm" key={key}>
        <span className="font-medium">{label}</span>
        {multiline ? (
          <textarea
            rows={3}
            className={inputClass}
            value={Array.isArray(value) ? value.join("\n") : String(value)}
            onChange={(e) =>
              update(
                key,
                Array.isArray(value)
                  ? e.target.value.split("\n").filter(Boolean)
                  : e.target.value,
              )
            }
          />
        ) : (
          <input
            className={inputClass}
            readOnly={key === "verifiedOn"}
            type={
              key === "verifiedOn"
                ? "date"
                : key === "renewalDays" || key === "reviewMonths"
                  ? "number"
                  : "text"
            }
            min={0}
            max={key === "renewalDays" ? 3650 : undefined}
            value={String(value)}
            onChange={(e) =>
              update(
                key,
                key === "renewalDays" || key === "reviewMonths"
                  ? Number(e.target.value)
                  : e.target.value,
              )
            }
          />
        )}
      </label>
    );
  }
  function references(
    key: "programIds" | "questionIds" | "documentIds",
    target: Kind,
    label: string,
  ) {
    return (
      <fieldset className="rounded border p-3">
        <legend>{label}</legend>
        <div className="max-h-48 overflow-auto">
          {entries
            .filter((e) => e.kind === target)
            .map((e) => (
              <label key={e.id} className="flex gap-2 p-1 text-sm">
                <input
                  type="checkbox"
                  checked={entry?.[key].includes(e.id) ?? false}
                  onChange={(ev) =>
                    update(
                      key,
                      ev.target.checked
                        ? [...entry![key], e.id]
                        : entry![key].filter((id) => id !== e.id),
                    )
                  }
                />
                {e.name}
                {!e.enabled ? " (disabled)" : ""}
              </label>
            ))}
        </div>
      </fieldset>
    );
  }
  const old = state.revisions.find((r) => r.id === history);
  return (
    <div className="grid gap-5">
      <div className="rounded-xl bg-pine p-5 text-white">
        <h1 className="text-3xl font-semibold">Program & resource library</h1>
        <p className="mt-2">
          Edit a draft, verify the sources, then publish a complete release.
          Patients and volunteers see published content only.
        </p>
        <p className="mt-2 text-sm">
          Published release: {state.published ?? "None"} ·{" "}
          {dirty ? "Unsaved changes" : "Draft saved"}
        </p>
        {demo ? (
          <p className="mt-2 font-semibold">
            Development preview · changes reset when the server restarts.
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <a
          href="/templates/PCSN_Master_Application_Question_Inventory.xlsx"
          className="underline"
        >
          Original workbook template
        </a>
        <a
          href="/templates/PCSN_Arizona_Financial_Assistance_Route_Catalog.xlsx"
          className="underline"
        >
          74-route workbook template
        </a>
        <a href="/api/admin/catalog/workbook" className="underline">
          Export saved catalog workbook
        </a>
        <label className="cursor-pointer underline">
          Import workbook into draft
          <input
            type="file"
            accept=".xlsx"
            className="block mt-1"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importWorkbook(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="text-sm text-slate-600">
        No patient records belong in this library. Imports never publish
        automatically. Export includes the original template plus a Portal
        Catalog sheet for exact round trips.
      </p>
      {message ? (
        <div
          role="status"
          className="whitespace-pre-line rounded border bg-amber-50 p-4"
        >
          {message}
        </div>
      ) : null}
      <details className="rounded-xl border bg-white p-4">
        <summary className="cursor-pointer font-semibold">
          Quarterly review queue ·{" "}
          {
            entries.filter(
              (e) =>
                !nextReviewDate(e) || nextReviewDate(e)! <= todayInArizona(),
            ).length
          }{" "}
          due or unverified
        </summary>
        <p className="my-2 text-sm">
          Quarterly review is the maximum interval. Funding availability and
          urgent routes may need checks before every use. Saving or publishing
          does not advance a verification date.
        </p>
        {entries
          .filter(
            (e) => !nextReviewDate(e) || nextReviewDate(e)! <= todayInArizona(),
          )
          .map((e) => (
            <button
              key={e.id}
              className="block py-1 text-left text-sm underline"
              onClick={() => {
                setKind(e.kind);
                setSelected(e.id);
              }}
            >
              {e.name} — {e.reviewOwner || "Unassigned"} —{" "}
              {nextReviewDate(e) ?? "Unverified"}
            </button>
          ))}
      </details>
      <div className="grid gap-5 lg:grid-cols-[290px_1fr]">
        <aside className="rounded-xl border bg-white p-4">
          <label className="grid gap-1">
            Category
            <select
              className={inputClass}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as Kind);
                setSelected("");
              }}
            >
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {labels[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 grid gap-1">
            Find an item
            <input
              className={inputClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button
            className="my-3 rounded bg-pine px-3 py-2 text-white"
            onClick={() => {
              const id = `${kind}-${crypto.randomUUID()}`;
              setEntries([...entries, blankEntry(kind, id)]);
              setSelected(id);
            }}
          >
            Add {kind}
          </button>
          <div className="max-h-[650px] overflow-auto">
            {entries
              .filter(
                (e) =>
                  e.kind === kind &&
                  `${e.name} ${e.id}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              )
              .map((e) => (
                <button
                  key={e.id}
                  className={`mb-1 w-full rounded p-3 text-left text-sm ${selected === e.id ? "bg-mist font-semibold" : "hover:bg-slate-100"}`}
                  onClick={() => setSelected(e.id)}
                >
                  {e.name}
                  <span className="block text-xs text-slate-500">
                    {!e.enabled ? "Disabled · " : ""}
                    {e.verifiedOn
                      ? `Verified ${e.verifiedOn}`
                      : "Needs verification"}
                  </span>
                </button>
              ))}
          </div>
        </aside>
        <section className="rounded-xl border bg-white p-5">
          {!entry ? (
            <p>Select an item to edit its details and view its history.</p>
          ) : (
            <div className="grid gap-4">
              <h2 className="text-xl font-semibold">{entry.name}</h2>
              <p className="text-xs text-slate-500">
                Stable ID: {entry.id} · {entryPublicationStatus(entry, state)}
              </p>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={entry.enabled}
                  onChange={(e) => update("enabled", e.target.checked)}
                />
                Include in next published release
              </label>
              {field("name", "Name / patient-facing question")}
              {field("description", "Description / requirement details", true)}
              {entry.kind === "facility" || entry.kind === "drug" ? (
                <>
                  {field(
                    "organization",
                    "System, manufacturer or billing organization",
                  )}
                  {field(
                    "location",
                    entry.kind === "facility"
                      ? "Address / location"
                      : "Generic name / product details",
                  )}
                  {field("aliases", "Alternative names (one per line)", true)}
                  {references("programIds", "program", "Associated programs")}
                </>
              ) : null}
              {entry.kind === "program" ? (
                <>
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={entry.manualOnly}
                      onChange={(e) => update("manualOnly", e.target.checked)}
                    />
                    Resource directory only (no automatic screening)
                  </label>
                  {field("category", "Assistance category")}
                  {field("phone", "Program contact phone")}
                  {field("applicationId", "Shared external application ID")}
                  {field("applicationUrl", "Official application URL (HTTPS)")}
                  <label>
                    PCSN’s role
                    <select
                      className={inputClass}
                      value={entry.actionType}
                      onChange={(e) =>
                        update(
                          "actionType",
                          e.target.value as Entry["actionType"],
                        )
                      }
                    >
                      <option value="helps">Helps patient apply</option>
                      <option value="completes">Completes application</option>
                      <option value="refers">Refers to resource</option>
                    </select>
                  </label>
                  {references("questionIds", "question", "Information needed")}
                  {references(
                    "documentIds",
                    "document",
                    "Document requirements",
                  )}
                  <fieldset className="grid gap-3 rounded border p-3">
                    <legend>Screening & eligibility review rules</legend>
                    <p className="text-sm">
                      All screening triggers must match known facts. Review
                      rules never promise eligibility. Separate alternatives
                      with | for “one of.” Numeric rules use the reported units;
                      do not mix monthly and annual income.
                    </p>
                    {entry.rules.map((r, i) => (
                      <div
                        key={i}
                        className="grid gap-2 rounded bg-slate-50 p-3"
                      >
                        <label>
                          Fact key
                          <input
                            className={inputClass}
                            value={r.fact}
                            onChange={(e) =>
                              update(
                                "rules",
                                entry.rules.map((v, j) =>
                                  j === i ? { ...v, fact: e.target.value } : v,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Use
                          <select
                            className={inputClass}
                            value={r.purpose}
                            onChange={(e) =>
                              update(
                                "rules",
                                entry.rules.map((v, j) =>
                                  j === i
                                    ? {
                                        ...v,
                                        purpose: e.target.value as
                                          | "surface"
                                          | "review",
                                      }
                                    : v,
                                ),
                              )
                            }
                          >
                            <option value="surface">Screening trigger</option>
                            <option value="review">Eligibility review</option>
                          </select>
                        </label>
                        <label>
                          Comparison
                          <select
                            className={inputClass}
                            value={r.operator}
                            onChange={(e) =>
                              update(
                                "rules",
                                entry.rules.map((v, j) =>
                                  j === i
                                    ? {
                                        ...v,
                                        operator: e.target
                                          .value as typeof r.operator,
                                      }
                                    : v,
                                ),
                              )
                            }
                          >
                            {[
                              "equals",
                              "one_of",
                              "contains_item",
                              "at_least",
                              "at_most",
                            ].map((o) => (
                              <option key={o} value={o}>
                                {o.replaceAll("_", " ")}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Value
                          <input
                            className={inputClass}
                            value={r.value}
                            onChange={(e) =>
                              update(
                                "rules",
                                entry.rules.map((v, j) =>
                                  j === i ? { ...v, value: e.target.value } : v,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Plain-English explanation
                          <input
                            className={inputClass}
                            value={r.explanation}
                            onChange={(e) =>
                              update(
                                "rules",
                                entry.rules.map((v, j) =>
                                  j === i
                                    ? { ...v, explanation: e.target.value }
                                    : v,
                                ),
                              )
                            }
                          />
                        </label>
                        <button
                          className="text-left text-red-700 underline"
                          onClick={() =>
                            update(
                              "rules",
                              entry.rules.filter((_, j) => j !== i),
                            )
                          }
                        >
                          Remove rule
                        </button>
                      </div>
                    ))}
                    <button
                      className="text-left text-pine underline"
                      onClick={() =>
                        update("rules", [
                          ...entry.rules,
                          {
                            fact: "assistance",
                            operator: "equals",
                            value: "",
                            purpose: "surface",
                            explanation: "",
                          },
                        ])
                      }
                    >
                      Add rule
                    </button>
                  </fieldset>
                  {field(
                    "reviewNotes",
                    "Unresolved rules / volunteer review notes (one per line)",
                    true,
                  )}
                  {field(
                    "submissionInstructions",
                    "Submission and follow-up instructions",
                    true,
                  )}
                  {field(
                    "renewalDays",
                    "Days before benefit end to request renewal",
                  )}
                </>
              ) : null}
              {entry.kind === "question" ? (
                <>
                  {field("factKey", "Reusable fact key")}
                  <label>
                    Answer format
                    <select
                      className={inputClass}
                      value={entry.answerType}
                      onChange={(e) =>
                        update(
                          "answerType",
                          e.target.value as Entry["answerType"],
                        )
                      }
                    >
                      {["text", "number", "date", "choice", "yes_no"].map(
                        (t) => (
                          <option key={t}>{t}</option>
                        ),
                      )}
                    </select>
                  </label>
                  {field("options", "Answer choices (one per line)", true)}
                  {field("help", "How do I find this information?", true)}
                  <p className="text-sm">
                    New fact keys appear as missing information in the volunteer
                    plan. This release does not add new patient answer storage
                    or replace the existing intake.
                  </p>
                </>
              ) : null}
              {entry.kind === "document" ? (
                <>
                  {field(
                    "documentTypes",
                    "Accepted upload type IDs (one per line)",
                    true,
                  )}
                  {field("help", "How to find and upload this document", true)}
                  {field(
                    "whenFact",
                    "Show only when this fact is yes (optional)",
                  )}
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={entry.conditional}
                      onChange={(e) => update("conditional", e.target.checked)}
                    />
                    Volunteer must confirm whether this document applies
                  </label>
                </>
              ) : null}
              <fieldset className="grid gap-3 rounded border p-3">
                <legend>Source verification & quarterly review</legend>
                {field("reviewOwner", "Staff member responsible for review")}
                {field("reviewMonths", "Review interval in months (1–3)")}
                {field(
                  "reviewCadence",
                  "Additional checks needed before use",
                  true,
                )}
                <p>
                  Next review:{" "}
                  {nextReviewDate(entry) ?? "Verification needed now"}
                </p>
                {field("sourceUrl", "Official source URL (HTTPS)")}
                {field("verifiedOn", "Last recorded verification date")}
                <p className="text-sm">
                  Verifier: {entry.verifiedBy || "Not verified"}. Changing
                  verification records your signed-in identity when saved.
                </p>
                {field(
                  "verificationNotes",
                  "What you checked / remaining limitations",
                  true,
                )}
                <button
                  className="rounded border p-2 text-left text-pine"
                  onClick={() => {
                    setEntries((all) =>
                      all.map((e) =>
                        e.id === selected
                          ? {
                              ...e,
                              verifiedOn: todayInArizona(),
                              verifiedBy: "Your signed-in identity (on save)",
                            }
                          : e,
                      ),
                    );
                    setVerifiedIds((ids) => [...new Set([...ids, selected])]);
                  }}
                >
                  I checked this item against its official source today
                </button>
              </fieldset>
              <details>
                <summary className="cursor-pointer font-semibold">
                  Complete saved history for this item
                </summary>
                {state.revisions
                  .filter((r) => r.entries.some((e) => e.id === entry.id))
                  .map((r) => (
                    <div key={r.id} className="my-3 border-b pb-3">
                      <p className="text-sm">
                        {r.created_at} · {r.action} · {r.actor}
                      </p>
                      <p>{r.note}</p>
                      <details>
                        <summary>View saved values</summary>
                        <dl>
                          {Object.entries(
                            r.entries.find((e) => e.id === entry.id)!,
                          ).map(([k, v]) => (
                            <div key={k} className="my-1 break-words text-sm">
                              <dt className="font-semibold">{k}</dt>
                              <dd>
                                {typeof v === "object"
                                  ? JSON.stringify(v)
                                  : String(v)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    </div>
                  ))}
              </details>
            </div>
          )}
        </section>
      </div>
      <section className="grid gap-3 rounded-xl border bg-white p-5">
        <h2 className="text-xl font-semibold">Save & publish</h2>
        <label>
          Describe this change
          <textarea
            className={inputClass}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Example: Updated Mayo application link after checking the official website"
          />
        </label>
        <button type="button" className="min-h-11 rounded border p-3" disabled={busy} onClick={()=>{setEntries(prepareHonorHealthDraft(entries));setNote("Prepare HonorHealth route and deduplicated requirements for verification. No publication yet.");}}>Prepare HonorHealth draft for review</button>
        <div className="flex gap-3">
          <button
            disabled={busy || !note.trim()}
            className="rounded border px-4 py-2 disabled:opacity-50"
            onClick={() => void save("draft")}
          >
            Save draft
          </button>
          <button
            disabled={busy}
            className="rounded bg-pine px-4 py-2 text-white"
            onClick={() => setReview(true)}
          >
            Review publication
          </button>
        </div>
        {review ? (
          <div className="rounded border bg-paper p-4">
            <h3 className="font-semibold">Publication review</h3>
            <p>
              {entries.filter((e) => e.enabled).length} active items. This
              publishes the entire draft as one consistent release.
            </p>
            {errors.length ? (
              <ul className="my-3 list-disc pl-5 text-sm text-red-800">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            ) : (
              <p>
                Changed items have verification and references. Unchanged legacy
                content retains its review-needed status. Confirm the content
                and screening rules before publishing.
              </p>
            )}
            <button
              disabled={busy || !!errors.length || !note.trim()}
              className="mt-3 rounded bg-pine px-4 py-2 text-white disabled:opacity-50"
              onClick={() => void save("publish")}
            >
              Publish reviewed release
            </button>
          </div>
        ) : null}
      </section>
      <details className="rounded-xl border bg-white p-5">
        <summary className="cursor-pointer font-semibold">
          Release history & restore
        </summary>
        <p className="my-3 text-sm">
          Restore copies an old snapshot into the editor. Save it as a new draft
          and publish after review; history is never overwritten.
        </p>
        <select
          aria-label="Historical release"
          className={inputClass}
          value={history}
          onChange={(e) => setHistory(e.target.value)}
        >
          <option value="">Choose a saved revision</option>
          {state.revisions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.created_at} · {r.action} · {r.note}
            </option>
          ))}
        </select>
        {old ? (
          <div className="mt-3">
            <p>
              {old.actor} · {old.entries.length} items ·{" "}
              {old.id === state.published
                ? "Currently published"
                : "Historical snapshot"}
            </p>
            <button
              className="mt-2 underline"
              onClick={() => {
                setEntries(structuredClone(old.entries));
                setNote(`Restore snapshot ${old.id}: ${old.note}`);
                setReview(false);
                setMessage(
                  "Historical snapshot loaded into the unsaved draft. Published content is unchanged.",
                );
              }}
            >
              Copy this snapshot into draft
            </button>
          </div>
        ) : null}
      </details>
    </div>
  );
}
