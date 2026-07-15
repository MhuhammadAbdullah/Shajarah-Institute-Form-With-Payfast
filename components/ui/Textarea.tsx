import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, hasError, id, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      id={id}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError && id ? `${id}-error` : undefined}
      className={cn(
        "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors",
        "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500",
        hasError ? "border-red-400" : "border-slate-300",
        className,
      )}
      {...props}
    />
  );
});
