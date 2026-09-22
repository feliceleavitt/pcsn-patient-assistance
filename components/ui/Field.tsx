import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type BaseProps = {
  label: string;
  error?: string;
  help?: string;
  required?: boolean;
};

export function TextField({
  label,
  error,
  help,
  required,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="grid gap-2 text-sm">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-ink">
          {label}
          {required ? <span className="ml-1 text-coral">*</span> : null}
        </span>
        <input
          {...props}
          className="h-11 rounded-md border border-slate-300 bg-white px-3 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20"
        />
        {error ? <span className="text-xs text-coral">{error}</span> : null}
      </label>
      {help ? (
        <details>
          <summary className="cursor-pointer text-pine underline">
            How do I find this information?
          </summary>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
            {help}
          </p>
        </details>
      ) : null}
    </div>
  );
}

export function TextAreaField({
  label,
  error,
  help,
  required,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="grid gap-2 text-sm">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-ink">
          {label}
          {required ? <span className="ml-1 text-coral">*</span> : null}
        </span>
        <textarea
          {...props}
          className="min-h-28 rounded-md border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20"
        />
        {error ? <span className="text-xs text-coral">{error}</span> : null}
      </label>
      {help ? (
        <details>
          <summary className="cursor-pointer text-pine underline">
            How do I find this information?
          </summary>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
            {help}
          </p>
        </details>
      ) : null}
    </div>
  );
}
