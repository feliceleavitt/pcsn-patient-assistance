import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type BaseProps = {
  label: string;
  error?: string;
};

export function TextField({
  label,
  error,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-ink">{label}</span>
      <input
        {...props}
        className="h-11 rounded-md border border-slate-300 bg-white px-3 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20"
      />
      {error ? <span className="text-xs text-coral">{error}</span> : null}
    </label>
  );
}

export function TextAreaField({
  label,
  error,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-ink">{label}</span>
      <textarea
        {...props}
        className="min-h-28 rounded-md border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20"
      />
      {error ? <span className="text-xs text-coral">{error}</span> : null}
    </label>
  );
}
