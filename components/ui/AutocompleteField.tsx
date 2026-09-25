import { useId } from "react";

export function AutocompleteField({
  label,
  value,
  options,
  onChange,
  required,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const listId = useId();

  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-ink">
        {label}
        {required ? <span className="ml-1 text-coral">*</span> : null}
      </span>
      <input
        list={listId}
        aria-required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 w-full h-12 text-base rounded-md border border-slate-300 bg-white px-3 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20"
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  );
}
