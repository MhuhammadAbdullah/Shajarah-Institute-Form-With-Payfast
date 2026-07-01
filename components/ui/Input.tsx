import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, hasError, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors",
        "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500",
        hasError ? "border-red-400" : "border-slate-300",
        props.disabled && "bg-slate-50 text-slate-400 cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
});
