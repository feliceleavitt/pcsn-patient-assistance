import { useMemo } from "react";

export function AutocompleteField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const listId = useMemo(
    () => `list-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    [label],
  );

  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-ink">{label}</span>
      <input
        list={listId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-md border border-slate-300 bg-white px-3 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20"
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  );
}
