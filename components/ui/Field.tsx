"use client";

import { useId } from "react";
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
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const description = [props["aria-describedby"], error ? `${id}-error` : null, help ? `${id}-help` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="grid gap-2 text-sm">
      <label htmlFor={id} className="grid gap-2 text-sm">
        <span className="font-medium text-ink">
          {label}
          {required ? <span className="ml-1 text-coral">*</span> : null}
        </span>
        <input
          {...props}
          id={id}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={description}
          className="min-w-0 w-full h-12 text-base rounded-md border border-slate-300 bg-white px-3 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20"
        />
        {error ? <span id={`${id}-error`} className="text-sm text-red-800">{error}</span> : null}
      </label>
      {help ? (
        <details>
          <summary className="cursor-pointer text-pine underline">
            How do I find this information?
          </summary>
          <p id={`${id}-help`} className="mt-2 whitespace-pre-line text-sm text-slate-600">
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
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const description = [props["aria-describedby"], error ? `${id}-error` : null, help ? `${id}-help` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="grid gap-2 text-sm">
      <label htmlFor={id} className="grid gap-2 text-sm">
        <span className="font-medium text-ink">
          {label}
          {required ? <span className="ml-1 text-coral">*</span> : null}
        </span>
        <textarea
          {...props}
          id={id}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={description}
          className="min-w-0 w-full min-h-28 text-base rounded-md border border-slate-300 bg-white px-3 py-3 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20"
        />
        {error ? <span id={`${id}-error`} className="text-sm text-red-800">{error}</span> : null}
      </label>
      {help ? (
        <details>
          <summary className="cursor-pointer text-pine underline">
            How do I find this information?
          </summary>
          <p id={`${id}-help`} className="mt-2 whitespace-pre-line text-sm text-slate-600">
            {help}
          </p>
        </details>
      ) : null}
    </div>
  );
}
