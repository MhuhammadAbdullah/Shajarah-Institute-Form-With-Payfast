import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  hasError?: boolean;
  /** "sm" for compact inline forms (e.g. inline tier editors) - swaps padding/text size instead of letting a caller's className fight the base padding. */
  uiSize?: "md" | "sm";
}

const sizeClasses: Record<NonNullable<InputProps["uiSize"]>, string> = {
  md: "px-3.5 py-2.5 text-sm",
  sm: "px-2.5 py-1.5 text-xs",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, hasError, uiSize = "md", id, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      id={id}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError && id ? `${id}-error` : undefined}
      className={cn(
        "w-full rounded-lg border text-slate-900 shadow-sm transition-colors",
        sizeClasses[uiSize],
        "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500",
        hasError ? "border-red-400" : "border-slate-300",
        props.disabled && "bg-slate-50 text-slate-400 cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
});
