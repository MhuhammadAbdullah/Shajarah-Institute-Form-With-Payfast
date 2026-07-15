import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  hasError?: boolean;
  placeholder?: string;
  /** "sm" for compact inline forms (e.g. inline tier editors) - swaps padding/text size instead of letting a caller's className fight the base padding. */
  uiSize?: "md" | "sm";
}

const sizeClasses: Record<NonNullable<SelectProps["uiSize"]>, string> = {
  md: "px-3.5 py-2.5 text-sm",
  sm: "px-2.5 py-1.5 text-xs",
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, hasError, placeholder, uiSize = "md", children, id, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      id={id}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError && id ? `${id}-error` : undefined}
      className={cn(
        "w-full rounded-lg border bg-white text-slate-900 shadow-sm transition-colors",
        sizeClasses[uiSize],
        "focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500",
        hasError ? "border-red-400" : "border-slate-300",
        className,
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
});
