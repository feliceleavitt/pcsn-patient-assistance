"use client";

import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";

export type CaseWorkspaceSection = { id: string; label: string };

export function VolunteerCaseWorkspace({
  patientName,
  status,
  sections, children,
}: {
  patientName: string;
  status: string;
  sections: CaseWorkspaceSection[];
  children: ReactNode;
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "overview");
  const panelRef = useRef<HTMLDivElement>(null);
  const hasSelectedPanel = useRef(false);
  useEffect(() => {
    if (hasSelectedPanel.current) panelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    hasSelectedPanel.current = true;
  }, [activeId]);
  const activePanel = Children.toArray(children).find((child) =>
    isValidElement<{ "data-case-section"?: string }>(child) && child.props["data-case-section"] === activeId,
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)] lg:items-start">
      <aside className="rounded-md border border-pine/20 bg-white p-3 shadow-soft lg:sticky lg:top-5">
        <p className="px-2 pb-3 text-xs font-semibold uppercase tracking-wide text-pine">Case workspace</p>
        <p className="px-2 text-sm font-semibold">{patientName}</p>
        <p className="px-2 pb-3 text-xs text-slate-600">Overall status: {status.replaceAll("_", " ")}</p>
        <nav aria-label="Case sections" role="tablist" className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible">
          {sections.map((section) => {
            const selected = section.id === activeId;
            return (
              <button
                key={section.id}
                id={`case-tab-${section.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`case-panel-${section.id}`}
                onClick={() => setActiveId(section.id)}
                className={`shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium transition ${selected ? "bg-pine text-white" : "text-slate-700 hover:bg-paper"}`}
              >
                {section.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <div ref={panelRef} id={`case-panel-${activeId}`} role="tabpanel" aria-labelledby={`case-tab-${activeId}`} tabIndex={-1} className="min-w-0">
        {activePanel}
      </div>
    </div>
  );
}
