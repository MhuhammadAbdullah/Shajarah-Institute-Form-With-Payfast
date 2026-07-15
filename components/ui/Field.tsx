import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  optional,
  helpText,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  optional?: boolean;
  helpText?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
        {optional && <span className="ml-1 text-slate-400 font-normal">(optional)</span>}
      </label>
      {children}
      {helpText && !error && (
        <p id={`${htmlFor}-help`} className="text-xs text-slate-500">
          {helpText}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
